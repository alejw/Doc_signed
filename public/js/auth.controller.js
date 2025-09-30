        // JavaScript básico para el formulario
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const button = document.querySelector('.login-btn');
            
            // Validación básica
            let isValid = true;
            
            // Validar email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('email', 'Por favor ingresa un email válido');
                isValid = false;
            } else {
                hideError('email');
            }
            
            // Validar contraseña
            if (password.length < 1) {
                showError('password', 'La contraseña es obligatoria');
                isValid = false;
            } else {
                hideError('password');
            }
            
            if (isValid) {
                // Mostrar estado de carga
                button.classList.add('loading');
                button.textContent = 'Iniciando sesión...';
                
                // Simular proceso de login
                setTimeout(() => {
                    // Aquí iría la lógica real de autenticación
                    alert('¡Login exitoso! (Esto es solo una demostración)');
                    button.classList.remove('loading');
                    button.textContent = 'Iniciar Sesión';
                }, 2000);
            }
        });
        
        function showError(fieldName, message) {
            const formGroup = document.getElementById(fieldName).closest('.form-group');
            const errorMessage = formGroup.querySelector('.error-message');
            formGroup.classList.add('error');
            errorMessage.textContent = '⚠️ ' + message;
            errorMessage.style.display = 'block';
        }
        
        function hideError(fieldName) {
            const formGroup = document.getElementById(fieldName).closest('.form-group');
            const errorMessage = formGroup.querySelector('.error-message');
            formGroup.classList.remove('error');
            errorMessage.style.display = 'none';
        }
        
        // Limpiar errores cuando el usuario empieza a escribir
        document.getElementById('email').addEventListener('input', () => hideError('email'));
        document.getElementById('password').addEventListener('input', () => hideError('password'));

        