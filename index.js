// Importa as bibliotecas que instalamos
const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
app.use(express.json()); // Permite que o express entenda o JSON enviado pela Meta

// --- INFORMAÇÕES DE CONFIGURAÇÃO ---
// Buscando as variáveis do arquivo .env ou do ambiente do Render
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Define a porta em que o servidor vai rodar
const PORT = process.env.PORT || 3000;

// --- MEMÓRIA E BASE DE DADOS ---

// Objeto para armazenar o estado da conversa de cada usuário
const userStates = {};

// Simulação de uma base de dados de produtos
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
    ]
};

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
function processarMensagem(userNumber, userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Obtém o estado atual do usuário ou define como 'NEW_USER' se for a primeira vez
    const currentState = userStates[userNumber]?.state || 'NEW_USER';
    console.log(`[${userNumber}] Estado Atual: ${currentState}`);
    console.log(`[${userNumber}] Mensagem Recebida: ${msg}`);

    // Se a qualquer momento o usuário digitar 'menu', 'voltar' ou 'cancelar', reinicia o fluxo
    if (["menu", "voltar", "cancelar"].includes(msg)) {
        userStates[userNumber] = { state: 'AWAITING_CHOICE' }; // Volta ao estado de aguardar escolha
        enviarMenuPrincipal(userNumber);
        return;
    }
    
    // Lógica baseada no estado atual
    switch (currentState) {
        case 'NEW_USER':
            // Envia a mensagem de boas-vindas especial e depois o menu
            const welcomeMessage = "Olá! 👋 Bem-vindo(a) à *Rota Ciclo*!\n\nEstamos inaugurando nosso novo canal de atendimento automático para te ajudar de forma mais rápida e prática. Por aqui, você já consegue resolver muita coisa!";
            enviarTexto(userNumber, welcomeMessage);
            // Espera um pouquinho para as mensagens não chegarem coladas
            setTimeout(() => {
                enviarMenuPrincipal(userNumber);
            }, 1500); // 1.5 segundos
            break;

        case 'AWAITING_CHOICE':
            // Após receber o menu, o bot aguarda uma escolha
            if (msg.startsWith("comprar bicicleta")) {
                console.log('Condição atendida: Opção Comprar Bicicleta.');
                const resposta = "Ótima escolha! 🚴 Temos bicicletas para:\n\n- Estrada\n- MTB (Trilha)\n- Passeio\n\n👉 Me diga qual tipo você procura e já envio algumas opções disponíveis.";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_BIKE_TYPE' }; // Atualiza o estado
            } else if (msg.startsWith("peças e acessórios")) {
                console.log('Condição atendida: Opção Peças e Acessórios.');
                const resposta = "Legal! Temos câmaras, pneus, capacetes, luvas, roupas e muito mais 🚴.\n\n👉 Digite o que você procura, que já te mostro opções disponíveis.";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_PART_TYPE' }; // Atualiza o estado
            } else if (msg.startsWith("endereço e horário")) {
                console.log('Condição atendida: Opção Endereço e Horário.');
                const resposta = "📍 *Endereço:* Rua X, nº Y, Bairro Z\n🕒 *Horário:* Segunda a Sexta – 9h às 18h | Sábado – 9h às 13h\n📞 *Telefone:* (xx) xxxx-xxxx\n\nPosso te ajudar com algo mais?";
                enviarTexto(userNumber, resposta);
                userStates[userNumber] = { state: 'AWAITING_CHOICE' }; // Mantém no menu principal
            } else {
                console.log('Condição atendida: Opção inválida.');
                enviarTexto(userNumber, "Opção inválida. Por favor, clique em um dos botões do menu.");
                enviarMenuPrincipal(userNumber); // Reenvia o menu
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
                userStates[userNumber] = { state: 'AWAITING_CHOICE' }; // Volta ao menu
                
            } else {
                enviarTexto(userNumber, "Não entendi o tipo de bicicleta. Por favor, diga 'Estrada', 'MTB' ou 'Passeio'.");
                // Mantém o estado como AWAITING_BIKE_TYPE para nova tentativa
            }
            break;

        case 'AWAITING_PART_TYPE':
            // Lógica para peças pode ser adicionada aqui no futuro
            enviarTexto(userNumber, `Ok, buscando por "${userMessage}"... (Esta funcionalidade será implementada em breve!)\n\nDigite 'menu' para voltar.`);
            userStates[userNumber] = { state: 'AWAITING_CHOICE' }; // Volta ao menu
            break;

        default:
            // Caso o estado seja desconhecido, reinicia
            console.log(`Estado desconhecido: ${currentState}. Reiniciando fluxo.`);
            delete userStates[userNumber];
            enviarMenuPrincipal(userNumber);
            break;
    }
}

// Função de menu principal atualizada para definir o estado do usuário
function enviarMenuPrincipal(userNumber) {
    const textoBoasVindas = "Olá 🚴, tudo bem?\n\nAqui é a Loja *Rota Ciclo*! Obrigado pelo seu contato 🙌\n\nEscolha uma opção para facilitar seu atendimento:";
    
    const botoesDoMenu = [
        "Comprar bicicleta 🚲",
        "Peças e acessórios 🛠️",
        "Endereço e Horário 🕒"
    ];
    
    // Define o estado do usuário para 'aguardando escolha' após enviar o menu
    userStates[userNumber] = { state: 'AWAITING_CHOICE' };
    console.log(`[${userNumber}] Estado atualizado para: AWAITING_CHOICE`);

    enviarBotoes(userNumber, textoBoasVindas, botoesDoMenu);
}


// --- FUNÇÕES DE ENVIO DE MENSAGEM ---

// Função para enviar mensagens de texto via API da Meta usando Axios
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

// Função para enviar mensagens com BOTÕES
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