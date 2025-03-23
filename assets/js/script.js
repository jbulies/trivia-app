// ===============================
// LÓGICA PARA LA PÁGINA PRINCIPAL (index.ejs)
// ===============================
const mainDiv = document.getElementById('main');
const questionPage = document.getElementById('questionPage');
const questionText = document.getElementById('questionText');
const questionImage = document.getElementById('questionImage');
const answerText = document.getElementById('answerText');
const showAnswerButton = document.getElementById('showAnswer');
const timeUpSound = document.getElementById('timeUpSound');
const timeLeftElement = document.getElementById('timeLeft');
const timerElement = document.getElementById('timer');
let timerInterval;
let selectedButton;

if (mainDiv && questionPage) {
    const groupColors = {
        1: '#FFEB3B',  // Amarillo
        2: '#F44336',  // Rojo
        3: '#2196F3',  // Azul
    };

    let questionsList = []; // Guarda el listado de preguntas cargadas

    function getColorByGroup(group_id) {
        return groupColors[group_id] || '#CCCCCC'; // Gris si no se encuentra el grupo
    }

    function createButtons() {
        fetch('/questions') // Trae las preguntas del usuario actual
            .then(response => response.json())
            .then(data => {
                questionsList = data; // Guardamos el listado completo de preguntas

                data.forEach((question, index) => {
                    const button = document.createElement('div');
                    button.className = 'button';

                    // Mostramos un número consecutivo aunque los números reales no lo sean
                    button.innerText = index + 1;

                    button.style.backgroundColor = getColorByGroup(question.group_id);

                    // Al hacer clic, obtenemos el question.number real a partir de su posición en questionsList
                    button.onclick = () => showQuestionByNumber(question.number);

                    mainDiv.appendChild(button);
                });
            })
            .catch(error => console.error('Error cargando preguntas:', error));
    }

    function showQuestionByNumber(number) {
        fetch(`/question/${number}`) // Llamamos al backend con el número real de la pregunta
            .then(response => {
                if (!response.ok) {
                    throw new Error('Pregunta no encontrada');
                }
                return response.json();
            })
            .then(data => {
                // Ahora no usamos el texto del botón para buscarlo, sino su posición en questionsList
                const buttonIndex = questionsList.findIndex(q => q.number === data.number);

                if (buttonIndex === -1) {
                    console.error(`Pregunta con número ${data.number} no encontrada en la lista de botones.`);
                    return;
                }

                // Encontramos el botón directamente por su posición
                const selectedChild = mainDiv.children[buttonIndex];

                if (!selectedChild) {
                    console.error(`Botón en posición ${buttonIndex} no encontrado.`);
                    return;
                }

                selectedButton = selectedChild;

                // Muestra los datos de la pregunta
                questionText.innerText = data.question;
                questionImage.src = data.image ? `/img/${data.image}` : '';
                questionImage.style.display = data.image ? 'block' : 'none';
                answerText.innerText = data.answer;
                answerText.style.display = 'none';
                questionPage.style.display = 'block';
                mainDiv.style.display = 'none';

                startTimer();
                showAnswerButton.disabled = false;
            })
            .catch(error => {
                console.error('Error al cargar la pregunta:', error);
                alert('No se pudo cargar la pregunta.');
            });
    }

    function startTimer() {
        let timeLeft = 60;
        timeLeftElement.innerText = timeLeft;
        timerElement.style.color = '';
        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timeUpSound.play();
                timerElement.style.color = 'red';
            } else {
                timeLeft--;
                timeLeftElement.innerText = timeLeft;
            }
        }, 1000);
    }

    function showAnswer() {
        clearInterval(timerInterval);
        answerText.style.display = 'inline';
        showAnswerButton.disabled = true;
    }

    function goBack() {
        questionPage.style.display = 'none';
        mainDiv.style.display = 'grid';
        clearInterval(timerInterval);

        if (selectedButton) {
            // Cambiar el color del botón seleccionado a verde
            selectedButton.style.backgroundColor = '#4CAF50';
        }
    }

    createButtons();

    if (showAnswerButton) {
        showAnswerButton.onclick = showAnswer;
    }

    window.goBack = goBack;
}

// ===============================
// LÓGICA PARA ADMINISTRAR PREGUNTAS (dashboard.ejs)
// ===============================
if (window.location.pathname === '/dashboard') {
    const editModal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');
    
    if (editModal && closeModal) {
        // Solo ejecutar esta lógica si estamos en la página de administración
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const row = button.closest('tr');
                const questionId = button.getAttribute('data-id'); // Obtener el ID de la pregunta
                const question = row.querySelector('td:nth-child(2)').textContent;
                const answer = row.querySelector('td:nth-child(3)').textContent;
        
                // Obtener la imagen, si está presente en la celda
                const imageCell = row.querySelector('td:nth-child(4)');
                const image = imageCell.querySelector('img') ? imageCell.querySelector('img').src : null;
        
                const groupId = row.querySelector('td:nth-child(5)').textContent;
        
                // Establecer los valores en los campos del formulario
                document.getElementById('editQuestion').value = question;
                document.getElementById('editAnswer').value = answer;
                document.getElementById('editGroupId').value = groupId;
                document.querySelector('#editForm [name="id"]').value = questionId;
        
                // Si la imagen existe, la mostramos en el modal
                if (image) {
                    document.getElementById('showImage').src = image; // Establecemos el src de la imagen
                    document.getElementById('showImage').style.display = 'block'; // Mostramos la imagen
                    document.getElementById('imageText').style.display = 'none'; // Ocultamos el texto "No Imagen"
                    document.getElementById('deleteImageButton').style.display = 'inline-block'; // Mostramos el botón de eliminar imagen
                } else {
                    document.getElementById('showImage').style.display = 'none'; // Ocultamos la imagen
                    document.getElementById('imageText').style.display = 'block'; // Mostramos el texto "No Imagen"
                    document.getElementById('deleteImageButton').style.display = 'none'; // Ocultamos el botón de eliminar imagen
                }
        
                editModal.style.display = 'block';
        
                // Agregar la lógica para eliminar la imagen
                document.getElementById('deleteImageButton').addEventListener('click', async () => {
                    try {
                        const response = await fetch(`/dashboard/${questionId}/deleteImage`, {
                            method: 'DELETE',
                        });
        
                        const data = await response.json();
                        if (data.success) {
                            // Eliminar la imagen del modal
                            document.getElementById('showImage').style.display = 'none';
                            document.getElementById('imageText').style.display = 'block';
                            document.getElementById('deleteImageButton').style.display = 'none';
                            alert('Imagen eliminada correctamente');
                        } else {
                            alert('Hubo un problema al eliminar la imagen');
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Error al intentar eliminar la imagen');
                    }
                });
            });
        });               
    
        closeModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
    
            const formData = new FormData(e.target);
            const id = formData.get('id'); // Obtener el ID desde el formulario
    
            fetch(`/dashboard/${id}`, {
                method: 'PUT',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.message); // Mostrar mensaje de error
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Ocurrió un error inesperado.');
            });
        });
    
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                if (confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) {
                    fetch(`/dashboard/${id}`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            location.reload();
                        }
                    })
                    .catch(error => console.error('Error:', error));
                }
            });
        });
    
        document.getElementById('addQuestionForm').addEventListener('submit', (e) => {
            e.preventDefault();
    
            const formData = new FormData(e.target);
    
            fetch('/dashboard', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                const messageBox = document.getElementById('messageBox');
                const messageText = document.getElementById('messageText');
    
                if (data.success) {
                    // Mostrar mensaje de éxito
                    messageText.textContent = data.message;
                    messageBox.style.backgroundColor = '#d4edda';
                    messageBox.style.color = '#155724';
                    messageBox.style.borderColor = '#c3e6cb';
                    messageBox.style.display = 'block';
    
                    // Recargar la página después de 2 segundos
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    // Mostrar mensaje de error
                    messageText.textContent = data.message;
                    messageBox.style.backgroundColor = '#f8d7da';
                    messageBox.style.color = '#721c24';
                    messageBox.style.borderColor = '#f5c6cb';
                    messageBox.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Ocurrió un error inesperado.');
            });
        });
    }
    
    // Lógica para el botón de reordenar preguntas
    const reorderButton = document.getElementById('reorderQuestions');
    if (reorderButton) {
        reorderButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas reordenar las preguntas aleatoriamente?')) {
                fetch('/reorder-questions', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Preguntas reordenadas correctamente.');
                        location.reload(); // Recargar la página para ver los cambios
                    } else {
                        alert('Error al reordenar las preguntas.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al reordenar las preguntas.');
                });
            }
        });
    }
}

// ===============================
// LÓGICA PARA ADMINISTRAR USUARIOS (users.ejs)
// ===============================
if (window.location.pathname === '/users') {
    const addUserForm = document.getElementById('addUserForm');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita el envío de formulario estándar

            const formData = new FormData(addUserForm);

            try {
                const response = await fetch('/users', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    showMessage(data.message); // Muestra el mensaje de éxito
                    addUserForm.reset(); // Limpia el formulario después de agregar
                } else {
                    const errorData = await response.json();
                    showMessage(errorData.message, 'error'); // Muestra el mensaje de error
                }
            } catch (error) {
                console.error('Error al agregar usuario:', error);
                showMessage('Ocurrió un error inesperado al agregar el usuario.', 'error');
            }
        });
    }

    const showMessage = (message, type = 'success') => {
        messageText.textContent = message;
        messageBox.style.display = 'block';
        messageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        messageBox.style.color = type === 'success' ? '#155724' : '#721c24';
        messageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
        setTimeout(() => {
            messageBox.style.display = 'none';
            location.reload(); // Recarga la página para mostrar el nuevo usuario
        }, 2000);
    };

    const editModal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');

    if (editModal && closeModal) {
        const messageBox = document.getElementById('messageBox');
        const messageText = document.getElementById('messageText');

        const showMessage = (message, type = 'success') => {
            messageText.textContent = message;
            messageBox.style.display = 'block';
            messageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            setTimeout(() => location.reload(), 2000);
        };

        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const row = button.closest('tr');
                const userId = button.getAttribute('data-id'); // Obtener el ID del usuario
                const username = row.querySelector('td:nth-child(2)').textContent;
                const firstName = row.querySelector('td:nth-child(3)').textContent;
                const lastName = row.querySelector('td:nth-child(4)').textContent;
                const isAdminText = row.querySelector('td:nth-child(5)').textContent.toLowerCase(); // Convertir a minúsculas para comparar

                let isAdmin = false;
                if (isAdminText === 'sí') {
                    isAdmin = true;
                } else if (isAdminText === 'no') {
                    isAdmin = false;
                }

                document.getElementById('editId').value = userId;
                document.getElementById('editUser').value = username;
                document.getElementById('editFirstName').value = firstName;
                document.getElementById('editLastName').value = lastName;
                document.getElementById('editPassword').value = ''; // Opcional: no enviar contraseña aquí
                document.getElementById('editIsAdmin').checked = isAdmin;

                editModal.style.display = 'block';
            });
        });

        closeModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });

        document.getElementById('editForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('editId').value;
            const payload = {
                editFirstName: document.getElementById('editFirstName').value,
                editLastName: document.getElementById('editLastName').value,
                editUser: document.getElementById('editUser').value,
                editPassword: document.getElementById('editPassword').value,
                editIsAdmin: document.getElementById('editIsAdmin').checked ? 1 : 0
            };

            const res = await fetch(`/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) showMessage(data.message);
            else showMessage(data.message, 'error');
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

                const res = await fetch(`/users/${id}`, { method: 'DELETE' });
                const data = await res.json();

                if (data.success) showMessage(data.message);
                else showMessage(data.message, 'error');
            });
        });
    }
}

// ===============================
// LÓGICA PARA BOTONES DE NAVEGACIÓN Y LOGOUT
// ===============================

// Lógica para el botón Inicio
const homeButton = document.getElementById('homeButton');
if (homeButton) {
    homeButton.addEventListener('click', () => {
        window.location.href = '/';
    });
}

// Lógica para el botón de Preguntas
const questionsButton = document.getElementById('questionsButton');
if (questionsButton) {
    questionsButton.addEventListener('click', () => {
        window.location.href = '/dashboard';
    });
}

// Lógica para el botón de Usuarios
const usersButton = document.getElementById('usersButton');
if (usersButton) {
    usersButton.addEventListener('click', () => {
        window.location.href = '/users';
    });
}

// Lógica para el botón de cierre de sesión
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        fetch('/logout', {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/login';
            } else {
                alert('Error al cerrar sesión');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cerrar sesión');
        });
    });
}