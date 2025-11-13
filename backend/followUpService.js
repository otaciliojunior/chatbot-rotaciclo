// /backend/followUpService.js
const { Timestamp } = require('firebase-admin/firestore');
// Importamos os serviços que já existem no seu projeto
const { db } = require('./firestoreService');
const { enviarTexto } = require('./whatsappClient');

// --- MENSAGENS DE FOLLOW-UP ---
// (Você pode mudar essas mensagens como quiser)

const mensagemFollowUp1 = (nomeCliente, infoCompra) => {
    // Ex: "Olá, Otacílio! ... sua Bike Oggi 7.2 Azul!"
    return `Olá, ${nomeCliente}! Aqui é da Rota Ciclo 🚴🏼
Passando só pra saber como está sendo a experiência com a sua ${infoCompra}! 
Tudo certo com ela? Se precisar de qualquer dica ou ajuda, é só chamar!`;
};

const mensagemFollowUp2 = (nomeCliente, infoCompra) => {
    // Ex: "Fala, Otacílio! ... desde que você pegou a sua Bike Oggi 7.2 Azul..."
    return `Fala, ${nomeCliente}! Já se passaram alguns meses desde que você pegou a sua ${infoCompra} com a gente! 
Geralmente, esse é o momento ideal pra uma primeira revisão, pra garantir que ela continue 100%.
Quando quiser trazer ela pra gente dar uma olhada, é só responder "Agendar" aqui que eu te mostro os horários!
Abraço da equipe Rota Ciclo!`;
};


// --- FUNÇÃO PRINCIPAL DO ROBÔ ---

async function executarVerificacaoFollowUps() {
    console.log('--- Iniciando verificação de follow-ups ---');
    const agora = new Date();
    
    // 1. Busca todos os follow-ups que ainda estão ativos
    const followUpsRef = db.collection('followUps');
    const snapshot = await followUpsRef.where('status', '==', 'ativo').get();

    if (snapshot.empty) {
        console.log('Nenhum follow-up ativo encontrado.');
        return null;
    }

    // 2. Processa cada um
    for (const doc of snapshot.docs) {
        const id = doc.id;
        const data = doc.data();

        // Converte a data da compra do Firestore para um objeto Date
        const dataCompra = data.dataCompra.toDate();

        try {
            // --- VERIFICA O FOLLOW-UP 1 (PÓS-VENDA) ---
            if (!data.followUp1_enviado) {
                const diasParaMsg1 = data.diasFollowUp1 || 10;
                const dataMsg1 = new Date(dataCompra.getTime());
                dataMsg1.setDate(dataMsg1.getDate() + diasParaMsg1);

                // Compara apenas a data (dia, mês, ano), ignorando a hora
                if (agora.toDateString() === dataMsg1.toDateString()) {
                    console.log(`Enviando follow-up 1 (Pós-venda) para ${data.nomeCliente} (${id})`);
                    const msg = mensagemFollowUp1(data.nomeCliente, data.infoCompra);
                    await enviarTexto(data.telefoneCliente, msg);
                    // Marca como enviado
                    await doc.ref.update({ followUp1_enviado: true });
                }
            }

            // --- VERIFICA O FOLLOW-UP 2 (REVISÃO) ---
            if (!data.followUp2_enviado) {
                const diasParaMsg2 = data.diasFollowUp2 || 90;
                const dataMsg2 = new Date(dataCompra.getTime());
                dataMsg2.setDate(dataMsg2.getDate() + diasParaMsg2);

                if (agora.toDateString() === dataMsg2.toDateString()) {
                    console.log(`Enviando follow-up 2 (Revisão) para ${data.nomeCliente} (${id})`);
                    const msg = mensagemFollowUp2(data.nomeCliente, data.infoCompra);
                    await enviarTexto(data.telefoneCliente, msg);
                    // Marca como enviado e conclui o follow-up
                    await doc.ref.update({ 
                        followUp2_enviado: true,
                        status: 'concluido' 
                    });
                }
            }

        } catch (error) {
            console.error(`Erro ao processar follow-up ${id} para ${data.nomeCliente}:`, error.message);
            // Podemos marcar como erro para não tentar de novo
            await doc.ref.update({ status: 'erro' });
        }
    }
    console.log('--- Verificação de follow-ups concluída ---');
    return null;
}


// Exporta a função para o index.js
module.exports = { executarVerificacaoFollowUps };