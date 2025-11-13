// /functions/index.js (VERSÃO FINAL v2.5.1 - Forçando deploy)

// --- Carrega o .env ANTES de tudo ---
require('dotenv').config();

// --- Imports do Firebase (Sintaxe V2) ---
const { https, setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// --- Imports para o Bot Webhook (Express) ---
const express = require('express');
const cors = require('cors');

// --- Imports do seu código na pasta 'backend' ---
const { VERIFY_TOKEN } = require('backend/config'); 
const { processarMensagem } = require('backend/botLogic');
const { executarVerificacaoFollowUps } = require('backend/followUpService');

// Define a região globalmente
setGlobalOptions({ region: 'us-central1' });

// ==========================================================
// PARTE 1: O BOT WEBHOOK
// ==========================================================
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota /webhook
app.all('/webhook', (req, res) => {
    if (req.method === 'GET') {
        if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
            return res.send(req.query['hub.challenge']);
        }
        return res.status(403).send('Erro de verificação');
    }
    if (req.method === 'POST') {
        try {
            const value = req.body.entry?.[0]?.changes?.[0]?.value;
            if (value?.messages && value?.contacts) {
                const messageData = value.messages[0];
                const contact = value.contacts[0];
                const fromNumber = messageData.from;
                const userName = contact.profile.name;
                const waId = contact.wa_id;
                let messageBody = '';
                if (messageData.type === 'text') {
                    messageBody = messageData.text.body;
                } else if (messageData.type === 'interactive') {
                    const interactiveType = messageData.interactive.type;
                    messageBody = interactiveType === 'button_reply'
                        ? messageData.interactive.button_reply.id
                        : messageData.interactive.list_reply.title;
                }
                if (messageBody) {
                    const referralData = messageData.context && messageData.context.referral ? messageData.context.referral : null;
                    processarMensagem(fromNumber, userName, messageBody, waId, referralData);
                } 
            } 
        } catch (error) {
            console.error('--- ERRO AO PROCESSAR DADOS DO WEBHOOK ---', error);
        }
        res.sendStatus(200);
    }
});

exports['rotaciclo-bot-webhook'] = https.onRequest(app);


// ==========================================================
// PARTE 2: O ROBÔ DE FOLLOW-UP
// ==========================================================
exports.verificarFollowUpsDiarios = onSchedule({
    schedule: "every day 09:00",
    timeZone: "America/Sao_Paulo", 
}, async (event) => {
    console.log("Iniciando verificação diária de follow-ups...");
    try {
        await executarVerificacaoFollowUps();
        console.log("Verificação de follow-ups diários concluída com sucesso.");
    } catch (error) {
        console.error(`Falha ao executar 'executarVerificacaoFollowUps':`, error);
    }
    return null;
});