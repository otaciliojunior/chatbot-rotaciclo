// Forçando atualização para deploy - 21/09
// Importa as bibliotecas que instalamos
const express = require('express');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const cors = require('cors'); // <-- NOVA ADIÇÃO
require('dotenv').config();

const app = express();
app.use(express.json());

// --- CONFIGURAÇÃO DO CORS (NOVA ADIÇÃO) ---
// Isso permitirá que seu painel (rodando em qualquer lugar) se comunique com o servidor.
// Para mais segurança no futuro, podemos restringir para aceitar apenas o domínio do seu painel.
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

async function criarSolicitacaoAtendimento(userNumber, userName) {
    console.log(`[${userNumber}] INICIANDO A FUNÇÃO criarSolicitacaoAtendimento...`);
    try {
        const atendimentoRef = db.collection('atendimentos').doc(userNumber);
        const dadosParaSalvar = {
            cliente_id: userNumber,
            cliente_nome: userName,
            status: 'aguardando',
            solicitadoEm: new Date()
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
                        messageBody = messageData.interactive.button_reply.title;
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
    const msg = userMessage.toLowerCase().trim();
    const currentState = userStates[userNumber]?.state || 'NEW_USER';
    console.log(`[${userNumber}] Estado Atual: ${currentState}`);
    console.log(`[${userNumber}] Mensagem Recebida: ${msg}`);

    if (currentState === 'HUMAN_HANDOVER') {
        console.log(`[${userNumber}] Usuário em atendimento humano. Bot ignorando a mensagem.`);
        return;
    }

    if (["menu", "voltar", "cancelar"].includes(msg)) {
        delete userStates[userNumber];
        enviarMenuPrincipalComoLista(userNumber);
        return;
    }
    
    switch (currentState) {
        case 'NEW_USER':
            const welcomeMessage = "Olá! 👋 Bem-vindo(a) à *Rota Ciclo*!\n\nEstamos inaugurando nosso novo canal de atendimento automático para te ajudar de forma mais rápida e prática. Por aqui, você já consegue resolver muita coisa!";
            await enviarTexto(userNumber, welcomeMessage);
            await new Promise(resolve => setTimeout(resolve, 1500));
            enviarMenuPrincipalComoLista(userNumber);
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
            } else if (msg.startsWith("endereço e horário")) {
               const resposta = "📍 *Endereço:* Av. Mosenhor Paiva, nº 565\n🕒 *Horário:* Segunda a Sábado – 8h às 17h | Domingo – 7h às 12h\n📞 *Telefone:* (84) 98750-4756\n\nPosso te ajudar com algo mais?";
                enviarTexto(userNumber, resposta);
                enviarMenuPrincipalComoLista(userNumber);
            } else if (msg.startsWith("falar com atendente")) {
                const resposta = "Entendido. Sua solicitação foi registrada em nossa fila. Em breve um de nossos especialistas entrará em contato por aqui mesmo para continuar o atendimento. Por favor, aguarde.";
                await enviarTexto(userNumber, resposta);
                await criarSolicitacaoAtendimento(userNumber, userName);
                userStates[userNumber] = { state: 'HUMAN_HANDOVER' };
            } else {
                enviarTexto(userNumber, "Opção inválida. Por favor, clique em uma das opções do menu.");
                enviarMenuPrincipalComoLista(userNumber);
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
                    enviarMenuPrincipalComoLista(userNumber);
                }, 3000);
             } else {
                 enviarTexto(userNumber, "Desculpe, este horário não está disponível ou foi digitado incorretamente. Por favor, escolha um dos horários que listei.");
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
    const textoBoasVindas = "Olá 🚴, tudo bem?\n\nAqui é a Loja *Rota Ciclo*! Obrigado pelo seu contato 🙌\n\nEscolha uma opção abaixo para facilitar seu atendimento:";
    
    const menuItens = [
        { id: "menu_produtos", title: "Ver Produtos 🛍️" },
        { id: "menu_agendar", title: "Agendar Manutenção ⚙️" },
        { id: "menu_atendente", title: "Falar com Atendente 👨‍🔧" },
        { id: "menu_endereco", title: "Endereço e Horário 🕒" }
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

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});