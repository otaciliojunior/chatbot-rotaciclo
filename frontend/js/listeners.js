// js/listeners.js

// Importa as funções do nosso firebase.js (que usa o SDK do cliente)
import { db, collection, query, where, onSnapshot, orderBy } from './firebase.js';

// Importa os seletores do nosso dom.js
import * as dom from './dom.js';

// Importa a função helper que cria o HTML do chat
import { criarElementoChat } from './chatList.js';

// Importa o nosso cache de estado
import { setAtendimentoData, deleteAtendimentoData } from './state.js';

/**
 * OUVINTE 1: Fila de Atendimento (Chats Ativos)
 * (Sem alterações)
 */
export function iniciarOuvinteDeAtendimentos() {
    
    const q = query(
        collection(db, "atendimentos"), 
        where("status", "in", ["aguardando", "navegando", "em_atendimento"]), 
        orderBy("solicitadoEm", "asc") // 'asc' (ascendente) para mostrar o mais antigo primeiro
    );

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const atendimentoId = change.doc.id;
            const atendimentoData = change.doc.data();

            setAtendimentoData(atendimentoId, atendimentoData);

            if (change.type === "added") {
                console.log("Novo atendimento:", atendimentoId, atendimentoData);
                const chatElement = criarElementoChat(atendimentoId, atendimentoData);
                dom.chatListContainer.prepend(chatElement); 
            }

            if (change.type === "modified") {
                console.log("Atendimento modificado:", atendimentoId, atendimentoData);
                const chatElementExistente = dom.chatListContainer.querySelector(`.chat-contact[data-chat-id="${atendimentoId}"]`);
                if (chatElementExistente) {
                    chatElementExistente.remove();
                }
                const chatElementAtualizado = criarElementoChat(atendimentoId, atendimentoData);
                dom.chatListContainer.prepend(chatElementAtualizado); 
            }

            if (change.type === "removed") {
                console.log("Atendimento removido da fila:", atendimentoId);
                const chatElementParaRemover = dom.chatListContainer.querySelector(`.chat-contact[data-chat-id="${atendimentoId}"]`);
                if (chatElementParaRemover) {
                    chatElementParaRemover.remove();
                }
            }
        });

    }, (error) => {
        console.error("Erro no ouvinte de atendimentos: ", error);
    });
}


/**
 * OUVINTE 2: Histórico de Contatos
 * MODIFICADO: Agora agrupa por cliente para evitar duplicados.
 */
export function iniciarOuvinteDeContatos() {

    const q = query(
        collection(db, "atendimentos"), 
        orderBy("solicitadoEm", "desc") // 'desc' (descendente) para mostrar o mais novo no topo
    );

    onSnapshot(q, (snapshot) => {
        
        dom.contactHistoryList.innerHTML = ""; // Limpa a lista de histórico

        // --- INÍCIO DA CORREÇÃO (Evitar Duplicados) ---
        // Usamos um 'Set' para guardar os IDs de clientes que já adicionámos
        const clientesAdicionados = new Set();
        // --- FIM DA CORREÇÃO ---

        snapshot.docs.forEach((doc) => {
            const atendimentoId = doc.id;
            const atendimentoData = doc.data();
            const clienteId = atendimentoData.cliente_id; // O número de telefone

            // Garante que o cache tenha os dados mais recentes
            setAtendimentoData(atendimentoId, atendimentoData);

            // --- INÍCIO DA CORREÇÃO (Evitar Duplicados) ---
            // Só adiciona à lista se este cliente_id (número) ainda não tiver sido adicionado
            if (clienteId && !clientesAdicionados.has(clienteId)) {
                
                // Marca este cliente como adicionado
                clientesAdicionados.add(clienteId);

                // Cria o elemento de chat (reutilizamos a mesma função)
                const chatElement = criarElementoChat(atendimentoId, atendimentoData);
                
                // Se o chat estiver resolvido, podemos adicionar um estilo
                if (atendimentoData.status === 'resolvido') {
                    chatElement.style.opacity = "0.7"; 
                }

                dom.contactHistoryList.appendChild(chatElement);
            }
            // --- FIM DA CORREÇÃO ---
        });

    }, (error) => {
        console.error("Erro no ouvinte de contatos (histórico): ", error);
    });
}