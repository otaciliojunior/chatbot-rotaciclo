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

// Função principal que gerencia o fluxo da conversa (ATUALIZADA PARA BOTÕES)
function processarMensagem(userNumber, userMessage) {
    console.log(`Processando a mensagem "${userMessage}" para o menu.`);
    const msg = userMessage.toLowerCase();

    if (["oi", "ola", "olá", "começar"].includes(msg)) {
        console.log('Condição atendida: Saudação. Enviando menu principal.');
        enviarMenuPrincipal(userNumber);
    } else if (msg.startsWith("comprar bicicleta")) {
        console.log('Condição atendida: Opção Comprar Bicicleta.');
        const resposta = "Ótima escolha! 🚴 Temos bicicletas para:\n\n- Estrada\n- MTB (Trilha)\n- Passeio/urbana\n\n👉 Me diga qual tipo você procura e já envio algumas opções disponíveis.";
        enviarTexto(userNumber, resposta);
    } else if (msg.startsWith("peças e acessórios")) {
        console.log('Condição atendida: Opção Peças e Acessórios.');
        const resposta = "Legal! Temos câmaras, pneus, capacetes, luvas, roupas e muito mais 🚴.\n\n👉 Digite o que você procura, que já te mostro opções disponíveis.";
        enviarTexto(userNumber, resposta);
    } else if (msg.startsWith("endereço e horário")) {
        console.log('Condição atendida: Opção Endereço e Horário.');
        const resposta = "📍 *Endereço:* Rua X, nº Y, Bairro Z\n🕒 *Horário:* Segunda a Sexta – 9h às 18h | Sábado – 9h às 13h\n📞 *Telefone:* (xx) xxxx-xxxx";
        enviarTexto(userNumber, resposta);
    } else {
        console.log('Condição atendida: Opção inválida.');
        // Para evitar loops, reenviamos o menu principal se não entendermos a resposta.
        enviarMenuPrincipal(userNumber);
    }
}

// Função de menu principal ATUALIZADA para usar botões
function enviarMenuPrincipal(userNumber) {
    const textoBoasVindas = "Olá 🚴, tudo bem?\n\nAqui é a Loja [Nome da Loja]! Obrigado pelo seu contato 🙌\n\nEscolha uma opção para facilitar seu atendimento:";
    
    const botoesDoMenu = [
        "Comprar bicicleta 🚲",
        "Peças e acessórios 🛠️",
        "Endereço e Horário 🕒"
    ];
                 
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

// NOVA FUNÇÃO para enviar mensagens com BOTÕES
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