document.querySelectorAll('[data-password-toggle]').forEach(button => {
    const inputId = button.getAttribute('aria-controls');
    const passwordInput = inputId ? document.getElementById(inputId) : null;

    if (!(passwordInput instanceof HTMLInputElement)) {
        console.error(`No se encontró el campo de contraseña "${inputId}".`);
        return;
    }

    button.addEventListener('click', () => {
        const showPassword = passwordInput.type === 'password';
        const label = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';

        passwordInput.type = showPassword ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(showPassword));
        button.setAttribute('aria-label', label);
        button.title = label;
    });
});
