// /functions/index.js (VERSÃO CORRIGIDA)

const functions = require("firebase-functions");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");

// Assumindo que 'functions' e 'backend' estão no mesmo nível.
const {enviarTexto} = require("../backend/whatsappClient");
const {updateUserState} = require("../backend/firestoreService");

initializeApp();
const db = getFirestore();

// --- MENSAGENS DO FOLLOW-UP ---
const followUpMessages = {
  feedbackRequest: (userName) => `Olá, ${userName}! Passando pra saber se está ` +
    `tudo certo com a sua bike nova. 😊 Como está sendo a experiência? ` +
    `Seu feedback é muito importante pra gente!`,
  revisionOffer: (userName) => `Fala, ${userName}! Já se passaram 3 meses ` +
    `desde que você pegou sua bike na Rota Ciclo. 🚴‍♂️ \n\nPara garantir ` +
    `que ela continue perfeita, oferecemos uma revisão de rotina. Nela, ` +
    `nossos mecânicos fazem a checagem e o ajuste de freios e marchas ` +
    `para manter sua segurança e o bom desempenho da bike.\n\nGostaria ` +
    `de agendar essa revisão?`,
};

// Agendamos a função para rodar todos os dias às 9:00 da manhã
exports.verificarFollowUpsDiarios = functions.region("southamerica-east1")
    .pubsub.schedule("every day 09:00")
    .timeZone("America/Sao_Paulo")
    .onRun(async (context) => {
      console.log("Iniciando verificação diária de follow-ups...");
      const now = Timestamp.now();
      const followUpsRef = db.collection("followUps");

      const query = followUpsRef
          .where("data_proximo_contato", "<=", now)
          .where("status_atual", "in", [
            "pendente_feedback_1_mes",
            "pendente_revisao_3_meses",
          ]);

      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log("Nenhum follow-up para hoje. Encerrando.");
        return null;
      }

      console.log(`Encontrados ${snapshot.size} follow-ups para processar.`);

      for (const doc of snapshot.docs) {
        const followUp = doc.data();
        const {
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          status_atual: statusAtual,
          data_compra: dataCompra,
        } = followUp;

        try {
          switch (statusAtual) {
            case "pendente_feedback_1_mes": {
              console.log(`Enviando feedback para ${clienteNome} (${clienteId})`);
              await enviarTexto(
                  clienteId,
                  followUpMessages.feedbackRequest(clienteNome),
              );
              await updateUserState(clienteId,
                  {state: "AGUARDANDO_FEEDBACK", followUpId: doc.id},
              );

              const dataProximaRevisao = new Timestamp(
                  dataCompra.seconds + (90 * 24 * 60 * 60),
                  dataCompra.nanoseconds,
              );
              await doc.ref.update({
                status_atual: "feedback_enviado",
                data_proximo_contato: dataProximaRevisao,
              });
              break;
            }
            case "pendente_revisao_3_meses": {
              console.log(`Enviando revisão para ${clienteNome} (${clienteId})`);
              await enviarTexto(
                  clienteId,
                  followUpMessages.revisionOffer(clienteNome),
              );
              await updateUserState(clienteId,
                  {state: "AGUARDANDO_RESPOSTA_REVISAO", followUpId: doc.id},
              );
              await doc.ref.update({
                status_atual: "finalizado",
              });
              break;
            }
          }
        } catch (error) {
          console.error(
              `Falha ao processar follow-up ${doc.id} para ${clienteId}:`,
              error,
          );
        }
      }
      return null;
    });