-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS trivia_app;

-- Usar la base de datos recién creada
USE trivia_app;

-- Crear la tabla questions si no existe
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number INT NOT NULL,
    question TEXT NOT NULL,
    image VARCHAR(255),
    answer TEXT NOT NULL,
    group_id INT NOT NULL,
    UNIQUE (number, group_id) -- Evitar duplicados de número por grupo
);

-- Crear la tabla sessions si no existe
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL PRIMARY KEY,
    expires INT(11) UNSIGNED NOT NULL,
    data TEXT NOT NULL
);

-- Crear índices adicionales para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_group_id ON questions (group_id);
CREATE INDEX IF NOT EXISTS idx_number ON questions (number);