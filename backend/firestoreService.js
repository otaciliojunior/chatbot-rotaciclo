// /backend/firestoreService.js
const { db } = require('./config');
const { Timestamp } = require('firebase-admin/firestore');

// A "memória" do bot foi removida daqui e movida para o Firestore.

async function getUserState(userNumber) {
    try {
        const sessionRef = db.collection('sessoes').doc(userNumber);
        const doc = await sessionRef.get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao buscar estado no Firestore:`, error);
        return null;
    }
}

async function updateUserState(userNumber, stateData) {
    try {
        const sessionRef = db.collection('sessoes').doc(userNumber);
        await sessionRef.set({ ...stateData, modificadoEm: Timestamp.now() });
        return true;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao atualizar estado no Firestore:`, error);
        return false;
    }
}

async function deleteUserState(userNumber) {
    try {
        const sessionRef = db.collection('sessoes').doc(userNumber);
        await sessionRef.delete();
        return true;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao deletar estado no Firestore:`, error);
        return false;
    }
}

async function salvarAgendamento(userNumber, service, day, time) {
    try {
        const agendamentoRef = db.collection('agendamentos').doc();
        await agendamentoRef.set({
            cliente: userNumber,
            servico: service,
            dia: day,
            horario: time,
            status: 'pendente',
            criadoEm: new Date()
        });
        console.log(`[${userNumber}] Agendamento salvo com sucesso no Firestore! ID: ${agendamentoRef.id}`);
        return true;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao salvar agendamento no Firestore:`, error);
        return false;
    }
}

async function criarSolicitacaoAtendimento(userNumber, userName, motivo) {
    console.log(`[${userNumber}] INICIANDO A FUNÇÃO criarSolicitacaoAtendimento...`);
    try {
        const atendimentoRef = db.collection('atendimentos').doc(userNumber);
        const dadosParaSalvar = {
            cliente_id: userNumber,
            cliente_nome: userName,
            status: 'aguardando',
            solicitadoEm: new Date(),
            motivo: motivo
        };
        console.log(`[${userNumber}] Tentando salvar os seguintes dados:`, JSON.stringify(dadosParaSalvar, null, 2));
        await atendimentoRef.set(dadosParaSalvar);
        await updateUserState(userNumber, { state: 'HUMAN_HANDOVER' }); // Garante que o estado seja salvo
        console.log(`[${userNumber}] SUCESSO! Solicitação de atendimento salva no Firestore!`);
        return true;
    } catch (error) {
        console.error(`[${userNumber}] ERRO CRÍTICO ao salvar solicitação de atendimento no Firestore:`, error);
        return false;
    }
}

function iniciarOuvinteDeAtendimentos() {
    const query = db.collection('atendimentos').where('status', '==', 'resolvido');

    query.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
                const atendimento = change.doc.data();
                const userNumber = atendimento.cliente_id;
                
                console.log(`[${userNumber}] Atendimento encerrado pelo painel. Reativando bot.`);
                deleteUserState(userNumber); // Limpa a sessão do usuário
            }
        });
    }, err => {
        console.error("Erro no ouvinte do Firestore:", err);
    });
}

module.exports = {
    db,
    getUserState,
    updateUserState,
    deleteUserState,
    salvarAgendamento,
    criarSolicitacaoAtendimento,
    iniciarOuvinteDeAtendimentos
};