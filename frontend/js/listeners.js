import { db, collection, query, where, onSnapshot, orderBy } from './firebase.js';
import * as dom from './dom.js';
import { criarElementoChat } from './chatList.js';
import { setAtendimentoData, deleteAtendimentoData } from './state.js';

export function iniciarOuvinteDeAtendimentos() {
    
    const q = query(
        collection(db, "atendimentos"), 
        where("status", "in", ["aguardando", "em_atendimento"]), 
        orderBy("solicitadoEm", "asc") 
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

export function iniciarOuvinteDeContatos() {

    const q = query(
        collection(db, "atendimentos"), 
        orderBy("solicitadoEm", "desc")
    );

    onSnapshot(q, (snapshot) => {
        
        dom.contactHistoryList.innerHTML = ""; 

        const clientesAdicionados = new Set();

        snapshot.docs.forEach((doc) => {
            const atendimentoId = doc.id;
            const atendimentoData = doc.data();
            const clienteId = atendimentoData.cliente_id; 

            setAtendimentoData(atendimentoId, atendimentoData);

            if (clienteId && !clientesAdicionados.has(clienteId)) {
                
                clientesAdicionados.add(clienteId);

                const chatElement = criarElementoChat(atendimentoId, atendimentoData);
                
                if (atendimentoData.status === 'resolvido') {
                    chatElement.style.opacity = "0.7"; 
                }

                dom.contactHistoryList.appendChild(chatElement);
            }
        });

    }, (error) => {
        console.error("Erro no ouvinte de contatos (histórico): ", error);
    });
}