const admin = require('firebase-admin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { SERVICE_ACCOUNT_KEY_JSON } = require('./config');

let db;

try {
    if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
} catch (e) {
    console.error("ERRO CRÍTICO ao inicializar Firebase Admin:", e);
    console.error("Verifique se a variável SERVICE_ACCOUNT_KEY_JSON está correta no .env");
}

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
        await sessionRef.set({ ...stateData, modificadoEm: Timestamp.now() }, { merge: true });
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
            criadoEm: Timestamp.now()
        });
        console.log(`[${userNumber}] Agendamento salvo com sucesso no Firestore! ID: ${agendamentoRef.id}`);
        return true;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao salvar agendamento no Firestore:`, error);
        return false;
    }
}

async function criarSolicitacaoAtendimento(userNumber, userName, motivo) {
    try {
        const atendimentoRef = db.collection('atendimentos').doc(userNumber);
        const dadosParaSalvar = {
            cliente_id: userNumber,
            cliente_nome: userName,
            status: 'aguardando',
            solicitadoEm: Timestamp.now(),
            motivo: motivo
        };
        await atendimentoRef.set(dadosParaSalvar);
        await updateUserState(userNumber, { state: 'HUMAN_HANDOVER' }); 
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
                deleteUserState(userNumber); 
            }
        });
    }, err => {
        console.error("Erro no ouvinte do Firestore:", err);
    });
}

async function getOperadorByEmail(email) {
    const query = db.collection('operadores').where('email', '==', email.toLowerCase()).limit(1);
    const snapshot = await query.get();
    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
}

async function getOperadorById(uid) {
    const docRef = db.collection('operadores').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
}

async function updateOperadorPassword(uid, newPasswordHash) {
    const docRef = db.collection('operadores').doc(uid);
    await docRef.update({
        passwordHash: newPasswordHash
    });
    return true;
}

async function getRespostasRapidas() {
    const snapshot = await db.collection('respostasRapidas').orderBy('shortcut').get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createRespostaRapida(shortcut, text) {
    const docRef = db.collection('respostasRapidas').doc();
    const newResposta = {
        id: docRef.id,
        shortcut: shortcut,
        text: text,
        criadaEm: FieldValue.serverTimestamp()
    };
    await docRef.set(newResposta);
    return newResposta;
}

async function updateRespostaRapida(id, shortcut, text) {
    const docRef = db.collection('respostasRapidas').doc(id);
    await docRef.update({
        shortcut: shortcut,
        text: text,
        modificadaEm: FieldValue.serverTimestamp()
    });
    return { id, shortcut, text };
}

async function deleteRespostaRapida(id) {
    const docRef = db.collection('respostasRapidas').doc(id);
    await docRef.delete();
    return true;
}

module.exports = {
    db, 
    FieldValue,
    Timestamp,
    getUserState,
    updateUserState,
    deleteUserState,
    salvarAgendamento,
    criarSolicitacaoAtendimento,
    iniciarOuvinteDeAtendimentos,
    getOperadorByEmail,
    getOperadorById,
    updateOperadorPassword,
    getRespostasRapidas,
    createRespostaRapida,
    updateRespostaRapida,
    deleteRespostaRapida
};