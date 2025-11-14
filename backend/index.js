require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Timestamp } = require('firebase-admin/firestore');

const { VERIFY_TOKEN } = require('./config');
const { processarMensagem } = require('./botLogic');
const { enviarTexto, enviarImagemComLegenda } = require('./whatsappClient');
const {
    iniciarOuvinteDeAtendimentos,
    getOperadorByEmail,
    getOperadorById,
    updateOperadorPassword,
    getRespostasRapidas,
    createRespostaRapida,
    updateRespostaRapida,
    deleteRespostaRapida,
    db 
} = require('./firestoreService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-forte-aqui';

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

            await processarMensagem(userNumber, userName, userMessage, waId, referralData);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Erro ao processar webhook:", error);
        res.sendStatus(500);
    }
}

app.post('/api/webhook', processarMensagemWebhook);
app.get('/api/webhook', verificarTokenWebhook);

app.get('/api/health', (req, res) => {
    console.log('Recebido ping de keep-alive. Servidor acordado.');
    res.status(200).json({ status: 'healthy', message: 'Servidor acordado.' });
});

app.head('/api/run-inactivity-check', async (req, res) => {
    const providedSecret = req.query.secret;

    if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
        console.warn('CRON: Tentativa de acesso não autorizada ao cron job.');
        return res.status(401).end();
    }

    try {
        checkHumanInactivity().catch(err => {
            console.error("CRON: Erro não tratado na verificação de inatividade:", err);
        });
        
        res.status(202).end();

    } catch (error) {
        console.error("CRON: Erro ao iniciar verificação:", error);
        res.status(500).end();
    }
});

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

const TEMPO_PARA_AVISO_AGENTE = 10;
const TEMPO_PARA_ENCERRAR_AGENTE = 15;
const MENSAGEM_AVISO = "Olá! Você ainda está aí? Se não houver resposta em alguns minutos, este atendimento será encerrado. 🙂";
const MENSAGEM_ENCERRANENTO = "Como não recebemos resposta, este atendimento está sendo encerrado. Se precisar de algo mais, é só chamar! 👋";

async function checkHumanInactivity() {
    console.log('CRON: Iniciando verificação de inatividade humana...');
    const now = Timestamp.now();
    
    const avisoThreshold = now.toMillis() - (TEMPO_PARA_AVISO_AGENTE * 60 * 1000);
    const encerramentoThreshold = now.toMillis() - (TEMPO_PARA_ENCERRAR_AGENTE * 60 * 1000);

    const chatsParaAvisarQuery = db.collection('atendimentos')
        .where('status', '==', 'em_atendimento');
        
    const chatsParaAvisarSnap = await chatsParaAvisarQuery.get();

    for (const doc of chatsParaAvisarSnap.docs) {
        try {
            const ultimasMensagensSnap = await doc.ref.collection('mensagens')
                .orderBy('enviadaEm', 'desc')
                .limit(1)
                .get();

            if (ultimasMensagensSnap.empty) continue; 

            const lastMsg = ultimasMensagensSnap.docs[0].data();
            const lastMsgTime = lastMsg.enviadaEm.toMillis();
            
            if (lastMsg.origem === 'agente' && lastMsgTime < avisoThreshold) {
                const clienteId = doc.data().cliente_id;
                console.log(`[AVISO] Chat ${doc.id} (Cliente: ${clienteId}) inativo. Enviando aviso.`);
                
                await enviarTexto(clienteId, MENSAGEM_AVISO);
                await doc.ref.update({ status: 'em_atendimento_avisado' });
            }
        } catch (error) {
            console.error(`CRON: Erro ao processar chat ${doc.id} para aviso:`, error);
        }
    }

    const chatsParaEncerrarQuery = db.collection('atendimentos')
        .where('status', '==', 'em_atendimento_avisado');

    const chatsParaEncerrarSnap = await chatsParaEncerrarQuery.get();

    for (const doc of chatsParaEncerrarSnap.docs) {
        try {
            const ultimasMensagensSnap = await doc.ref.collection('mensagens')
                .orderBy('enviadaEm', 'desc')
                .limit(1)
                .get();
                
            if (ultimasMensagensSnap.empty) continue;

            const lastMsg = ultimasMensagensSnap.docs[0].data();
            const lastMsgTime = lastMsg.enviadaEm.toMillis();

            if (lastMsg.origem === 'atendente' && lastMsgTime < encerramentoThreshold) {
                const clienteId = doc.data().cliente_id;
                console.log(`[ENCERRAR] Chat ${doc.id} (Cliente: ${clienteId}) excedeu limite. Encerrando.`);
                
                await enviarTexto(clienteId, MENSAGEM_ENCERRANENTO);
                await doc.ref.update({ status: 'resolvido' });
            }
        } catch (error) {
            console.error(`CRON: Erro ao processar chat ${doc.id} para encerramento:`, error);
        }
    }
    console.log('CRON: Verificação de inatividade concluída.');
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log('Ouvindo webhooks do WhatsApp em /api/webhook');
    console.log('API do Dashboard de Atendimento pronta em /api/...');

    iniciarOuvinteDeAtendimentos();
});