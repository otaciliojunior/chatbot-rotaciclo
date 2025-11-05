// Importa as funções de autenticação do seu arquivo firebase.js
import { auth, signInWithEmailAndPassword } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorElement = document.getElementById('login-error');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;

        // Limpa erros antigos e desabilita o botão
        errorElement.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Aguarde...';

        try {
            // Tenta fazer o login com o Firebase Auth
            await signInWithEmailAndPassword(auth, email, password);
            
            // Sucesso! Redireciona para o dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            // Falha no login
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';

            // Mostra uma mensagem de erro amigável
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                errorElement.textContent = 'E-mail ou senha inválidos.';
            } else {
                errorElement.textContent = 'Ocorreu um erro. Tente novamente.';
                console.error('Erro de login:', error);
            }
        }
    });
});