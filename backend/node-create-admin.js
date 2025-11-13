require('dotenv').config(); // <-- ADICIONE ESTA LINHA
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { SERVICE_ACCOUNT_KEY_JSON } = require('./config'); // Agora esta variável não será 'undefined'
const readline = require('readline');

// --- Configuração do Firestore ---
let db;
try {
    if (admin.apps.length === 0) {
        // A linha abaixo falha se SERVICE_ACCOUNT_KEY_JSON estiver undefined
        const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY_JSON); 
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
} catch (e) {
    console.error("ERRO CRÍTICO ao inicializar Firebase Admin:", e);
    console.error("Verifique se a variável SERVICE_ACCOUNT_KEY_JSON está correta no .env");
    process.exit(1);
}
// --- Fim da Configuração ---

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

async function createAdmin() {
    console.log("--- Criação do Operador Administrador ---");
    const email = await askQuestion("Email do operador: ");
    const nome = await askQuestion("Nome completo do operador: ");
    const senha = await askQuestion("Digite uma senha: ");

    if (!email || !nome || !senha) {
        console.error("Todos os campos são obrigatórios.");
        rl.close();
        return;
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(senha, salt);

        const operadorRef = db.collection('operadores').doc();
        await operadorRef.set({
            uid: operadorRef.id,
            email: email.toLowerCase(),
            nome: nome,
            passwordHash: passwordHash,
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`\n✅ Sucesso! Operador "${nome}" criado com o email "${email}".`);
        console.log("Agora você pode iniciar seu servidor principal (`node index.js`) e fazer login.");

    } catch (error) {
        console.error("\n❌ Erro ao criar operador:", error.message);
    } finally {
        rl.close();
    }
}

createAdmin();