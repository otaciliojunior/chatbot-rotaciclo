// js/main.js (ATUALIZADO)

import * as dom from './dom.js';
import { 
    enviarMensagem, 
    triggerFileInput, 
    handleFileSelect, 
    clearFilePreview,
    finalizarAtendimento
} from './chat.js'; 
import { filtrarChats, filtrarContatos } from './chatList.js'; 
import { toggleInfoPanel, salvarNotasDoCliente } from './crmPanel.js';
import { 
    toggleQuickReplies, 
    handleQuickReplyInput,
    iniciarOuvinteDeRespostasRapidas 
} from './quickReply.js'; 
import { showSidebarPanel } from './ui.js';
import { iniciarOuvinteDeAtendimentos, iniciarOuvinteDeContatos } from './listeners.js';

// --- NOVA CONSTANTE DA API ---
const API_URL = 'https://chatbot-rotaciclo.onrender.com/api';

// --- NOVA FUNÇÃO DE AUTENTICAÇÃO E CARREGAMENTO DE PERFIL ---
async function autenticarECarregarPerfil() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        // Se não há token, redireciona para o login
        console.warn("Nenhum token encontrado, redirecionando para login.");
        window.location.href = 'login.html';
        return false; // Interrompe a execução
    }

    try {
        const response = await fetch(`${API_URL}/operador/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Se o token for inválido ou expirado
            throw new Error('Falha na autenticação');
        }

        const operador = await response.json();
        
        // Salva os dados do operador para uso futuro
        localStorage.setItem('operador', JSON.stringify(operador));

        // Popula a UI de Configurações
        if (dom.settingsProfileName) {
            dom.settingsProfileName.textContent = operador.nome;
        }
        if (dom.settingsProfileEmail) {
            dom.settingsProfileEmail.textContent = operador.email;
        }
        if (dom.settingsAvatar) {
            // Pega a primeira letra do primeiro nome
            dom.settingsAvatar.textContent = operador.nome.charAt(0).toUpperCase();
        }
        
        return true; // Autenticação bem-sucedida

    } catch (error) {
        console.error('Erro de autenticação:', error.message);
        // Limpa o token inválido e redireciona para o login
        localStorage.removeItem('authToken');
        localStorage.removeItem('operador');
        window.location.href = 'login.html';
        return false; // Interrompe a execução
    }
}

// --- NOVA FUNÇÃO DE LOGOUT ---
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('operador');
    window.location.href = 'login.html';
}

// --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO (MODIFICADA) ---
function inicializarDashboard() {
    
    // 1. Inicia os Listeners do Firestore
    iniciarOuvinteDeAtendimentos();
    iniciarOuvinteDeRespostasRapidas();
    iniciarOuvinteDeContatos();
    
    // 2. Abre o painel de chat
    showSidebarPanel('chat');

    // --- 3. Conecta todos os Ouvintes de Eventos ---

    // Navegação Principal (Coluna 1)
    dom.navChatButton.addEventListener("click", () => showSidebarPanel('chat'));
    dom.navContactsButton.addEventListener("click", () => showSidebarPanel('contacts'));
    dom.navSettingsButton.addEventListener("click", () => showSidebarPanel('settings'));
    
    // Chat (Enviar)
    dom.sendButton.addEventListener("click", enviarMensagem);

    // Ouvintes de Anexo
    dom.attachFileTrigger.addEventListener("click", triggerFileInput);
    dom.fileInput.addEventListener("change", handleFileSelect);
    dom.removePreviewButton.addEventListener("click", clearFilePreview);

    // Pesquisa da Lista de Chats (Fila)
    dom.searchChatInput.addEventListener("input", filtrarChats);
    
    // Pesquisa da Lista de Contatos (Histórico)
    dom.searchContactsInput.addEventListener("input", filtrarContatos);
    
    // Painel de Info (CRM)
    dom.toggleInfoButton.addEventListener("click", toggleInfoPanel);
    dom.closeInfoButton.addEventListener("click", toggleInfoPanel);
    dom.infoPanelNotes.addEventListener("blur", salvarNotasDoCliente);

    // Menu de Opções do Chat (Finalizar)
    dom.chatOptionsTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        dom.chatOptionsMenu.classList.toggle("hidden");
    });
    dom.finishChatButton.addEventListener("click", () => {
        finalizarAtendimento();
        dom.chatOptionsMenu.classList.add("hidden");
    });

    // Respostas Rápidas
    dom.quickReplyTrigger.addEventListener("click", toggleQuickReplies);
    
    // --- NOVO LISTENER DE LOGOUT ---
    if (dom.logoutButton) {
        dom.logoutButton.addEventListener("click", handleLogout);
    } else {
        console.error("Botão de Logout não encontrado no DOM.");
    }
    
    // Listener Global de Cliques (para fechar popups)
    document.addEventListener("click", (event) => {
        if (!dom.quickReplyPopup.classList.contains("hidden")) {
            if (!dom.quickReplyPopup.contains(event.target) && 
                event.target !== dom.quickReplyTrigger &&
                event.target !== dom.messageInput) 
            {
                dom.quickReplyPopup.classList.add("hidden");
            }
        }
        
        if (!dom.chatOptionsMenu.classList.contains("hidden")) {
            if (!dom.chatOptionsMenu.contains(event.target) && 
                event.target !== dom.chatOptionsTrigger) 
            {
                dom.chatOptionsMenu.classList.add("hidden");
            }
        }
    });
    
    // Input principal (lida com Enter e /)
    dom.messageInput.addEventListener("keyup", (event) => {
        handleQuickReplyInput(event);
        if (event.key === "Enter" && dom.quickReplyPopup.classList.contains("hidden")) {
            enviarMensagem();
        }
    });
}

// --- PONTO DE ENTRADA (MODIFICADO) ---
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verifica se o usuário está logado e carrega o perfil
    const logadoComSucesso = await autenticarECarregarPerfil();

    // 2. Só inicializa o resto do dashboard se o login for válido
    if (logadoComSucesso) {
        inicializarDashboard();
    }
});