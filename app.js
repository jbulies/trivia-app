require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const app = express();
const pool = require('./config/db_config'); // Importar el pool promisificado
const MySQLSessionStore = require('./config/mysqlSessionStore');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const fs = require('fs');

const port = process.env.PORT || 3000;

// Middleware
app.use('/tinymce', express.static(__dirname + '/node_modules/tinymce'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('assets'));
app.set('view engine', 'ejs');

// Multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/img');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

// Nueva instancia de multer para parsear formularios sin archivos en /users
const uploadUsers = multer();

// Configurar el almacenamiento de sesiones en MySQL
const sessionStore = new MySQLSessionStore({
    clearExpired: true,  // Limpia sesiones expiradas automáticamente
    checkExpirationInterval: 900000, // Verifica cada 15 min
    expiration: 86400000, // Expiración de sesiones: 1 día
}, pool);

// Configurar express-session para usar MySQLSessionStore
app.use(session({
    key: 'trivia_app', // Nombre de la cookie de sesión
    secret: process.env.SESSION_SECRET || 'secret_key', // Cambia esto por un secreto seguro
    store: sessionStore.store, // Usa el almacenamiento en MySQL
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 día de duración
        httpOnly: true, // Mayor seguridad
        secure: process.env.SESSION_SECURE === 'true' // Cambiar a `true` si usas HTTPS
    }
}));

// Middleware para verificar autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    }
};

// Rutas

// Obtener todas las preguntas
app.get('/', isAuthenticated, async (req, res) => {
    const userId = req.session.user_id;
    try {
        const [usersData] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const [results] = await pool.query('SELECT * FROM questions ORDER BY number', [userId]);

        const user = usersData[0];

        res.render('index', { isAdmin: user.is_admin === 1, questions: results, baseUrl: process.env.URL });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Obtener preguntas en formato JSON
app.get('/questions', isAuthenticated, async (req, res) => {
    const userId = req.session.user_id;
    try {
        const [results] = await pool.query('SELECT * FROM questions WHERE user_id = ? ORDER BY number', [userId]);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Obtener una pregunta por Number
app.get('/question/:number', isAuthenticated, async (req, res) => {
    const userId = req.session.user_id;
    const number = req.params.number;

    try {
        const [rows] = await pool.query(`
            SELECT id, question, answer, image, number, group_id
            FROM questions
            WHERE user_id = ? AND number = ?
            LIMIT 1
        `, [userId, number]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener la pregunta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Página de inicio de sesión administrador
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        return res.redirect('/'); // Evita que usuarios autenticados vean el login
    }
    const error = req.query.error; // Capturamos el query param error si viene
    res.render('login', { error }); // Se lo pasamos como variable a la vista
});

// Inicio de sesión administrador
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Consulta SQL con sensibilidad a mayúsculas y minúsculas
        const [user] = await pool.query('SELECT * FROM users WHERE BINARY username = ?', [username]);

        // Verificar si el usuario existe
        if (user.length === 0) {
            return res.redirect('/login?error=true');
        }

        // Comparar la contraseña ingresada con el hash en la base de datos
        const isPasswordValid = await bcrypt.compare(password, user[0].password); // Verificar el hash de la contraseña

        if (isPasswordValid) {
            // Regenerar la sesión para evitar conflictos con sesiones antiguas
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Error al regenerar sesión:', err);
                    return res.redirect('/login?error=true');
                }
                // Si la contraseña es válida, iniciar sesión
                req.session.authenticated = true;
                req.session.username = username; // Guardar el nombre de usuario en la sesión
                req.session.user_id = user[0].id; // Guardar el ID del usuario en la sesión
                return res.redirect('/');
            });
        } else {
            // Si la contraseña no es válida, redirigir al login
            return res.redirect('/login?error=true');
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Cierre de sesión administrador
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Panel de administrador
app.get('/dashboard', isAuthenticated, async (req, res) => {
    const userId = req.session.user_id;
    try {
        const [usersData] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const [results] = await pool.query('SELECT * FROM questions WHERE user_id = ? ORDER BY number', [userId]);
        
        const user = usersData[0];
        
        res.render('dashboard', {
            isAdmin: user.is_admin === 1, // Para mostrar el botón de admin
            questions: results             // Para mostrar las preguntas del usuario
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Agregar nueva pregunta
app.post('/dashboard', upload.single('image'), async (req, res) => {
    const { question, answer, group_id } = req.body;
    const image = req.file ? req.file.filename : null;
    const user_id = req.session.user_id;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'No has iniciado sesión.' });
    }

    if (![1, 2, 3].includes(Number(group_id))) {
        return res.status(400).json({ success: false, message: 'El grupo debe ser 1, 2 o 3.' });
    }

    let minNumber, maxNumber;
    switch (group_id) {
        case '1':
            minNumber = 1;
            maxNumber = 12;
            break;
        case '2':
            minNumber = 13;
            maxNumber = 24;
            break;
        case '3':
            minNumber = 25;
            maxNumber = 36;
            break;
    }

    try {
        // Buscar el número máximo en el rango actual del grupo
        const [[{ last_number }]] = await pool.query(`
            SELECT MAX(number) AS last_number 
            FROM questions 
            WHERE group_id = ? AND number BETWEEN ? AND ?
        `, [group_id, minNumber, maxNumber]);
    
        // Verificar si ya existe un número máximo o si no existe ninguna pregunta
        const lastNumber = last_number || (minNumber - 1);
    
        // Buscar el primer número faltante en el rango de números
        let newNumber = null;
        for (let i = minNumber; i <= maxNumber; i++) {
            const [[existing]] = await pool.query(`
                SELECT 1 FROM questions WHERE group_id = ? AND number = ?`, [group_id, i]);
    
            // Si no existe una pregunta con ese número, lo tomamos como el nuevo número
            if (!existing) {
                newNumber = i;
                break;
            }
        }
    
        // Si no encontramos ningún hueco, entonces usamos el último número disponible + 1
        if (newNumber === null) {
            newNumber = lastNumber + 1;
        }
    
        // Si el número nuevo excede el máximo permitido, no se pueden agregar más preguntas
        if (newNumber > maxNumber) {
            return res.status(400).json({
                success: false,
                message: `No se pueden agregar más preguntas al grupo ${group_id}.`
            });
        }

        await pool.query('INSERT INTO questions (number, question, image, answer, group_id, user_id) VALUES (?, ?, ?, ?, ?, ?)', [
            newNumber, question, image, answer, group_id, user_id
        ]);

        return res.json({ success: true, message: 'Pregunta agregada con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Reordenar preguntas de un usuario específico
app.post('/reorder-questions', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user_id; // Aquí va el ID del usuario autenticado

        const [questions] = await pool.query(`
            SELECT id, group_id
            FROM questions
            WHERE user_id = ?
            ORDER BY group_id, id
        `, [userId]);

        if (!questions.length) {
            return res.json({ success: false, message: 'No hay preguntas para reordenar.' });
        }

        const groupedQuestions = {};
        questions.forEach(q => {
            if (!groupedQuestions[q.group_id]) {
                groupedQuestions[q.group_id] = [];
            }
            groupedQuestions[q.group_id].push(q);
        });

        const updatesTemp = [];
        const updatesFinal = [];

        Object.entries(groupedQuestions).forEach(([groupId, groupQuestions]) => {
            const shuffled = shuffleArray(groupQuestions);

            let start = 0;
            if (groupId == 1) start = 1;
            if (groupId == 2) start = 13;
            if (groupId == 3) start = 25;

            shuffled.forEach((question, index) => {
                const newNumber = start + index;
                const tempNumber = -1 * (newNumber); // Temporales
                updatesTemp.push([tempNumber, question.id]);
                updatesFinal.push([newNumber, question.id]);
            });
        });

        // PASO 1: Números temporales
        for (const [tempNumber, questionId] of updatesTemp) {
            await pool.query(`
                UPDATE questions
                SET number = ?
                WHERE id = ?
            `, [tempNumber, questionId]);
        }

        // PASO 2: Números finales
        for (const [finalNumber, questionId] of updatesFinal) {
            await pool.query(`
                UPDATE questions
                SET number = ?
                WHERE id = ?
            `, [finalNumber, questionId]);
        }

        res.json({ success: true, message: 'Preguntas reordenadas correctamente.' });

    } catch (err) {
        console.error('Error al reordenar preguntas:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Actualizar pregunta existente
app.put('/dashboard/:id', upload.single('editImage'), async (req, res) => {
    const id = req.params.id;
    const { editQuestion, editAnswer, editGroupId } = req.body;
    const newImage = req.file ? req.file.filename : null;

    try {
        // 1. Buscar la pregunta actual en la base de datos
        const [[question]] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);

        if (!question) {
            return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
        }

        // Nombre del archivo de la imagen anterior
        const oldImage = question.image;
        const imageToUpdate = newImage ? newImage : oldImage;

        // 3. Actualizar la pregunta (se hace antes de eliminar para tener la info de la imagen anterior)
        await pool.query(
            'UPDATE questions SET question = ?, image = ?, answer = ?, group_id = ? WHERE id = ?',
            [editQuestion, imageToUpdate, editAnswer, editGroupId, id]
        );

        // 4. Eliminar la imagen anterior si se subió una nueva y la anterior existía y es diferente
        if (newImage && oldImage && newImage !== oldImage) {
            const imagePath = path.join(__dirname, 'assets/img', oldImage); // Ajusta la ruta según tu estructura de carpetas
            fs.unlink(imagePath, (err) => { // Usa la versión con callback de fs.unlink
                if (err) {
                    console.error(`Error al eliminar la imagen anterior ${oldImage}:`, err);
                    // Considera si quieres enviar una respuesta de error o solo registrarlo
                }
            });
        }

        return res.json({ success: true, message: 'Pregunta actualizada con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Eliminar imagen de la pregunta
app.delete('/dashboard/:id/deleteImage', async (req, res) => {
    const id = req.params.id;

    try {
        const [[question]] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
        }

        // Si tiene imagen, eliminar el archivo físico
        if (question.image) {
            const imagePath = path.join(__dirname, 'assets/img', question.image);

            // Verifica si el archivo existe antes de intentar eliminarlo
            fs.access(imagePath, fs.constants.F_OK, (err) => {
                if (!err) {
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('Error eliminando la imagen:', err);
                            return res.status(500).json({ success: false, message: 'Error al eliminar la imagen.' });
                        }
                    });
                } else {
                    console.warn('La imagen no existe en el disco:', question.image);
                }
            });

            // Eliminar la imagen en la base de datos (la dejamos como NULL)
            await pool.query('UPDATE questions SET image = NULL WHERE id = ?', [id]);

            return res.json({ success: true, message: 'Imagen eliminada correctamente.' });
        }

        return res.status(400).json({ success: false, message: 'La pregunta no tiene imagen.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Eliminar pregunta
app.delete('/dashboard/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const [[question]] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
        }

        // 2. Si tiene imagen, eliminar el archivo físico
        if (question.image) {
            const imagePath = path.join(__dirname, 'assets/img', question.image);

            // Verifica si el archivo existe antes de intentar eliminarlo
            fs.access(imagePath, fs.constants.F_OK, (err) => {
                if (!err) {
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('Error eliminando la imagen:', err);
                        }
                    });
                } else {
                    console.warn('La imagen no existe en el disco:', question.image);
                }
            });
        }

        // 3. Eliminar la pregunta de la base de datos
        await pool.query('DELETE FROM questions WHERE id = ?', [id]);

        return res.json({ success: true, message: 'Pregunta e imagen eliminadas con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Panel de administrador
app.get('/users', isAuthenticated, async (req, res) => {
    try {
        const [usersData] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.user_id]);

        if (usersData.length === 0 || usersData[0].is_admin !== 1) {
            return res.redirect('/'); // Redirigir si el usuario no existe o no es administrador
        }
        const [results] = await pool.query('SELECT * FROM users ORDER BY id');
        res.render('users', { users: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Agregar nuevo usuario
app.post('/users', uploadUsers.none(), async (req, res) => {
    const { first_name, last_name, username } = req.body;
    let { password } = req.body;
    const isAdmin = req.body.isAdmin === '1' ? 1 : 0;

    try {
        // Verificar si el nombre de usuario ya existe
        const [existingUser] = await pool.query('SELECT * FROM users WHERE BINARY username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso.' });
        }

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar el nuevo usuario
        await pool.query('INSERT INTO users (first_name, last_name, username, password, is_admin ) VALUES (?, ?, ?, ?, ? )', [
            first_name, last_name, username, hashedPassword, isAdmin
        ]);

        return res.json({ success: true, message: 'Usuario agregado con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Actualizar usuario existente
app.put('/users/:id', async (req, res) => {
    const id = req.params.id;
    const { editFirstName, editLastName, editUser } = req.body;
    let { editPassword } = req.body;
    const editIsAdmin = Number(req.body.editIsAdmin) === 1 ? 1 : 0;

    try {
        // 1. Buscar el usuario actual en la base de datos
        const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // 2. Verificar si el nombre de usuario editado ya existe para otro usuario
        const [existingUser] = await pool.query('SELECT * FROM users WHERE BINARY username = ? AND id != ?', [editUser, id]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso por otro usuario.' });
        }

        let hashedPassword = user.password; // Mantener la contraseña existente por defecto

        // Hashear la nueva contraseña si se proporciona
        if (editPassword) {
            const salt = await bcrypt.genSalt(saltRounds);
            hashedPassword = await bcrypt.hash(editPassword, salt);
        }

        // 3. Actualizar el usuario
        await pool.query(
            'UPDATE users SET first_name = ?, last_name = ?, username = ?, password = ?, is_admin = ? WHERE id = ?',
            [editFirstName, editLastName, editUser, hashedPassword, editIsAdmin, id]
        );

        return res.json({ success: true, message: 'Usuario actualizado con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Eliminar usuario
app.delete('/users/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // 2. Si tiene preguntas relacionadas en la tabla questions, eliminar las preguntas
        await pool.query('DELETE FROM questions WHERE user_id = ?', [id]);


        // 3. Eliminar el usuario de la base de datos
        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        return res.json({ success: true, message: 'Usuario y preguntas relacionadas eliminados con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Iniciar Servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});