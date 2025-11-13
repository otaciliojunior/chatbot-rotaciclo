// /backend/index.js (COMPLETO E ATUALIZADO)
require('dotenv').config(); // Carrega o .env antes de tudo
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- Importações Corrigidas ---
// Importa o VERIFY_TOKEN para a verificação
const { VERIFY_TOKEN } = require('./config');
// Importa a lógica do bot para delegar as mensagens
const { processarMensagem } = require('./botLogic');
// Importa APENAS as funções de ENVIO de mensagem
const { enviarTexto, enviarImagemComLegenda } = require('./whatsappClient');
// Importa as funções do Firestore
const { 
    iniciarOuvinteDeAtendimentos,
    getOperadorByEmail,
    getOperadorById,
    updateOperadorPassword,
    getRespostasRapidas,
    createRespostaRapida,
    updateRespostaRapida,
    deleteRespostaRapida
} = require('./firestoreService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-forte-aqui';


// --- ROTAS DE WEBHOOK (Agora definidas localmente) ---

// 1. Função para verificar o Token (GET /api/webhook)
function verificarTokenWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.warn('Falha na verificação do Webhook. Tokens não batem.');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
}

// 2. Função para processar o Webhook (POST /api/webhook)
async function processarMensagemWebhook(req, res) {
    try {
        const entry = req.body.entry && req.body.entry[0];
        const changes = entry && entry.changes && entry.changes[0];
        const value = changes && changes.value;
        
        if (value && value.messages && value.messages[0]) {
            const msg = value.messages[0];
            const userNumber = msg.from;
            const waId = value.contacts[0].wa_id;
            const userName = value.contacts[0].profile.name;
    
            let userMessage = "";
            let referralData = null;

            if (msg.type === 'text') {
                userMessage = msg.text.body;
            } else if (msg.type === 'interactive') {
                userMessage = msg.interactive.button_reply ? msg.interactive.button_reply.id : msg.interactive.list_reply.id;
            } else if (msg.type === 'referral') {
                userMessage = msg.referral.body || "Olá!";
                referralData = msg.referral;
            } else {
                userMessage = "media_ou_nao_suportado";
            }
            
            // Delega para a lógica do bot (importada do botLogic.js)
            await processarMensagem(userNumber, userName, userMessage, waId, referralData);
        }
        
        res.sendStatus(200); // Responde OK para a Meta
    } catch (error) {
        console.error("Erro ao processar webhook:", error);
        res.sendStatus(500);
    }
}

// Aponta as rotas para as funções locais
app.post('/api/webhook', processarMensagemWebhook);
app.get('/api/webhook', verificarTokenWebhook);


// --- Rota de Envio de Mensagem (Sem alteração) ---
app.post('/api/enviar-mensagem', async (req, res) => {
    const { para, texto, imageUrl, caption } = req.body;
    try {
        if (imageUrl) {
            await enviarImagemComLegenda(para, imageUrl, caption || '');
        } else {
            await enviarTexto(para, texto);
        }
        res.status(200).json({ success: true, message: 'Mensagem enviada' });
    } catch (error) {
        console.error("Erro ao enviar mensagem pela API:", error);
        res.status(500).json({ success: false, message: 'Falha ao enviar mensagem' });
    }
});


// --- ROTAS DE AUTENTICAÇÃO E API (Sem alteração) ---

// 1. Login do Operador
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        const operador = await getOperadorByEmail(email);
        if (!operador) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const match = await bcrypt.compare(password, operador.passwordHash);
        if (!match) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const tokenPayload = { uid: operador.uid, email: operador.email, nome: operador.nome };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token: token,
            operador: tokenPayload
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- Middleware de Autenticação ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido.' });
        }
        req.user = user; 
        next();
    });
};


// 2. Rotas de Operador (Protegidas)
app.get('/api/operador/me', authenticateToken, async (req, res) => {
    const operador = await getOperadorById(req.user.uid);
    if (!operador) {
        return res.status(404).json({ message: "Operador não encontrado." });
    }
    
    res.status(200).json({
        uid: operador.uid,
        email: operador.email,
        nome: operador.nome
    });
});

app.post('/api/operador/alterar-senha', authenticateToken, async (req, res) => {
    try {
        const { senhaAntiga, novaSenha } = req.body;
        if (!senhaAntiga || !novaSenha) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }

        const operador = await getOperadorById(req.user.uid);
        if (!operador) {
            return res.status(404).json({ message: "Operador não encontrado." });
        }

        const match = await bcrypt.compare(senhaAntiga, operador.passwordHash);
        if (!match) {
            return res.status(401).json({ message: 'Senha antiga incorreta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(novaSenha, salt);

        await updateOperadorPassword(req.user.uid, newPasswordHash);

        res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// 3. Rotas de Respostas Rápidas (Protegidas)
app.get('/api/respostas-rapidas', authenticateToken, async (req, res) => {
    try {
        const respostas = await getRespostasRapidas();
        res.status(200).json(respostas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/respostas-rapidas', authenticateToken, async (req, res) => {
    try {
        const { shortcut, text } = req.body;
        const novaResposta = await createRespostaRapida(shortcut, text);
        res.status(201).json(novaResposta);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/respostas-rapidas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { shortcut, text } = req.body;
        const respostaAtualizada = await updateRespostaRapida(id, shortcut, text);
        res.status(200).json(respostaAtualizada);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/respostas-rapidas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await deleteRespostaRapida(id);
        res.status(200).json({ message: 'Resposta deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log('Ouvindo webhooks do WhatsApp em /api/webhook');
    console.log('API do Dashboard de Atendimento pronta em /api/...');
    
    iniciarOuvinteDeAtendimentos();
});