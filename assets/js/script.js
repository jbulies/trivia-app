// Lógica para la página principal (index.ejs)
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
    // Solo ejecutar esta lógica si estamos en la página principal
    function createButtons() {
        fetch('/questions') // Obtener todas las preguntas
            .then(response => response.json())
            .then(data => {
                data.forEach((question, index) => {
                    const button = document.createElement('div');
                    button.className = 'button';
                    button.innerText = index + 1; // Número del botón
                    button.style.backgroundColor = getColor(index);
                    button.onclick = () => showQuestion(question.id); // Usar el ID de la pregunta
                    mainDiv.appendChild(button);
                });
            })
            .catch(error => console.error('Error:', error));
    }

    function getColor(index) {
        if (index <= 11) return 'yellow';
        if (index <= 23) return 'red';
        return 'blue';
    }

    function showQuestion(id) {
        fetch(`/question/${id}`) // Usar el ID de la pregunta
            .then(response => {
                if (!response.ok) {
                    throw new Error('Pregunta no encontrada');
                }
                return response.json();
            })
            .then(data => {
                // Buscar el botón cuyo texto coincida con el número de la pregunta
                const selectedChild = Array.from(mainDiv.children).find(button => 
                    button.innerText === String(data.number)
                );
    
                if (!selectedChild) {
                    console.error(`Botón para la pregunta ${id} no encontrado.`);
                    return;
                }
    
                selectedButton = selectedChild; // Guardar referencia al botón seleccionado
    
                // Mostrar la pregunta
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
                console.error('Error:', error);
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
            selectedButton.style.backgroundColor = 'green';
        }
    }

    createButtons();
    if (showAnswerButton) {
        showAnswerButton.onclick = showAnswer;
    }
}

// Lógica para la página de administración (questions.ejs)
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
            const groupId = row.querySelector('td:nth-child(4)').textContent;

            document.getElementById('editQuestion').value = question;
            document.getElementById('editAnswer').value = answer;
            document.getElementById('editGroupId').value = groupId;
            document.querySelector('#editForm [name="id"]').value = questionId; // Agregar campo oculto para el ID
            editModal.style.display = 'block';
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

// Lógica para el botón de inicio
const homeButton = document.getElementById('homeButton');
if (homeButton) {
    homeButton.addEventListener('click', () => {
        window.location.href = '/';
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