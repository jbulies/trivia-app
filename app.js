require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const app = express();
const pool = require('./config/db_config'); // Importar el pool promisificado
const MySQLSessionStore = require('./config/mysqlSessionStore');
const fs = require('fs');

const port = process.env.PORT || 3000;

// Crear una instancia de MySQLSessionStore
const sessionStore = new MySQLSessionStore({}, pool);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
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
      secure: false // Cambiar a `true` si usas HTTPS
    }
  }));

// Middleware para verificar autenticación
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.redirect('/login');
  }
};

// Rutas

// Obtener todas las preguntas
app.get('/', isAuthenticated, async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM questions ORDER BY id');
        res.render('index', { questions: results, baseUrl: process.env.URL });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Obtener preguntas en formato JSON
app.get('/questions', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM questions ORDER BY id');
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Obtener una pregunta por ID
app.get('/question/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [results] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Página de inicio de sesión administrador
app.get('/login', (req, res) => {
    res.render('login');
});

// Inicio de sesión administrador
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.authenticated = true;
        return res.redirect('/');
    } else {
        return res.redirect('/login');
    }
});

// Cierre de sesión administrador
app.post('/logout', (req, res) => {
    req.session.authenticated = false;
    res.status(200).send();
});

// Panel de administrador
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM questions ORDER BY number');
        res.render('dashboard', { questions: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Agregar nueva pregunta
app.post('/dashboard', upload.single('image'), async (req, res) => {
    const { question, answer, group_id } = req.body;
    const image = req.file ? req.file.filename : null;

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
        const [[{ last_number }]] = await pool.query(`
            SELECT MAX(number) AS last_number 
            FROM questions 
            WHERE group_id = ? AND number BETWEEN ? AND ?
        `, [group_id, minNumber, maxNumber]);

        const lastNumber = last_number || (minNumber - 1);
        const newNumber = lastNumber + 1;

        if (newNumber > maxNumber) {
            return res.status(400).json({ success: false, message: `No se pueden agregar más preguntas al grupo ${group_id}.` });
        }

        await pool.query('INSERT INTO questions (number, question, image, answer, group_id) VALUES (?, ?, ?, ?, ?)', [
            newNumber, question, image, answer, group_id
        ]);

        console.log('Pregunta agregada con éxito.');
        return res.json({ success: true, message: 'Pregunta agregada con éxito.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Reordenar preguntas
app.post('/reorder-questions', isAuthenticated, async (req, res) => {
    try {
        const [results] = await pool.query('SELECT id, number, group_id, question, answer, image FROM questions ORDER BY group_id, id');

        const groupedQuestions = {};
        results.forEach(question => {
            if (!groupedQuestions[question.group_id]) {
                groupedQuestions[question.group_id] = [];
            }
            groupedQuestions[question.group_id].push(question);
        });

        Object.keys(groupedQuestions).forEach(groupId => {
            groupedQuestions[groupId] = shuffleArray(groupedQuestions[groupId]);
        });

        const newQuestions = [];
        let newNumber = 1;
        Object.keys(groupedQuestions).forEach(groupId => {
            groupedQuestions[groupId].forEach(question => {
                newQuestions.push({
                    id: newNumber,
                    number: newNumber,
                    group_id: question.group_id,
                    question: question.question,
                    answer: question.answer,
                    image: question.image
                });
                newNumber++;
            });
        });

        await pool.query('DELETE FROM questions');

        const insertValues = newQuestions.map(q => [
            q.id, q.number, q.group_id, q.question, q.answer, q.image
        ]);

        await pool.query('INSERT INTO questions (id, number, group_id, question, answer, image) VALUES ?', [insertValues]);

        res.json({ success: true, message: 'Preguntas reordenadas correctamente.' });
    } catch (err) {
        console.error('Error al reordenar preguntas:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Función para mezclar un array aleatoriamente
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

        // 2. Si no se subió una nueva imagen, mantener la que ya existía
        const imageToUpdate = newImage ? newImage : question.image;

        // 3. Actualizar la pregunta
        await pool.query(
            'UPDATE questions SET question = ?, image = ?, answer = ?, group_id = ? WHERE id = ?',
            [editQuestion, imageToUpdate, editAnswer, editGroupId, id]
        );

        return res.json({ success: true, message: 'Pregunta actualizada con éxito.' });
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
                        } else {
                            console.log('Imagen eliminada:', question.image);
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

// Iniciar Servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});