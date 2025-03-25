# trivia-app
 # Aplicación Web Interactiva de Trivia

## Descripción
Esta es una aplicación web interactiva de trivia diseñada para su uso en el aula. Permite a los profesores dividir a los estudiantes en tres equipos y realizar una sesión de preguntas de forma oral. La aplicación admite autenticación de usuarios, seguimiento de puntuaciones, gestión de preguntas y un sistema de juego basado en rondas.

## Características
- **Desarrollada con Node.js y Express**.
- **Autenticación de Usuarios**: Sistema de inicio de sesión seguro con dos roles: Administrador y Usuario normal.
- **Página Principal del Juego**:
  - Muestra 36 preguntas divididas en tres grupos:
    - **Amarillo (Equipo 1)**: Primeras 12 preguntas
    - **Rojo (Equipo 2)**: Siguientes 12 preguntas
    - **Azul (Equipo 3)**: Últimas 12 preguntas
  - Al seleccionar una pregunta, se abre y comienza una cuenta regresiva de 1 minuto con las siguientes opciones:
    - **Ver Respuesta**: Muestra la respuesta correcta
    - **Volver**: Regresa a la página principal
    - **Respuesta Correcta**: Marca la pregunta como respondida correctamente
    - **Respuesta Incorrecta**: Marca la pregunta como respondida incorrectamente
  - Las preguntas respondidas se colorean en verde en la página principal.
- **Sistema de Marcador**:
  - Registra el desempeño de cada equipo en una tabla estructurada por rondas.
  - Una ronda solo se cierra cuando todos los equipos han respondido la misma cantidad de preguntas.
  - Garantiza que el juego sea equitativo para todos los equipos.
- **Gestión de Preguntas**:
  - Los usuarios pueden **agregar, editar, eliminar y reordenar** preguntas.
  - Las preguntas pueden incluir imágenes.
  - Cada pregunta pertenece a un grupo específico (Amarillo, Rojo, Azul) y nunca cambia de grupo.
  - Un botón de **reordenar** mezcla las preguntas dentro de su grupo asignado.
  - Cada usuario tiene su propio conjunto de 36 preguntas, permitiendo personalización por asignatura.
- **Funciones del Administrador**:
  - Los administradores pueden gestionar usuarios (agregar, editar y eliminar cuentas).

## Últimas Actualizaciones
- **Sistema de Marcador**: Implementado para mostrar el progreso de cada equipo.
- **Integración de TinyMCE**: Añadido editor de texto enriquecido para la creación y edición de preguntas.
- **Menú Desplegable**: Reemplazo de los botones de navegación para mejorar la usabilidad.
- **Mejoras en la Interfaz**: Diversos ajustes de diseño para una mejor experiencia de usuario.

## Consideraciones
- **El flujo del juego funciona mientras no se recargue la página**. Si la página se recarga, el marcador y las preguntas respondidas se restablecen.

## Uso
1. **Iniciar Sesión** con credenciales de usuario.
2. **Comenzar el Juego**: Los equipos seleccionan preguntas por turnos.
3. **Evaluar Respuestas**: El profesor marca las respuestas como correctas o incorrectas.
4. **Seguimiento de Puntuaciones**: El marcador se actualiza dinámicamente según el rendimiento de los equipos.
5. **Gestión de Preguntas**: Se pueden agregar, editar, eliminar o reordenar preguntas según sea necesario.

Esta aplicación de trivia proporciona una forma estructurada y atractiva de realizar cuestionarios en el aula, asegurando equidad y facilitando la gestión de preguntas.
