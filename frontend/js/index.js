// --- 1. IMPORTAÇÕES DO FIREBASE ---
// (Importa SÓ o necessário para o login)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- 2. CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC1rzlA51ICexuzyMjHkbk6HnRb2lLwk9Y",
    authDomain: "rotaciclo.firebaseapp.com",
    projectId: "rotaciclo",
    storageBucket: "rotaciclo.firebasestorage.app",
    messagingSenderId: "490741633811",
    appId: "1:90741633811:web:7b1115381d58bb23e3c0e6",
    measurementId: "G-G2R6G1S8DK"
};

// --- 3. INICIALIZAÇÃO DOS SERVIÇOS ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("Firebase (Login) conectado!");

// --- 4. LÓGICA DA PÁGINA DE LOGIN ---
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

            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                errorElement.textContent = 'E-mail ou senha inválidos.';
            } else {
                errorElement.textContent = 'Ocorreu um erro. Tente novamente.';
                console.error('Erro de login:', error);
            }
        }
    });
});