// js/chatList.js

import * as dom from './dom.js';
import { getChatAtivoId } from './state.js';
import { abrirChat } from './chat.js';
// NOVO: Importa as funções helper do avatar
import { getInitials, generateColorHash } from './utils.js';

// (A função formatarTimestamp permanece igual)
function formatarTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const data = timestamp.toDate();
    const agora = new Date();
    if (data.toDateString() === agora.toDateString()) {
        return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}


/**
 * MODIFICADO: Agora usa os avatares de iniciais.
 * Cria o elemento HTML para um chat na lista da esquerda.
 */
export function criarElementoChat(atendimentoId, atendimentoData) {
    const contactEl = document.createElement("div");
    contactEl.classList.add("chat-contact");
    contactEl.dataset.chatId = atendimentoId; 

    // Mapeia os dados do seu backend
    const nome = atendimentoData.cliente_nome || "Cliente Desconhecido";
    const motivo = atendimentoData.motivo || "Nova conversa...";
    const timestamp = atendimentoData.solicitadoEm; 

    // --- INÍCIO DA CORREÇÃO DO AVATAR ---
    const iniciais = getInitials(nome);
    const corAvatar = generateColorHash(nome);
    
    // Cria o HTML para o avatar de iniciais
    const avatarHtml = `
        <div class="avatar-initials" style="background-color: ${corAvatar}">
            ${iniciais}
        </div>
    `;
    // --- FIM DA CORREÇÃO DO AVATAR ---
    
    if (atendimentoId === getChatAtivoId()) {
        contactEl.classList.add("active");
    }

    // MODIFICADO: Substituído o <img> pelo avatarHtml
    contactEl.innerHTML = `
        ${avatarHtml}
        <div class="contact-details">
            <span class="contact-name">${nome}</span>
            <span class="last-message">${motivo}</span>
        </div>
        <span class="message-time">${formatarTimestamp(timestamp)}</span>
    `;
    
    contactEl.addEventListener("click", () => {
        abrirChat(atendimentoId);
    });
    return contactEl;
}

/**
 * MANTIDO: Esta função ainda é útil quando O OPERADOR envia uma mensagem.
 * (Sem alterações)
 */
export function atualizarPreviewChatList(chatId, texto, timestamp = null) {
    const contactEl = dom.chatListContainer.querySelector(`.chat-contact[data-chat-id="${chatId}"]`);
    if (contactEl) {
        contactEl.querySelector(".last-message").textContent = texto;
        
        const timeEl = contactEl.querySelector(".message-time");
        if (timestamp) {
             timeEl.textContent = formatarTimestamp(timestamp);
        } else {
            const agora = new Date();
            const horas = agora.getHours().toString().padStart(2, '0');
            const minutos = agora.getMinutes().toString().padStart(2, '0');
            timeEl.textContent = `${horas}:${minutos}`;
        }
        
        dom.chatListContainer.prepend(contactEl); // Move para o topo
    }
}

/**
 * MANTIDO: Filtra a FILA DE CHATS (Coluna 2, Painel 1)
 * (Sem alterações)
 */
export function filtrarChats() {
    const termo = dom.searchChatInput.value.trim().toLowerCase();
    const chatsNaLista = dom.chatListContainer.querySelectorAll(".chat-contact"); 
    
    chatsNaLista.forEach(chatEl => {
        const nomeContato = chatEl.querySelector(".contact-name").textContent.toLowerCase();
        if (nomeContato.includes(termo)) {
            chatEl.style.display = "flex";
        } else {
            chatEl.style.display = "none";
        }
    });
}

/**
 * MANTIDO: Filtra o HISTÓRICO DE CONTATOS (Coluna 2, Painel 2)
 * (Sem alterações)
 */
export function filtrarContatos() {
    const termo = dom.searchContactsInput.value.trim().toLowerCase(); 
    const chatsNaLista = dom.contactHistoryList.querySelectorAll(".chat-contact"); 
    
    chatsNaLista.forEach(chatEl => {
        const nomeContato = chatEl.querySelector(".contact-name").textContent.toLowerCase();
        if (nomeContato.includes(termo)) {
            chatEl.style.display = "flex";
        } else {
            chatEl.style.display = "none";
        }
    });
}