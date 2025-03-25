// ===============================
// LÓGICA PARA LA PÁGINA PRINCIPAL (index.ejs)
// ===============================
const mainDiv = document.getElementById('main');
const dropdownToggle = document.querySelector('.dropdown-toggle');
const dropdownMenu = document.querySelector('.dropdown-menu');
const scorePage = document.getElementById('scorePage');
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

dropdownToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

window.addEventListener('click', (event) => {
    if (dropdownMenu.style.display === 'block' && !event.target.matches('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
        dropdownMenu.style.display = 'none';
    }
});

// Agrega un event listener al menú desplegable para ocultarlo al hacer clic en un elemento
dropdownMenu.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
});

if (mainDiv && questionPage) {
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    dropdownToggle.addEventListener('click', () => {
      dropdownMenu.classList.toggle('show');
    });
    
    window.addEventListener('click', (event) => {
      if (!event.target.matches('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
        if (dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
        }
      }
    });

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

                switch (data.group_id) {
                    case 1:
                        currentTeam = 'amarillo';
                        break;
                    case 2:
                        currentTeam = 'rojo';
                        break;
                    case 3:
                        currentTeam = 'azul';
                        break;
                    default:
                        currentTeam = '';
                        console.warn('Grupo sin asignar.');
                }

                // Muestra los datos de la pregunta
                questionText.innerHTML = data.question;
                questionImage.src = data.image ? `/img/${data.image}` : '';
                questionImage.style.display = data.image ? 'block' : 'none';
                answerText.innerHTML = data.answer;
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

    // Botones
    const correctAnswerBtn = document.getElementById('correctAnswer');
    const wrongAnswerBtn = document.getElementById('wrongAnswer');

    const scoresByRound = [];

    let currentRound = {
        amarillo: 0,
        rojo: 0,
        azul: 0
    };

    let answersThisRound = { // Rastrea cuántas veces ha respondido cada equipo
        amarillo: 0,
        rojo: 0,
        azul: 0
    };

    let teamsAnsweredThisRound = new Set(); // Controla qué equipos han respondido al menos una vez
    let currentTeam = null; // El equipo actual

    // Botón para respuesta correcta
    correctAnswerBtn.addEventListener('click', () => {
        if (currentTeam) {
            currentRound[currentTeam] += 1;
            answersThisRound[currentTeam] += 1;
            teamsAnsweredThisRound.add(currentTeam);
            checkRoundEnd();
            goBack();
        }
    });

    // Botón para respuesta incorrecta
    wrongAnswerBtn.addEventListener('click', () => {
        if (currentTeam) {
            currentRound[currentTeam] += 0;
            answersThisRound[currentTeam] += 1;
            teamsAnsweredThisRound.add(currentTeam);
            checkRoundEnd();
            goBack();
        }
    });

    // Chequea si los tres equipos respondieron y todos respondieron la misma cantidad (la máxima alcanzada)
    function checkRoundEnd() {
        if (teamsAnsweredThisRound.size === 3) {
            const maxAnswers = Math.max(
                answersThisRound.amarillo,
                answersThisRound.rojo,
                answersThisRound.azul
            );

            if (answersThisRound.amarillo === maxAnswers &&
                answersThisRound.rojo === maxAnswers &&
                answersThisRound.azul === maxAnswers) {
                endRound();
            }
        }
    }

    function endRound() {
        // Guarda una copia del resultado de la ronda
        scoresByRound.push({ ...currentRound });

        // Resetea para la siguiente ronda
        currentRound = { amarillo: 0, rojo: 0, azul: 0 };
        answersThisRound = { amarillo: 0, rojo: 0, azul: 0 };
        teamsAnsweredThisRound.clear();
        updateScoreTable();
    }

    // Actualiza la tabla completa
    function updateScoreTable() {
        const tableBody = document.querySelector('#scoreTable tbody');
        tableBody.innerHTML = ''; // Limpiar tabla

        scoresByRound.forEach((round, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Ronda ${index + 1}</td>
                <td>${round.amarillo}</td>
                <td>${round.rojo}</td>
                <td>${round.azul}</td>
            `;
            tableBody.appendChild(row);
        });

        // Agregar totales al final
        const total = scoresByRound.reduce(
            (acc, round) => {
                acc.amarillo += round.amarillo;
                acc.rojo += round.rojo;
                acc.azul += round.azul;
                return acc;
            },
            { amarillo: 0, rojo: 0, azul: 0 }
        );

        const totalRow = document.createElement('tr');
        totalRow.innerHTML = `
            <td><strong>Total</strong></td>
            <td><strong>${total.amarillo}</strong></td>
            <td><strong>${total.rojo}</strong></td>
            <td><strong>${total.azul}</strong></td>
        `;
        tableBody.appendChild(totalRow);
    }

    function showScore() {
        clearInterval(timerInterval);
        mainDiv.style.display = 'none';
        questionPage.style.display = 'none';
        scorePage.style.display = 'block';
        updateScoreTable();
    }

    function showAnswer() {
        clearInterval(timerInterval);
        answerText.style.display = 'inline';
        showAnswerButton.disabled = true;
    }

    function goBack() {
        clearInterval(timerInterval);
        questionPage.style.display = 'none';
        scorePage.style.display = 'none';
        mainDiv.style.display = 'grid';

        if (selectedButton) {
            // Cambiar el color del botón seleccionado a verde
            selectedButton.style.backgroundColor = '#4CAF50';
        }
    }

    createButtons();

    if (showAnswerButton) {
        showAnswerButton.onclick = showAnswer;
    }

    if (timeUpSound) {
        timeUpSound.load();
    } 

    window.goBack = goBack;
}

const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const modalMessageBox = document.getElementById('modalMessageBox');
const modalMessageText = document.getElementById('modalMessageText');
const questionsMessageBox = document.getElementById('questionsMessageBox');
const questionsMessageText = document.getElementById('questionsMessageText');
const usersMessageBox = document.getElementById('usersMessageBox');
const usersMessageText = document.getElementById('usersMessageText');
const reorderMessageBox = document.getElementById('reorderMessageBox');
const reorderMessageText = document.getElementById('reorderMessageText');

const showMessage = (message, type = 'success') => {
    messageText.textContent = message;
    messageBox.style.display = 'block';
    messageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    messageBox.style.color = type === 'success' ? '#155724' : '#721c24';
    messageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
        messageBox.style.display = 'none';
        location.reload(); // Recarga la página para reflejar los cambios
    }, 2000);
};

const showQuestionsMessage = (message, type = 'success') => {
    questionsMessageText.textContent = message;
    questionsMessageBox.style.display = 'block';
    questionsMessageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    questionsMessageBox.style.color = type === 'success' ? '#155724' : '#721c24';
    questionsMessageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
        questionsMessageBox.style.display = 'none';
        location.reload(); // Recarga la página para reflejar los cambios
    }, 2000);
};

const showUsersMessage = (message, type = 'success') => {
    usersMessageText.textContent = message;
    usersMessageBox.style.display = 'block';
    usersMessageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    usersMessageBox.style.color = type === 'success' ? '#155724' : '#721c24';
    usersMessageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
        usersMessageBox.style.display = 'none';
        location.reload(); // Recarga la página para reflejar los cambios
    }, 2000);
};

const showModalMessage = (message, type = 'success') => {
    modalMessageText.textContent = message;
    modalMessageBox.style.display = 'block';
    modalMessageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    modalMessageBox.style.color = type === 'success' ? '#155724' : '#721c24';
    modalMessageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
        modalMessageBox.style.display = 'none';
        location.reload(); // Recarga la página para reflejar los cambios
    }, 2000);
};

const showReorderMessage = (message, type = 'success') => {
    reorderMessageText.textContent = message;
    reorderMessageBox.style.display = 'block';
    reorderMessageBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    reorderMessageBox.style.color = type === 'success' ? '#155724' : '#721c24';
    reorderMessageBox.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
        reorderMessageBox.style.display = 'none';
        location.reload(); // Recarga la página para reflejar los cambios
    }, 2000);
};

// ===============================
// LÓGICA PARA ADMINISTRAR PREGUNTAS (dashboard.ejs)
// ===============================
if (window.location.pathname === '/dashboard') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar TinyMCE
        tinymce.init({
            selector: '#question, #answer, #editQuestion, #editAnswer',
            height: 200,
            menubar: false,
            plugins: 'lists link image code',
            toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | code',
            license_key: 'gpl'
        });
    
        const formPregunta = document.getElementById('formQuestion');
        const saveButton = document.getElementById('saveButton');
    
        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
    
            // Guardar el contenido de TinyMCE en el textarea
            tinymce.triggerSave();
    
            if (!formPregunta) {
                console.error('No se encontró el formulario.');
                return;
            }
    
            const formData = new FormData(formPregunta);
    
            fetch('/dashboard', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message); // Muestra el mensaje de éxito
                } else {
                    showMessage(data.message, 'error'); // Muestra el mensaje de error
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });
    
    const editModal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');
    
    if (editModal && closeModal) {
        // Solo ejecutar esta lógica si estamos en la página de administración
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const row = button.closest('tr');
                const questionId = button.getAttribute('data-id');
                const question = row.querySelector('td:nth-child(2)').innerHTML;
                const answer = row.querySelector('td:nth-child(3)').innerHTML;
        
                // Obtener la imagen, si está presente en la celda
                const imageCell = row.querySelector('td:nth-child(4)');
                const image = imageCell.querySelector('img') ? imageCell.querySelector('img').src : null;
        
                const groupId = row.querySelector('td:nth-child(5)').textContent;
        
                // Establecer los valores en los campos del formulario
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
        
                // Establecer el contenido de la pregunta y la respuesta en el editor TinyMCE
                tinymce.get('editQuestion').setContent(question);
                tinymce.get('editAnswer').setContent(answer);
        
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
                            showModalMessage(data.message);
                        } else {
                            showModalMessage(data.message, 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        showModalMessage(data.message, 'error');
                    }
                });
                editModal.style.display = 'block';
            });
        });
    
        closeModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
        
            const formData = new FormData(e.target);
            
            // Obtén el contenido de TinyMCE
            const questionContent = tinymce.get('editQuestion').getContent({format: 'raw'}); // Usa raw para obtener el HTML sin el formateo extra
            const answerContent = tinymce.get('editAnswer').getContent({format: 'raw'});

            // Agrega los contenidos de TinyMCE al FormData
            formData.set('editQuestion', questionContent);
            formData.set('editAnswer', answerContent);
        
            const id = formData.get('id'); // Obtener el ID desde el formulario
        
            fetch(`/dashboard/${id}`, {
                method: 'PUT',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showModalMessage(data.message);
                } else {
                    showModalMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
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
                            showQuestionsMessage(data.message);
                        } else {
                            showQuestionsMessage(data.message, 'error');
                        }
                    })
                    .catch(error => console.error('Error:', error));
                }
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
                        showReorderMessage(data.message); // Muestra el mensaje de éxito
                    } else {
                        showReorderMessage(data.message, 'error'); // Muestra el mensaje de error
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
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

    const editModal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');

    if (editModal && closeModal) {
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
            if (data.success) showModalMessage(data.message);
            else showModalMessage(data.message, 'error');
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

                const res = await fetch(`/users/${id}`, { method: 'DELETE' });
                const data = await res.json();

                if (data.success) showUsersMessage(data.message);
                else showUsersMessage(data.message, 'error');
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