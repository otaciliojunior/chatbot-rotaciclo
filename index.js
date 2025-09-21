// Importa as bibliotecas que instalamos
const express = require('express');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
app.use(express.json()); // Permite que o express entenda o JSON enviado pela Meta

// --- INFORMAÇÕES DE CONFIGURAÇÃO ---
// Buscando as variáveis do arquivo .env ou do ambiente do Render
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// --- INICIALIZAÇÃO DO FIREBASE ---
// Carrega a chave de serviço do Firebase a partir das variáveis de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();


// Define a porta em que o servidor vai rodar
const PORT = process.env.PORT || 3000;

// --- MEMÓRIA E BASE DE DADOS ---

// Objeto para armazenar o estado da conversa de cada usuário
const userStates = {};

// Simulação de uma base de dados de produtos e serviços
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

// --- NOVA FUNÇÃO PARA SALVAR AGENDAMENTOS ---
async function salvarAgendamento(userNumber, service, day, time) {
    try {
        const agendamentoRef = db.collection('agendamentos').doc(); // Cria um novo documento com ID automático
        await agendamentoRef.set({
            cliente: userNumber,
            servico: service,
            dia: day,
            horario: time,
            status: 'pendente', // Status inicial do agendamento
            criadoEm: new Date()
        });
        console.log(`[${userNumber}] Agendamento salvo com sucesso no Firestore! ID: ${agendamentoRef.id}`);
        return true;
    } catch (error) {
        console.error(`[${userNumber}] Erro ao salvar agendamento no Firestore:`, error);
        return false;
    }
}


// Rota principal para testar se o servidor está no ar
app.get('/', (req, res) => {
    res.send('Chatbot da Loja de Bicicletas está no ar!');
});

// Rota do Webhook (GET para verificação, POST para receber mensagens)
app.all('/webhook', (req, res) => {
    if (req.method === 'GET') {
        console.log('--- Recebida requisição de VERIFICAÇÃO do Webhook ---');
        // Processo de verificação da Meta
        if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
            console.log('Token de verificação CORRETO.');
            return res.send(req.query['hub.challenge']);
        }
        console.error('Token de verificação INCORRETO.');
        return res.status(403).send('Erro de verificação');
    }

    if (req.method === 'POST') {
        console.log('--- NOVO EVENTO DO WEBHOOK RECEBIDO (POST) ---');
        console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
        
        // Processa as mensagens recebidas do WhatsApp
        const data = req.body;
        try {
            // Garante que a estrutura recebida é de uma mensagem do WhatsApp
            if (data.object === 'whatsapp_business_account' && data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
                const messageData = data.entry[0].changes[0].value.messages[0];
                const fromNumber = messageData.from;

                // Lida tanto com mensagens de texto quanto com cliques em botões
                let messageBody = '';
                if (messageData.type === 'text') {
                    messageBody = messageData.text.body;
                } else if (messageData.type === 'interactive' && messageData.interactive.type === 'button_reply') {
                    messageBody = messageData.interactive.button_reply.title;
                }

                if (messageBody) {
                    console.log(`Mensagem de [${fromNumber}] para nosso sistema: "${messageBody}"`);
                    // --- AQUI ENTRA A LÓGICA DO SEU FLUXO ---
                    processarMensagem(fromNumber, messageBody);
                } else {
                     console.log('Tipo de mensagem interativa não suportada (ex: lista). Ignorando.');
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

// Função principal que gerencia o fluxo da conversa (ATUALIZADA)
async function processarMensagem(userNumber, userMessage) { // Adicionado async
    const msg = userMessage.toLowerCase().trim();

    // Obtém o estado atual do usuário ou define como 'NEW_USER' se for a primeira vez
    const currentState = userStates[userNumber]?.state || 'NEW_USER';
    console.log(`[${userNumber}] Estado Atual: ${currentState}`);
    console.log(`[${userNumber}] Mensagem Recebida: ${msg}`);

    // Se a qualquer momento o usuário digitar 'menu', 'voltar' ou 'cancelar', reinicia o fluxo
    if (["menu", "voltar", "cancelar"].includes(msg)) {
        delete userStates[userNumber];
        enviarMenuPrincipal(userNumber);
        return;
    }
    
    // Lógica baseada no estado atual
    switch (currentState) {
        case 'NEW_USER':
            const welcomeMessage = "Olá! 👋 Bem-vindo(a) à *Rota Ciclo*!\n\nEstamos inaugurando nosso novo canal de atendimento automático para te ajudar de forma mais rápida e prática. Por aqui, você já consegue resolver muita coisa!";
            enviarTexto(userNumber, welcomeMessage);
            setTimeout(() => {
                enviarMenuPrincipal(userNumber);
            }, 1500);
            break;

        case 'AWAITING_CHOICE':
            if (msg.startsWith("ver produtos")) {
                const resposta = "Legal! O que você gostaria de ver?\n\n- Bicicletas\n- Peças e Acessórios";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_PRODUCT_CATEGORY' };
            } else if (msg.startsWith("agendar manutenção")) {
                const resposta = "Claro! Para qual serviço você gostaria de agendar um horário?\n\n- Revisão completa\n- Manutenção corretiva";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_SERVICE_TYPE' };
            } else if (msg.startsWith("falar com atendente")) {
                const resposta = "Entendido. Vou te transferir para um de nossos atendentes. Por favor, aguarde um momento.";
                enviarTexto(userNumber, resposta);
                // Aqui entraria a lógica para notificar a equipe
                delete userStates[userNumber];
            } else {
                enviarTexto(userNumber, "Opção inválida. Por favor, clique em um dos botões do menu.");
                enviarMenuPrincipal(userNumber);
            }
            break;

        case 'AWAITING_PRODUCT_CATEGORY':
            if (msg.includes('bicicletas')) {
                const resposta = "Ótima escolha! 🚴 Temos bicicletas para:\n\n- Estrada\n- MTB (Trilha)\n- Passeio\n\n👉 Me diga qual tipo você procura e já envio algumas opções disponíveis.";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_BIKE_TYPE' };
            } else if (msg.includes('peças') || msg.includes('acessórios')) {
                const resposta = "Legal! Temos câmaras, pneus, capacetes, luvas, roupas e muito mais 🚴.\n\n👉 Digite o que você procura, que já te mostro opções disponíveis.";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_PART_TYPE' };
            } else {
                 enviarTexto(userNumber, "Não entendi. Por favor, diga 'Bicicletas' ou 'Peças e Acessórios'.");
            }
            break;

        case 'AWAITING_BIKE_TYPE':
            let bikeType = null;
            if (msg.includes('estrada')) bikeType = 'estrada';
            if (msg.includes('mtb') || msg.includes('trilha')) bikeType = 'mtb';
            if (msg.includes('passeio') || msg.includes('urbana')) bikeType = 'passeio';

            if (bikeType && database[bikeType]) {
                let productMessage = `Aqui estão as opções para bicicletas de *${bikeType.toUpperCase()}*:\n\n`;
                database[bikeType].forEach(bike => {
                    productMessage += `🚲 *${bike.nome}*\n   Preço: ${bike.preco}\n\n`;
                });
                productMessage += "Gostou de alguma? Me diga o nome que te dou mais detalhes. Ou digite 'menu' para voltar.";
                enviarTexto(userNumber, productMessage);
                userStates[userNumber] = { state: 'AWAITING_CHOICE' };
            } else {
                enviarTexto(userNumber, "Não entendi o tipo de bicicleta. Por favor, diga 'Estrada', 'MTB' ou 'Passeio'.");
            }
            break;

        case 'AWAITING_PART_TYPE':
            enviarTexto(userNumber, `Ok, buscando por "${userMessage}"... (Esta funcionalidade será implementada em breve!)\n\nDigite 'menu' para voltar.`);
            userStates[userNumber] = { state: 'AWAITING_CHOICE' };
            break;

        case 'AWAITING_SERVICE_TYPE':
            let serviceType = null;
            if (msg.includes('revisão')) serviceType = 'revisao';
            if (msg.includes('manutenção')) serviceType = 'manutencao';

            if (serviceType) {
                const availableDays = Object.keys(database.servicos[serviceType]).join(', ');
                let resposta = `Perfeito! Para *${serviceType}*, temos horários disponíveis nos seguintes dias: ${availableDays}.\n\nQual dia você prefere?`;
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_DAY_CHOICE', service: serviceType };
            } else {
                enviarTexto(userNumber, "Não entendi o serviço. Por favor, diga 'Revisão' ou 'Manutenção'.");
            }
            break;
            
        case 'AWAITING_DAY_CHOICE':
            const day = msg.split(' ')[0].replace('ç', 'c').replace('á', 'a');
            const service = userStates[userNumber].service;

            if (service && database.servicos[service] && database.servicos[service][day]) {
                const availableTimes = database.servicos[service][day].join(' / ');
                let resposta = `Ótimo! Na *${day}-feira*, temos os seguintes horários para *${service}*:\n\n⏰ ${availableTimes}\n\nQual horário você gostaria de agendar?`;
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_TIME_CHOICE', service: service, day: day };
            } else {
                enviarTexto(userNumber, "Não temos horários para este dia ou o dia foi digitado incorretamente. Por favor, escolha um dos dias disponíveis que informei.");
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
                    resposta = `✅ Agendamento confirmado e registrado!\n\nSeu serviço de *${chosenService}* está marcado para *${chosenDay}-feira* às *${finalTime}*.\n\nObrigado por escolher a Rota Ciclo!`;
                } else {
                    resposta = `✅ Agendamento confirmado!\n\nSeu serviço de *${chosenService}* está marcado para *${chosenDay}-feira* às *${finalTime}*.\n\n(Não foi possível registrar no nosso sistema. Por favor, guarde esta mensagem como comprovante).`;
                }
                
                enviarTexto(userNumber, resposta);
                delete userStates[userNumber];
                setTimeout(() => {
                    enviarMenuPrincipal(userNumber);
                }, 3000);
             } else {
                 enviarTexto(userNumber, "Desculpe, este horário não está disponível ou foi digitado incorretamente. Por favor, escolha um dos horários que listei.");
             }
             break;

        default:
            console.log(`Estado desconhecido: ${currentState}. Reiniciando fluxo.`);
            delete userStates[userNumber];
            enviarMenuPrincipal(userNumber);
            break;
    }
}

// Função de menu principal atualizada para 3 botões
function enviarMenuPrincipal(userNumber) {
    const textoBoasVindas = "Olá 🚴, tudo bem?\n\nAqui é a Loja *Rota Ciclo*! Obrigado pelo seu contato 🙌\n\nEscolha uma opção para facilitar seu atendimento:";
    
    const botoesDoMenu = [
        "Ver Produtos 🛍️",
        "Agendar Manutenção ⚙️",
        "Falar com Atendente 👨‍🔧"
    ];
    
    userStates[userNumber] = { state: 'AWAITING_CHOICE' };
    console.log(`[${userNumber}] Estado atualizado para: AWAITING_CHOICE`);

    enviarBotoes(userNumber, textoBoasVindas, botoesDoMenu);
}


// --- FUNÇÕES DE ENVIO DE MENSAGEM ---

async function enviarTexto(recipientId, text) {
    console.log(`--- TENTANDO ENVIAR RESPOSTA PARA ${recipientId} ---`);
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "text",
        text: {
            body: text
        }
    };
    console.log('Payload de envio:', JSON.stringify(payload, null, 2));

    try {
        await axios.post(url, payload, { headers: headers });
        console.log(`--- MENSAGEM ENVIADA COM SUCESSO PARA ${recipientId} ---`);
    } catch (error) {
        console.error('--- ERRO AO ENVIAR MENSAGEM PELA API DA META ---');
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

async function enviarBotoes(recipientId, text, buttons) {
    console.log(`--- TENTANDO ENVIAR BOTÕES PARA ${recipientId} ---`);
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: text
            },
            action: {
                buttons: buttons.map((btn, index) => ({
                    type: "reply",
                    reply: {
                        id: `btn_${index + 1}`,
                        title: btn
                    }
                }))
            }
        }
    };
    console.log('Payload de envio:', JSON.stringify(payload, null, 2));

    try {
        await axios.post(url, payload, { headers: headers });
        console.log(`--- BOTÕES ENVIADOS COM SUCESSO PARA ${recipientId} ---`);
    } catch (error) {
        console.error('--- ERRO AO ENVIAR BOTÕES PELA API DA META ---');
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});