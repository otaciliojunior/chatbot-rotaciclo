// js/quickReply.js

import * as dom from './dom.js';
// MODIFICADO: Removemos o 'state' e importamos o Firestore
import { db, collection, query, onSnapshot, orderBy } from './firebase.js';

/**
 * MODIFICADO: Esta função agora é um ouvinte em tempo real do Firestore.
 */
export function iniciarOuvinteDeRespostasRapidas() {
    // Ouve a sua coleção 'respostasRapidas', ordenando por data de criação
    // (Baseado no seu 'listeners.js' original)
    const q = query(collection(db, "respostasRapidas"), orderBy("criadaEm", "desc"));

    onSnapshot(q, (snapshot) => {
        dom.quickReplyList.innerHTML = ''; // Limpa a lista
        
        if (snapshot.empty) {
            // (Opcional) Mostra uma mensagem se não houver respostas
            return;
        }

        snapshot.forEach((doc) => {
            const replyData = doc.data();
            // O seu backend usa 'titulo' (para o atalho) e 'texto' (para a resposta)
            const itemEl = criarElementoRespostaRapida(replyData);
            dom.quickReplyList.appendChild(itemEl);
        });

    }, (error) => {
        console.error("Erro ao buscar respostas rápidas:", error);
    });
}

/**
 * NOVO: Helper que cria o HTML de um item da lista.
 * (Lógica extraída do 'popularRespostasRapidas' antigo)
 * @param {object} reply - Os dados do Firestore (ex: {titulo: '/saudacao', texto: 'Olá...'})
 */
function criarElementoRespostaRapida(reply) {
    const itemEl = document.createElement("div");
    itemEl.classList.add("quick-reply-item");
    
    // Mapeia os dados do seu backend
    const shortcut = reply.titulo || "Sem Título"; // O atalho (ex: /saudacao)
    const text = reply.texto; // O texto da resposta

    itemEl.dataset.reply = text; // Armazena o texto completo

    itemEl.innerHTML = `
        <span class="shortcut">${shortcut}</span>
        <span class="reply-text">${text}</span>
    `;
    
    itemEl.addEventListener("click", () => {
        selecionarRespostaRapida(text);
    });
    
    return itemEl;
}


// --- NENHUMA MUDANÇA ABAIXO ---
// (Estas funções já são perfeitas e não dependem da fonte dos dados)

// Ação de clique: insere texto no input
export function selecionarRespostaRapida(text) {
    dom.messageInput.value = text;
    dom.quickReplyPopup.classList.add("hidden"); 
    filtrarRespostasRapidas("");
    dom.messageInput.focus();
}

// Abre/Fecha o popup pelo ícone
export function toggleQuickReplies(event) {
    event.stopPropagation(); 
    dom.quickReplyPopup.classList.toggle("hidden");
    filtrarRespostasRapidas(""); 
}

// Fecha o popup se clicar fora
export function fecharPopupSeClicarFora(event) {
    if (!dom.quickReplyPopup.classList.contains("hidden")) {
        if (!dom.quickReplyPopup.contains(event.target) && 
            event.target !== dom.quickReplyTrigger &&
            event.target !== dom.messageInput) 
        {
            dom.quickReplyPopup.classList.add("hidden");
            filtrarRespostasRapidas("");
        }
    }
}

// Filtra a lista enquanto o usuário digita
export function filtrarRespostasRapidas(termo) {
    const termoBusca = termo.toLowerCase();
    const itens = dom.quickReplyList.querySelectorAll(".quick-reply-item");
    itens.forEach(item => {
        const shortcut = item.querySelector(".shortcut").textContent.toLowerCase();
        const text = item.querySelector(".reply-text").textContent.toLowerCase();
        if (shortcut.includes(termoBusca) || text.includes(termoBusca)) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });
}

// Lógica de keyup no input (Enter, /, Esc)
export function handleQuickReplyInput(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        if (dom.quickReplyPopup.classList.contains("hidden")) {
            // O main.js vai chamar 'enviarMensagem'
        }
        dom.quickReplyPopup.classList.add("hidden"); 
        filtrarRespostasRapidas("");
    }
    else if (event.key === "/" && dom.messageInput.value.startsWith("/")) {
        dom.quickReplyPopup.classList.remove("hidden");
        filtrarRespostasRapidas(dom.messageInput.value); 
    }
    else if (event.key === "Escape") {
        dom.quickReplyPopup.classList.add("hidden");
        filtrarRespostasRapidas("");
    }
    else if (dom.messageInput.value.startsWith("/")) {
        filtrarRespostasRapidas(dom.messageInput.value);
    }
    else if (dom.messageInput.value === "") {
         dom.quickReplyPopup.classList.add("hidden");
         filtrarRespostasRapidas("");
    }
}