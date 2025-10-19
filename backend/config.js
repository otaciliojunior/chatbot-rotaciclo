// /backend/config.js (VERSÃO FINAL E CORRIGIDA)

const functions = require("firebase-functions");
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;
let serviceAccount;

// Verifica se o código está rodando no ambiente do Firebase (nuvem ou emulador)
if (process.env.FUNCTIONS_EMULATOR || Object.keys(functions.config()).length) {
  // --- AMBIENTE DA NUVEM ---
  // O Firebase Admin se inicializa sozinho na nuvem, não precisamos da chave.
  initializeApp();
  db = getFirestore();
  
  // Exporta as variáveis a partir da configuração segura do Firebase
  module.exports = {
    db,
    META_ACCESS_TOKEN: functions.config().whatsapp.token,
    VERIFY_TOKEN: functions.config().meta.verify_token,
    PHONE_NUMBER_ID: functions.config().whatsapp.phone_id,
    PORT: process.env.PORT, // Na nuvem, a porta é gerenciada pelo ambiente
    // --- ADIÇÃO PIPEDRIVE ---
    pipedriveApiToken: functions.config().pipedrive.token,
    pipedriveDomain: functions.config().pipedrive.domain,
  };

} else {
  // --- AMBIENTE LOCAL (SUA MÁQUINA) ---
  require('dotenv').config();

  // Carrega as credenciais do Firebase a partir do arquivo .env local
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore();
  
  // Exporta as variáveis a partir do arquivo .env
  module.exports = {
    db,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    VERIFY_TOKEN: process.env.VERIFY_TOKEN,
    PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
    PORT: process.env.PORT || 3000,
    // --- ADIÇÃO PIPEDRIVE ---
    pipedriveApiToken: process.env.PIPEDRIVE_API_TOKEN,
    pipedriveDomain: process.env.PIPEDRIVE_DOMAIN,
  };
}