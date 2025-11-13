// /backend/config.js
require('dotenv').config(); // <-- ADICIONE ESTA LINHA NO TOPO

module.exports = {
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  PIPEDRIVE_API_TOKEN: process.env.PIPEDRIVE_API_TOKEN,
  PIPEDRIVE_DOMAIN: process.env.PIPEDRIVE_DOMAIN,
  PORT: process.env.APP_PORT || 3000,
  
  // Exportamos a chave para o firestoreService usar
  SERVICE_ACCOUNT_KEY_JSON: process.env.SERVICE_ACCOUNT_KEY_JSON
};