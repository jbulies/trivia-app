const mysql = require('mysql2');

// Configuración del pool de conexiones
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trivia_app',
  waitForConnections: true, // Esperar si no hay conexiones disponibles
  connectionLimit: 10,      // Límite de conexiones en el pool
  queueLimit: 0             // No limitar la cola de solicitudes
};

// Crear el pool de conexiones promisificado
const pool = mysql.createPool(dbConfig).promise();

// Probar la conexión al iniciar la aplicación
pool.query('SELECT 1')
  .then(() => {
    console.log('Conexión exitosa al pool de bases de datos.');
  })
  .catch((err) => {
    console.error('Error al conectar al pool de bases de datos:', err);
  });

// Exportar el pool promisificado
module.exports = pool;