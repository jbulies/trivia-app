require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const app = express();
const db = require('./config/db_config');
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('assets'));
app.set('view engine', 'ejs');

// Multer para subir archivos
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'assets/img');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configuración de sesión
app.use(session({
    secret: process.env.SKEY || 'secret_key', // Cambia esto por una cadena secreta segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Cambia a true si estás usando HTTPS
}));

// Middleware para verificar autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.redirect('/admin');
    }
};

// Rutas
app.get('/', (req, res) => {
    db.query('SELECT * FROM questions ORDER BY id', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        res.render('index', { questions: results });
    });
});

app.get('/questions', (req, res) => {
    db.query('SELECT * FROM questions ORDER BY id', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        res.json(results);
    });
});

app.get('/question/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM questions WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
        res.json(results[0]);
    });
});

app.get('/admin', (req, res) => {
    res.render('admin/login');
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        // Establecer el estado de autenticación en la sesión
        req.session.authenticated = true;
        return res.redirect('/admin/admin-panel');
    } else {
        return res.redirect('/admin');
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.authenticated = false;
    res.status(200).send();
});

app.get('/admin/admin-panel', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM questions ORDER BY number', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        res.render('admin/admin-panel', { questions: results });
    });
});

// Agregar nueva pregunta
app.post('/admin/admin-panel', upload.single('image'), (req, res) => {
    const { question, answer, group_id } = req.body;
    const image = req.file ? req.file.filename : null;

    // Validar que group_id sea válido
    if (![1, 2, 3].includes(Number(group_id))) {
        return res.status(400).json({ success: false, message: 'El grupo debe ser 1, 2 o 3.' });
    }

    // Definir rangos de números según el grupo
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

    // Consultar el último número en el grupo especificado
    const getLastNumberQuery = `
        SELECT MAX(number) AS last_number 
        FROM questions 
        WHERE group_id = ? AND number BETWEEN ? AND ?
    `;
    db.query(getLastNumberQuery, [group_id, minNumber, maxNumber], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });

        // Obtener el último número o usar el mínimo si no hay registros
        const lastNumber = results[0].last_number || (minNumber - 1);

        // Calcular el nuevo número
        const newNumber = lastNumber + 1;

        // Verificar si el nuevo número está dentro del rango permitido
        if (newNumber > maxNumber) {
            return res.status(400).json({ success: false, message: `No se pueden agregar más preguntas al grupo ${group_id}.` });
        }

        // Insertar la nueva pregunta con el número calculado
        const insertQuery = "INSERT INTO questions (number, question, image, answer, group_id) VALUES (?, ?, ?, ?, ?)";
        db.query(insertQuery, [newNumber, question, image, answer, group_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            console.log('Pregunta agregada con éxito.');
            return res.json({ success: true, message: 'Pregunta agregada con éxito.' });
        });
    });
});

app.post('/admin/reorder-questions', isAuthenticated, (req, res) => {
    // Obtener todas las preguntas de la base de datos
    const getQuestionsQuery = 'SELECT id, number, group_id, question, answer, image FROM questions ORDER BY group_id, id';
    db.query(getQuestionsQuery, (err, results) => {
        if (err) {
            console.error('Error al obtener las preguntas:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }

        // Agrupar preguntas por group_id
        const groupedQuestions = {};
        results.forEach(question => {
            if (!groupedQuestions[question.group_id]) {
                groupedQuestions[question.group_id] = [];
            }
            groupedQuestions[question.group_id].push(question);
        });

        // Aleatorizar preguntas dentro de cada grupo
        Object.keys(groupedQuestions).forEach(groupId => {
            groupedQuestions[groupId] = shuffleArray(groupedQuestions[groupId]); // Aleatorizar
        });

        // Crear un nuevo array con las preguntas aleatorizadas y nuevos números
        const newQuestions = [];
        let newNumber = 1; // Empezar desde 1

        Object.keys(groupedQuestions).forEach(groupId => {
            groupedQuestions[groupId].forEach(question => {
                newQuestions.push({
                    id: newNumber, // Nuevo id (ordenado)
                    number: newNumber, // Nuevo number (ordenado)
                    group_id: question.group_id, // Mantener el mismo grupo
                    question: question.question,
                    answer: question.answer,
                    image: question.image
                });
                newNumber++; // Incrementar el número
            });
        });

        // Paso 1: Borrar todas las preguntas existentes
        const deleteQuery = 'DELETE FROM questions';
        db.query(deleteQuery, (err, result) => {
            if (err) {
                console.error('Error al borrar las preguntas:', err);
                return res.status(500).json({ success: false, message: 'Error al borrar las preguntas.' });
            }

            // Paso 2: Insertar las preguntas aleatorizadas con nuevos números
            const insertQuery = 'INSERT INTO questions (id, number, group_id, question, answer, image) VALUES ?';
            const insertValues = newQuestions.map(q => [
                q.id,
                q.number,
                q.group_id,
                q.question,
                q.answer,
                q.image
            ]);

            db.query(insertQuery, [insertValues], (err, result) => {
                if (err) {
                    console.error('Error al insertar las preguntas:', err);
                    return res.status(500).json({ success: false, message: 'Error al insertar las preguntas.' });
                }

                res.json({ success: true, message: 'Preguntas reordenadas correctamente.' });
            });
        });
    });
});

// Función para mezclar un array aleatoriamente (algoritmo de Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Actualizar pregunta existente
app.put('/admin/admin-panel/:id', upload.single('editImage'), (req, res) => {
    const id = req.params.id;
    const { editQuestion, editAnswer, editGroupId } = req.body;
    const image = req.file ? req.file.filename : null;

    db.query('SELECT * FROM questions WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });

        db.query('UPDATE questions SET question = ?, image = ?, answer = ?, group_id = ? WHERE id = ?', 
                 [editQuestion, image, editAnswer, editGroupId, id], 
                 (err, result) => {
                     if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
                     return res.json({ success: true, message: 'Pregunta actualizada con éxito.' });
                 });
    });
});

// Eliminar pregunta
app.delete('/admin/admin-panel/:id', (req, res) => {
    const id = req.params.id;

    db.query('SELECT * FROM questions WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });

        db.query('DELETE FROM questions WHERE id = ?', [id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            return res.json({ success: true, message: 'Pregunta eliminada con éxito.' });
        });
    });
});

// Iniciar Servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});