// /backend/index.js
const express = require('express');
const cors = require('cors');
const { PORT, VERIFY_TOKEN } = require('./config');
const { processarMensagem } = require('./botLogic');
const { enviarTexto, enviarImagem } = require('./whatsappClient');
const { iniciarOuvinteDeAtendimentos } = require('./firestoreService');

const app = express();
app.use(express.json());
app.use(cors());

// --- ROTAS DO SERVIDOR ---

// Rota principal para testar se o servidor está no ar
app.get('/', (req, res) => {
    res.send('Chatbot Rota Ciclo está no ar!');
});

// Rota modificada para aceitar texto ou imagem com legenda
app.post('/api/enviar-mensagem', async (req, res) => {
    // Lembre-se de adicionar a segurança com chave de API aqui
    const { para, texto, imageUrl, caption } = req.body;

    // --- VALIDAÇÃO CORRIGIDA ---
    if (!para) {
        return res.status(400).json({ error: "O número do destinatário ('para') é obrigatório." });
    }

    const hasText = req.body.hasOwnProperty('texto');
    const hasImage = req.body.hasOwnProperty('imageUrl');

    // A requisição é inválida se:
    // 1. Ambas as propriedades (texto e imagem) existem.
    // 2. Nenhuma das duas propriedades existe.
    if ((hasText && hasImage) || (!hasText && !hasImage)) {
        return res.status(400).json({
            error: "Requisição inválida. Envie a propriedade 'texto' OU a propriedade 'imageUrl'."
        });
    }

    // --- LÓGICA DE ENVIO ---
    try {
        if (hasText) {
            await enviarTexto(para, texto);
            return res.status(200).json({ success: true, message: "Mensagem de texto enviada com sucesso!" });
        }

        if (hasImage) {
            await enviarImagem(para, imageUrl, caption); // O 'caption' pode ser nulo/undefined
            return res.status(200).json({ success: true, message: "Mensagem com imagem enviada com sucesso!" });
        }
    } catch (error) {
        console.error('--- ERRO AO ENVIAR MENSAGEM PELA API ---', error);
        return res.status(500).json({ success: false, message: "Erro interno ao enviar a mensagem." });
    }
});


// Rota do Webhook da Meta (GET para verificação, POST para receber mensagens)
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
        try {
            const value = req.body.entry?.[0]?.changes?.[0]?.value;

            // ALTERAÇÃO: Verifica se o evento recebido contém mensagens e contatos
            if (value?.messages && value?.contacts) {
                const messageData = value.messages[0];
                const contact = value.contacts[0];
                const fromNumber = messageData.from;
                const userName = contact.profile.name;
                const waId = contact.wa_id; // <-- Pega o ID do WhatsApp aqui

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
                    console.log(`Mensagem de [${fromNumber} - ${userName}] para nosso sistema: "${messageBody}"`);
                    // Passa o waId como novo argumento para a próxima função
                    processarMensagem(fromNumber, userName, messageBody, waId);
                } else {
                     console.log('Tipo de mensagem não suportada. Ignorando.');
                }
            } else {
                // Se não for uma mensagem (pode ser um status de 'lido', 'entregue', etc), apenas loga por enquanto.
                console.log('Evento recebido não é uma mensagem de cliente. Ignorando.');
            }
        } catch (error) {
            console.error('--- ERRO AO PROCESSAR DADOS DO WEBHOOK ---', error);
        }
        res.sendStatus(200);
    }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---

// Define a porta usando a variável de ambiente do Google Cloud ou a porta do seu arquivo de configuração como padrão
const port = process.env.PORT || PORT;

// Inicia o servidor para escutar por requisições
app.listen(port, () => {
  console.log(`Servidor iniciado. Escutando na porta ${port}`);
  // O ouvinte de atendimentos não deve ser iniciado aqui em um ambiente serverless.
  // Funções serverless devem ser sem estado e responder apenas a requisições.
});

// Exporta a aplicação Express para que o Google Cloud Functions possa usá-la
exports.rotacicloBot = app;