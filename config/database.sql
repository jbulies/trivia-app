-- Crear la base de datos si no existe 
CREATE DATABASE IF NOT EXISTS trivia_app;

-- Usar la base de datos recién creada
USE trivia_app;

-- Crear la tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE -- Columna para rol de administrador
);

-- Crear la tabla questions si no existe
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number INT NOT NULL,
    question TEXT NOT NULL,
    image VARCHAR(255),
    answer TEXT NOT NULL,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    UNIQUE (number, group_id),  -- Evitar duplicados de número por grupo
    FOREIGN KEY (user_id) REFERENCES users(id) -- Relación con la tabla users
);

-- Crear la tabla sessions si no existe
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL PRIMARY KEY,
    expires INT(11) UNSIGNED NOT NULL,
    data TEXT NOT NULL
);

-- Crear índices adicionales para mejorar el rendimiento
CREATE INDEX idx_group_id ON questions (group_id);
CREATE INDEX idx_number ON questions (number);

-- Insertar un usuario por defecto (admin)
-- Es necesario usar la función de hash adecuada según el SGBD que estés utilizando (ej. SHA2 para MySQL)

-- Contraseña en hash para admin123 con saltRounds = 10
INSERT INTO users (username, password, first_name, last_name, is_admin)
VALUES ('admin', '$2b$10$4MehnNZjE/MjH7Oz6jMOx.ERfJ0pTZcSr3fNHklGA6jaYyB.Bw.ri', 'System', 'Administrator', TRUE);