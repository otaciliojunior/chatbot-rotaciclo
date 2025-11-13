// js/state.js

// REMOVIDO: O 'chatData' falso foi removido.
// O Firestore será nossa única fonte da verdade.

// NOVO: Um cache local para guardar os dados dos atendimentos
// que vêm do listener do Firestore.
// A chave será o ID do atendimento (ex: '5584999999999')
// O valor será os dados (ex: { cliente_nome: '...', cliente_id: '...' })
const atendimentosState = new Map();

/**
 * Funções para o nosso cache local de atendimentos.
 * Isso impede que tenhamos que buscar no Firestore toda vez
 * que clicamos em um chat.
 */
export function getAtendimentoData(atendimentoId) {
    return atendimentosState.get(atendimentoId);
}

export function setAtendimentoData(atendimentoId, data) {
    atendimentosState.set(atendimentoId, data);
}

export function deleteAtendimentoData(atendimentoId) {
    atendimentosState.delete(atendimentoId);
}

// MANTIDO: Esta função ainda é útil para o painel de CRM.
export const getDefaultContactDetails = (id) => ({
    phone: "+XX X XXXX-XXXX", email: "email@desconhecido.com",
    tags: ["Novo Cliente"], notes: `Cliente ${id} iniciou contato.`
});

// REMOVIDO: 'quickRepliesData' foi removido.
// O seu arquivo `listeners.js` já tem uma função para buscar
// as respostas rápidas do Firestore, então vamos usá-la.


// --- ESTADO DA APLICAÇÃO ---
// MODIFICADO: Começa como nulo, já que não temos um chat '1' falso.
let chatAtivoId = null; 

// Funções "getter" e "setter" para controlar o estado
export function getChatAtivoId() {
    return chatAtivoId;
}

export function setChatAtivoId(id) {
    chatAtivoId = id;
}