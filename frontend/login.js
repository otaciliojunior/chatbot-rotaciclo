// js/login.js

// Define a URL da sua API backend
const API_URL = 'https://chatbot-rotaciclo.onrender.com/api';

// --- Seletores do Formulário de Login ---
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');

// --- NOVOS: Seletores do Modal FAQ ---
const faqButton = document.getElementById('faq-button');
const modal = document.getElementById('faq-modal');
const overlay = document.getElementById('modal-overlay');
const closeButton = document.getElementById('close-faq-button');

// --- NOVA: Lógica para controlar o Modal ---
function openModal() {
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeModal() {
    if (modal) modal.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// Adiciona os ouvintes de evento para o modal
if (faqButton) {
    faqButton.addEventListener('click', openModal);
}
if (closeButton) {
    closeButton.addEventListener('click', closeModal);
}
if (overlay) {
    overlay.addEventListener('click', closeModal);
}

// --- Lógica de Login (Código original) ---

// Verifica se o usuário já está logado
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Se já tem token, tenta ir direto para o dashboard
        window.location.href = 'index.html';
    }
});

// Adiciona o ouvinte para o envio do formulário
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Desativa o botão e mostra "Carregando..."
    loginButton.disabled = true;
    loginButton.textContent = 'Carregando...';
    errorMessage.textContent = '';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // Se a resposta não for OK (ex: 401, 500), joga um erro
            throw new Error(data.message || 'Erro ao tentar fazer login.');
        }

        // --- Sucesso! ---
        
        // 1. Salva o token no localStorage
        localStorage.setItem('authToken', data.token);
        
        // 2. Salva os dados do operador para uso imediato no dashboard
        localStorage.setItem('operador', JSON.stringify(data.operador));

        // 3. Redireciona para o dashboard principal
        window.location.href = 'index.html';

    } catch (error) {
        // Mostra a mensagem de erro (ex: "Credenciais inválidas.")
        errorMessage.textContent = error.message;
        
        // Reativa o botão
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
});