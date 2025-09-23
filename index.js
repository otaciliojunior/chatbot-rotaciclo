// index.js CORRIGIDO, ATUALIZADO E REATORADO

// Forçando atualização para deploy - 21/09
// Importa as bibliotecas que instalamos
const express = require('express');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// --- CONFIGURAÇÃO DO CORS ---
app.use(cors());

// --- INFORMAÇÕES DE CONFIGURAÇÃO ---
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// --- INICIALIZAÇÃO DO FIREBASE ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const PORT = process.env.PORT || 3000;

// --- MENSAGENS CENTRALIZADAS DO BOT ---
const botMessages = {
    // --- GERAL ---
    welcome: "Fala, ciclista! Bem-vindo(a) à *Rota Ciclo*! 🚴\n\nEstamos testando nosso novo canal de atendimento automático, que já está bem avançado e preparado pra te ajudar. A ideia é aproximar ainda mais você da nossa loja e criar uma experiência prática e agradável no seu atendimento.\n\nBora começar?",
    invalidOption: "Ops, não entendi essa opção 🤔. Tenta clicar em uma das opções do menu, beleza?",

    // --- MENU PRINCIPAL ---
    mainMenuHeader: "Aqui é a *Loja Rota Ciclo*! Valeu demais por falar com a gente 😉\n\nEscolhe uma das opções abaixo pra eu te ajudar mais rápido:",

    // --- PRODUTOS ---
    askProductCategory: "Show! Quer dar uma olhada em quê?\n\n- Bicicletas 🚲\n- Peças e Acessórios 🔧",
    invalidProductCategory: "Hmm, não saquei. Digita 'Bicicletas' ou 'Peças e Acessórios' que eu entendo 😉.",
    askBikeType: "Boa escolha! 🚴 Temos bikes pra todo tipo de rolê. Qual categoria você procura?",
    invalidBikeType: "Não entendi o tipo de bike 😅. Tenta 'Estrada', 'MTB' ou 'Passeio'.",
    askPartType: "Top! Temos de tudo: câmaras, pneus, capacetes, luvas, roupas e muito mais 🚴‍♂️.\n\nMe fala o que você procura que já mostro opções.",
    searchPart: (searchTerm) => `Beleza, procurando por *${searchTerm}*... 🔎 (Essa função tá chegando em breve!)\n\nSe quiser, digita 'menu' pra voltar.`,
    bikeListHeader: (bikeType) => `Aqui estão as bikes de *${bikeType.toUpperCase()}* que temos agora:\n\n`,
    bikeListItem: (bike) => `🚲 *${bike.nome}*\n💰 Preço: ${bike.preco}\n\n`,
    bikeListFooter: "Curtiu alguma? Me fala o nome que eu te passo mais detalhes. Ou digita 'menu' pra voltar 😉.",

    // --- AGENDAMENTO ---
    askServiceType: "Claro! Qual serviço você quer agendar?",
    correctiveMaintenanceHandoff: "Entendi, manutenção corretiva. Para te ajudar melhor, me descreva com detalhes o problema que sua bike está apresentando. Vou encaminhar seu caso para um de nossos especialistas.",
    invalidServiceType: "Não entendi o serviço 😅. Pode ser 'Revisão' ou 'Manutenção'.",
    listAvailableDays: (serviceType, availableDays) => `Show! Pra *${serviceType}*, temos horários nos dias: ${availableDays}.\n\nQual dia você prefere?`,
    invalidDay: "Esse dia não tá disponível ou foi digitado errado 🤷. Escolhe um dos que te passei, beleza?",
    listAvailableTimes: (day, service, availableTimes) => `Fechado! Na *${day}-feira* temos esses horários para *${service}*:\n\n⏰ ${availableTimes}\n\n👉 Qual te serve melhor?`,
    invalidTime: "Esse horário não rola 😬. Escolhe um dos que eu te mostrei.",
    bookingSuccessRegistered: (service, day, time) => `✅ Agendamento confirmado!\n\nSeu serviço de *${service}* ficou marcado para *${day}-feira* às *${time}*.\n\nValeu por escolher a Rota Ciclo 🚴‍♂️!`,
    bookingSuccessUnregistered: (service, day, time) => `✅ Agendamento feito!\n\nSeu serviço de *${service}* ficou marcado para *${day}-feira* às *${time}*.\n\n⚠️ Não consegui registrar no sistema, então guarda essa mensagem como comprovante.`,

    // --- ATENDIMENTO HUMANO ---
    requestHumanHandoffReason: "Beleza! Pra agilizar, me conta em uma mensagem só qual é a sua dúvida principal.\n\n_(Obs: não consigo entender áudios, só texto 🫱🏽‍🫲🏽)_",
    humanRequestSuccess: "Pronto! Sua solicitação já tá na fila. Um dos nossos vai falar contigo aqui mesmo, só aguarda um pouquinho 😉.",
    humanRequestError: "Deu erro ao registrar sua solicitação 😕. Tenta de novo mais tarde ou chama a gente no (84) 98750-4756",

    // --- INFORMAÇÕES GERAIS ---
    addressAndHours: "📍 *Endereço:* Av. Monsenhor Paiva, nº 565\n🕒 *Horário:* Seg a Sáb – 8h às 17h | Dom – 7h às 12h\n📞 *Telefone:* (84) 98750-4756\n\nPosso te ajudar em mais alguma coisa? 🚲"
};


// --- MEMÓRIA E BASE DE DADOS ---
const userStates = {};
const database = {
    "estrada": [
        { nome: "Caloi Strada Racing", preco: "R$ 7.500,00" },
        { nome: "Specialized Allez", preco: "R$ 9.200,00" }
    ],
    "mtb": [
        { nome: "Trek Marlin 5", preco: "R$ 4.800,00" },
        { nome: "Oggi Big Wheel 7.2", preco: "R$ 5.500,00" }
    ],
    "passeio": [
        { nome: "Caloi Urbam", preco: "R$ 2.100,00" },
        { nome: "Sense Move", preco: "R$ 2.350,00" }
    ],
    "servicos": {
        "revisao": {
            "segunda": ["09:00", "11:00", "14:00"],
            "terca": ["10:00", "15:00"],
            "quarta": ["09:00", "11:00", "14:00", "16:00"]
        },
        "manutencao": {
            "segunda": ["10:00", "16:00"],
            "terca": ["09:00", "11:00", "14:00"],
            "quarta": ["15:00"]
        }
    }
};

// --- FUNÇÕES DE BANCO DE DADOS ---
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
        console.log(`[${userNumber}] SUCESSO! Solicitação de atendimento salva no Firestore!`);
        return true;
    } catch (error) {
        console.error(`[${userNumber}] ERRO CRÍTICO ao salvar solicitação de atendimento no Firestore:`, error);
        return false;
    }
}

// Rota principal para testar se o servidor está no ar
app.get('/', (req, res) => {
    res.send('Chatbot da Loja de Bicicletas está no ar!');
});

// ROTA PARA O PAINEL ENVIAR MENSAGENS
app.post('/api/enviar-mensagem', async (req, res) => {
    const { para, texto } = req.body;
    if (!para || !texto) {
        return res.status(400).json({ error: "Número do destinatário e texto da mensagem são obrigatórios." });
    }
    try {
        await enviarTexto(para, texto);
        res.status(200).json({ success: true, message: "Mensagem enviada com sucesso!" });
    } catch (error) {
        console.error("Falha ao enviar mensagem pelo painel:", error);
        res.status(500).json({ error: "Falha ao enviar mensagem pela API da Meta." });
    }
});

// Rota do Webhook (GET para verificação, POST para receber mensagens)
app.all('/webhook', (req, res) => {
    if (req.method === 'GET') {
        console.log('--- Recebida requisição de VERIFICAÇÃO do Webhook ---');
        if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
            console.log('Token de verificação CORRETO.');
            return res.send(req.query['hub.challenge']);
        }
        console.error('Token de verificação INCORRETO.');
        return res.status(403).send('Erro de verificação');
    }

    if (req.method === 'POST') {
        console.log('--- NOVO EVENTO DO WEBHOOK RECEBIDO (POST) ---');
        const data = req.body;
        try {
            if (data.object === 'whatsapp_business_account' && data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
                const messageData = data.entry[0].changes[0].value.messages[0];
                const fromNumber = messageData.from;
                const userName = data.entry[0].changes[0].value.contacts[0].profile.name;
                let messageBody = '';
                if (messageData.type === 'text') {
                    messageBody = messageData.text.body;
                } else if (messageData.type === 'interactive') {
                    const interactiveType = messageData.interactive.type;
                    if (interactiveType === 'button_reply') {
                        messageBody = messageData.interactive.button_reply.id;
                    } else if (interactiveType === 'list_reply') {
                        messageBody = messageData.interactive.list_reply.title;
                    }
                }
                if (messageBody) {
                    console.log(`Mensagem de [${fromNumber} - ${userName}] para nosso sistema: "${messageBody}"`);
                    processarMensagem(fromNumber, userName, messageBody);
                } else {
                     console.log('Tipo de mensagem não suportada. Ignorando.');
                }
            } else {
                console.log('Evento recebido não é uma mensagem do WhatsApp. Ignorando.');
            }
        } catch (error) {
            console.error('--- ERRO AO PROCESSAR DADOS DO WEBHOOK ---', error);
        }
        return res.status(200).send('OK');
    }
});

// Função principal que gerencia o fluxo da conversa
async function processarMensagem(userNumber, userName, userMessage) { 
    const msg = typeof userMessage === 'string' ? userMessage.toLowerCase().trim() : userMessage;
    
    let currentState = userStates[userNumber]?.state;

    if (!currentState) {
        try {
            const atendimentoRef = db.collection('atendimentos').doc(userNumber);
            const docSnap = await atendimentoRef.get();
            
            if (docSnap.exists && docSnap.data().status === 'em_atendimento') {
                console.log(`[${userNumber}] Estado recuperado do Firestore: HUMAN_HANDOVER`);
                currentState = 'HUMAN_HANDOVER';
                userStates[userNumber] = { state: 'HUMAN_HANDOVER' };
            }
        } catch (error) {
            console.error(`[${userNumber}] Erro ao buscar estado no Firestore:`, error);
        }
    }
    
    currentState = currentState || 'NEW_USER';
    
    console.log(`[${userNumber}] Estado Atual: ${currentState}`);
    console.log(`[${userNumber}] Mensagem Recebida: ${msg}`);

    if (currentState === 'HUMAN_HANDOVER') {
        console.log(`[${userNumber}] Usuário em atendimento humano. Encaminhando mensagem para o histórico.`);
        try {
            const messagesRef = db.collection('atendimentos').doc(userNumber).collection('mensagens');
            await messagesRef.add({
                texto: userMessage,
                origem: 'cliente',
                enviadaEm: Timestamp.now()
            });
            console.log(`[${userNumber}] Mensagem do cliente salva no histórico.`);
        } catch (error) {
            console.error(`[${userNumber}] Erro ao salvar mensagem do cliente no histórico:`, error);
        }
        return;
    }

    if (["menu", "voltar", "cancelar"].includes(msg)) {
        delete userStates[userNumber];
        enviarMenuPrincipalComoLista(userNumber);
        return;
    }
    
    switch (currentState) {
        case 'NEW_USER':
            await enviarTexto(userNumber, botMessages.welcome);
            await new Promise(resolve => setTimeout(resolve, 1500));
            enviarMenuPrincipalComoLista(userNumber);
            break;

        case 'AWAITING_CHOICE':
            if (msg.startsWith("promoções criativas")) {
                enviarTexto(userNumber, "Em breve, nossas melhores promoções estarão aqui! 🎁");
                userStates[userNumber] = { state: 'AWAITING_CHOICE' };
            } else if (msg.startsWith("bicicletas (produtos)")) {
                const botoesBike = [
                    { id: "bike_estrada", title: "Estrada 🛣️" },
                    { id: "bike_mtb", title: "MTB (Trilha) 🌄" },
                    { id: "bike_passeio", title: "Passeio 🌳" }
                ];
                enviarBotoes(userNumber, botMessages.askBikeType, botoesBike);
                userStates[userNumber] = { state: 'AWAITING_BIKE_TYPE' };
            } else if (msg.startsWith("peças e acessórios")) {
                const textoPecas = "Nosso catálogo digital de peças e acessórios está quase pronto! 🚀\n\nEnquanto isso, que tal falar com um de nossos vendedores? Eles podem te mandar fotos e preços do que você precisa agora mesmo.";
                const botoesPecas = [
                    { id: "pecas_atendente", title: "Falar com vendedor" },
                    { id: "pecas_voltar", title: "Voltar ao Menu" }
                ];
                enviarBotoes(userNumber, textoPecas, botoesPecas);
                userStates[userNumber] = { state: 'AWAITING_PART_ACTION' };
            } else if (msg.startsWith("revisão / agendamento")) {
                const botoesServico = [
                    { id: "servico_revisao", title: "Revisão completa 🔧" },
                    { id: "servico_manutencao", title: "Manutenção corretiva ⚙️" }
                ];
                enviarBotoes(userNumber, botMessages.askServiceType, botoesServico);
                userStates[userNumber] = { state: 'AWAITING_SERVICE_TYPE' };
            } else if (msg.startsWith("falar com atendente")) {
                await enviarTexto(userNumber, botMessages.requestHumanHandoffReason);
                userStates[userNumber] = { state: 'AWAITING_HUMAN_REQUEST_REASON' };
            } else {
                enviarTexto(userNumber, botMessages.invalidOption);
                enviarMenuPrincipalComoLista(userNumber);
            }
            break;

        case 'AWAITING_HUMAN_REQUEST_REASON':
            const motivo = userMessage;
            const sucesso = await criarSolicitacaoAtendimento(userNumber, userName, motivo);
            if (sucesso) {
                await enviarTexto(userNumber, botMessages.humanRequestSuccess);
                userStates[userNumber] = { state: 'HUMAN_HANDOVER' };
            } else {
                await enviarTexto(userNumber, botMessages.humanRequestError);
                userStates[userNumber] = { state: 'AWAITING_CHOICE' };
            }
            break;

        case 'AWAITING_BIKE_TYPE':
            let bikeType = null;
            if (msg === 'bike_estrada') bikeType = 'estrada';
            if (msg === 'bike_mtb') bikeType = 'mtb';
            if (msg === 'bike_passeio') bikeType = 'passeio';
        
            if (bikeType && database[bikeType]) {
                let productMessage = botMessages.bikeListHeader(bikeType);
                database[bikeType].forEach(bike => {
                    productMessage += botMessages.bikeListItem(bike);
                });
                productMessage += botMessages.bikeListFooter;
                await enviarTexto(userNumber, productMessage);
                setTimeout(() => {
                    enviarMenuPrincipalComoLista(userNumber);
                }, 2000);
            } else {
                await enviarTexto(userNumber, botMessages.invalidOption);
                const botoesBike = [
                    { id: "bike_estrada", title: "Estrada 🛣️" },
                    { id: "bike_mtb", title: "MTB (Trilha) 🌄" },
                    { id: "bike_passeio", title: "Passeio 🌳" }
                ];
                enviarBotoes(userNumber, botMessages.askBikeType, botoesBike);
            }
            break;

        case 'AWAITING_PART_ACTION':
            if (msg === 'pecas_atendente') {
                await enviarTexto(userNumber, botMessages.requestHumanHandoffReason);
                userStates[userNumber] = { state: 'AWAITING_HUMAN_REQUEST_REASON' };
            } else if (msg === 'pecas_voltar') {
                enviarMenuPrincipalComoLista(userNumber);
            } else {
                enviarTexto(userNumber, botMessages.invalidOption);
                enviarMenuPrincipalComoLista(userNumber);
            }
            break;

        case 'AWAITING_SERVICE_TYPE':
            if (msg === 'servico_revisao') {
                const serviceType = 'revisao';
                const availableDays = Object.keys(database.servicos[serviceType]).join(', ');
                const resposta = botMessages.listAvailableDays(serviceType, availableDays);
                await enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_DAY_CHOICE', service: serviceType };
            } else if (msg === 'servico_manutencao') {
                await enviarTexto(userNumber, botMessages.correctiveMaintenanceHandoff);
                userStates[userNumber] = { state: 'AWAITING_HUMAN_REQUEST_REASON' };
            } else {
                enviarTexto(userNumber, botMessages.invalidOption);
                const botoesServico = [
                    { id: "servico_revisao", title: "Revisão completa 🔧" },
                    { id: "servico_manutencao", title: "Manutenção corretiva ⚙️" }
                ];
                enviarBotoes(userNumber, botMessages.askServiceType, botoesServico);
            }
            break;
            
        case 'AWAITING_DAY_CHOICE':
            const day = msg.split(' ')[0].replace('ç', 'c').replace('á', 'a');
            const service = userStates[userNumber].service;

            if (service && database.servicos[service] && database.servicos[service][day]) {
                const availableTimes = database.servicos[service][day].join(' / ');
                let resposta = botMessages.listAvailableTimes(day, service, availableTimes);
                await enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_TIME_CHOICE', service: service, day: day };
            } else {
                await enviarTexto(userNumber, botMessages.invalidDay);
            }
            break;
            
        case 'AWAITING_TIME_CHOICE':
             const time = msg.replace(':', 'h');
             const chosenService = userStates[userNumber].service;
             const chosenDay = userStates[userNumber].day;

             if (chosenService && chosenDay && database.servicos[chosenService][chosenDay].some(t => time.includes(t.replace(':', 'h')))) {
                const finalTime = database.servicos[chosenService][chosenDay].find(t => time.includes(t.replace(':', 'h')));
                const saved = await salvarAgendamento(userNumber, chosenService, chosenDay, finalTime);
                let resposta = '';
                if (saved) {
                    resposta = botMessages.bookingSuccessRegistered(chosenService, chosenDay, finalTime);
                } else {
                    resposta = botMessages.bookingSuccessUnregistered(chosenService, chosenDay, finalTime);
                }
                await enviarTexto(userNumber, resposta);
                delete userStates[userNumber];
                setTimeout(() => {
                    enviarMenuPrincipalComoLista(userNumber);
                }, 3000);
             } else {
                 await enviarTexto(userNumber, botMessages.invalidTime);
             }
             break;

        default:
            console.log(`Estado desconhecido: ${currentState}. Reiniciando fluxo.`);
            delete userStates[userNumber];
            enviarMenuPrincipalComoLista(userNumber);
            break;
    }
}

function enviarMenuPrincipalComoLista(userNumber) {
    const textoBoasVindas = botMessages.mainMenuHeader;
    
    const menuItens = [
        { id: "menu_promocoes", title: "Promoções Criativas 🎁" },
        { id: "menu_produtos", title: "Bicicletas (Produtos) 🚲" },
        { id: "menu_pecas", title: "Peças e Acessórios 🔧" },
        { id: "menu_agendamento", title: "Revisão / Agendamento ⚙️" },
        { id: "menu_atendente", title: "Falar com Atendente 👨‍🔧" }
    ];
    
    userStates[userNumber] = { state: 'AWAITING_CHOICE' };
    console.log(`[${userNumber}] Estado atualizado para: AWAITING_CHOICE`);
    enviarLista(userNumber, textoBoasVindas, "Menu Principal", menuItens);
}

// --- FUNÇÕES DE ENVIO DE MENSAGEM ---
async function enviarPayloadGenerico(payload) {
    const recipientId = payload.to;
    console.log(`--- TENTANDO ENVIAR MENSAGEM PARA ${recipientId} ---`);
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };
    
    try {
        await axios.post(url, payload, { headers: headers });
        console.log(`--- MENSAGEM ENVIADA COM SUCESSO PARA ${recipientId} ---`);
    } catch (error) {
        console.error('--- ERRO AO ENVIAR MENSAGEM PELA API DA META ---');
        console.error('Payload de envio:', JSON.stringify(payload, null, 2));
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

async function enviarTexto(recipientId, text) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "text",
        text: {
            body: text
        }
    };
    await enviarPayloadGenerico(payload);
}

async function enviarLista(recipientId, bodyText, buttonText, items) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "interactive",
        interactive: {
            type: "list",
            body: {
                text: bodyText
            },
            action: {
                button: buttonText,
                sections: [
                    {
                        title: "Opções Disponíveis",
                        rows: items.map(item => ({
                            id: item.id,
                            title: item.title,
                        }))
                    }
                ]
            }
        }
    };
    await enviarPayloadGenerico(payload);
}

async function enviarBotoes(recipientId, bodyText, buttons) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: bodyText
            },
            action: {
                buttons: buttons.map(btn => ({
                    type: "reply",
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };
    await enviarPayloadGenerico(payload);
}

// --- OUVINTE DO FIRESTORE ---
function iniciarOuvinteDeAtendimentos() {
    const query = db.collection('atendimentos').where('status', '==', 'resolvido');

    query.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
                const atendimento = change.doc.data();
                const userNumber = atendimento.cliente_id;
                
                if (userStates[userNumber] && userStates[userNumber].state === 'HUMAN_HANDOVER') {
                    console.log(`[${userNumber}] Atendimento encerrado pelo painel. Reativando bot.`);
                    delete userStates[userNumber];
                }
            }
        });
    }, err => {
        console.error("Erro no ouvinte do Firestore:", err);
    });
}


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    iniciarOuvinteDeAtendimentos();
    console.log("Ouvinte de atendimentos do Firestore iniciado com sucesso.");
});