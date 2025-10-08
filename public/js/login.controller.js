const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const icon = togglePassword.querySelector('i');
  const isPassword = passwordInput.type === 'password';

  // Cambia el tipo del input
  passwordInput.type = isPassword ? 'text' : 'password';

  // Cambia el ícono (Font Awesome)
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});
