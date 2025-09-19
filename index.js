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
        // Processo de verificação da Meta
        if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
            return res.send(req.query['hub.challenge']);
        }
        return res.status(403).send('Erro de verificação');
    }

    if (req.method === 'POST') {
        // Processa as mensagens recebidas do WhatsApp
        const data = req.body;
        try {
            const messageData = data.entry[0].changes[0].value.messages[0];
            const fromNumber = messageData.from;
            const messageBody = messageData.text.body;

            // --- AQUI ENTRA A LÓGICA DO SEU FLUXO ---
            processarMensagem(fromNumber, messageBody);

        } catch (error) {
            // Ignora notificações que não são mensagens
        }
        
        return res.status(200).send('OK');
    }
});

// Função principal que gerencia o fluxo da conversa
function processarMensagem(userNumber, userMessage) {
    const msg = userMessage.toLowerCase();

    if (["oi", "ola", "olá", "começar"].includes(msg)) {
        enviarMenuPrincipal(userNumber);
    } else if (userMessage === "1") {
        const resposta = "Ótima escolha! 🚴 Temos bicicletas para:\n\n- Estrada\n- MTB (Trilha)\n- Passeio/urbana\n\n👉 Me diga qual tipo você procura e já envio algumas opções disponíveis.";
        enviarTexto(userNumber, resposta);
    } else if (userMessage === "2") {
        const resposta = "Legal! Temos câmaras, pneus, capacetes, luvas, roupas e muito mais 🚴.\n\n👉 Digite o que você procura, que já te mostro opções disponíveis.";
        enviarTexto(userNumber, resposta);
    } else if (userMessage === "4") {
        const resposta = "📍 *Endereço:* Rua X, nº Y, Bairro Z\n🕒 *Horário:* Segunda a Sexta – 9h às 18h | Sábado – 9h às 13h\n📞 *Telefone:* (xx) xxxx-xxxx";
        enviarTexto(userNumber, resposta);
    } else {
        enviarTexto(userNumber, "Opção inválida. Por favor, escolha um número do menu.");
    }
}

function enviarMenuPrincipal(userNumber) {
    const textoBoasVindas = "Olá 🚴, tudo bem?\n\nAqui é a Loja [Nome da Loja]! Obrigado pelo seu contato 🙌\n\nEscolha uma opção para facilitar seu atendimento:";
    const menu = "1️⃣ Quero comprar uma bicicleta 🚲\n" +
                 "2️⃣ Preciso de peças ou acessórios 🛠️\n" +
                 "3️⃣ Revisão ou manutenção ⚙️\n" +
                 "4️⃣ Endereço e horário de funcionamento 🕒\n" +
                 "5️⃣ Falar com um atendente 👨‍🔧";
                 
    enviarTexto(userNumber, textoBoasVindas).then(() => {
        enviarTexto(userNumber, menu);
    });
}

// Função para enviar mensagens de texto via API da Meta usando Axios
async function enviarTexto(recipientId, text) {
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

    try {
        await axios.post(url, payload, { headers: headers });
        console.log(`Mensagem enviada para ${recipientId}`);
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error.response ? error.response.data : error.message);
    }
}

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});