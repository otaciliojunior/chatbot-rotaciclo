// js/crmPanel.js

import * as dom from './dom.js';
// MODIFICADO: Importa o 'state' real e as funções do Firestore
import { getAtendimentoData, getChatAtivoId } from './state.js';
import { db, doc, updateDoc } from './firebase.js';

// Abre/Fecha o painel
export function toggleInfoPanel() {
    dom.infoPanel.classList.toggle("open");
}

/**
 * MODIFICADO: Salva as notas do atendente no Firestore
 */
export async function salvarNotasDoCliente() {
    const notas = dom.infoPanelNotes.value;
    const chatId = getChatAtivoId();

    if (!chatId) {
        console.warn("Nenhum chat ativo para salvar notas.");
        return;
    }

    // Cria uma referência ao documento do atendimento no Firestore
    const docRef = doc(db, "atendimentos", chatId);

    try {
        // Atualiza o documento no Firestore com o novo campo de notas
        await updateDoc(docRef, {
            notasDoAtendente: notas
        });
        console.log(`Notas salvas para o Chat ${chatId}.`);
    } catch (error) {
        console.error("Erro ao salvar notas no Firestore:", error);
    }
}

/**
 * MODIFICADO: Popula o painel com os dados reais do Firestore (via cache)
 * @param {string} chatId - O ID do atendimento (ex: 55849...)
 * @param {object} chat - O objeto de dados do atendimento (do cache)
 */
export function popularInfoPanel(chatId, chat) {
    // MODIFICADO: Adiciona uma verificação extra para o painel vazio
    if (!chat) {
        console.warn("Dados do chat não encontrados para popular o painel.");
        // Limpa o painel se os dados não existirem
        dom.infoPanelAvatar.src = "https://i.pravatar.cc/150";
        dom.infoPanelName.textContent = "Cliente";
        dom.infoPanelPhone.textContent = "Carregando...";
        dom.infoPanelEmail.textContent = "Carregando...";
        dom.infoPanelNotes.value = "";
        dom.infoPanelTags.innerHTML = "";
        return;
    }

    const fallbackAvatar = `https://i.pravatar.cc/150?u=${chatId}`;
    
    // Mapeia os dados do seu backend (coleção 'atendimentos')
    dom.infoPanelAvatar.src = chat.cliente_foto_url || fallbackAvatar;
    dom.infoPanelName.textContent = chat.cliente_nome || "Cliente";
    
    // --- A CORREÇÃO ESTÁ AQUI ---
    // Usamos 'chat.cliente_id' (o número de tel.) em vez de 'chatId' (o ID do documento)
    dom.infoPanelPhone.textContent = chat.cliente_id; 
    // --- FIM DA CORREÇÃO ---
    
    dom.infoPanelEmail.textContent = "Email não cadastrado"; // O bot não coleta email
    dom.infoPanelNotes.value = chat.notasDoAtendente || ""; // Carrega as notas do Firestore

    // Popula as tags (o seu backend não parece salvar tags, então limpamos)
    dom.infoPanelTags.innerHTML = "";
    // Exemplo de como você poderia adicionar tags se elas existissem:
    // if (chat.tags && chat.tags.length > 0) {
    //     chat.tags.forEach(tagText => {
    //         const tagEl = document.createElement("span");
    //         tagEl.classList.add("tag");
    //         tagEl.textContent = tagText;
    //         dom.infoPanelTags.appendChild(tagEl);
    //     });
    // }
}