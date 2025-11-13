// /frontend/seed_servicos.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Aponta para a chave de serviço na pasta do backend
const serviceAccount = require('../../backend/serviceAccountKey.json');

// Inicializa uma instância separada do app para evitar conflitos
// com o servidor principal ou outros scripts.
initializeApp({
  credential: cert(serviceAccount),
  name: 'ServicosSeeder' 
});

const db = getFirestore();

// Extraímos os dados que estavam fixos no seu código
const servicosParaSalvar = {
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
};

async function seedServicos() {
    console.log('Iniciando o salvamento de serviços e horários no Firestore...');
    const servicosCollection = db.collection('configuracoesServicos');

    for (const tipoServico in servicosParaSalvar) {
        // O nome do documento será o tipo de serviço (ex: "revisao")
        await servicosCollection.doc(tipoServico).set(servicosParaSalvar[tipoServico]);
        console.log(`- Serviço de '${tipoServico}' salvo com sucesso!`);
    }

    console.log('✅ Seeding de serviços concluído!');
}

seedServicos().then(() => {
    console.log('Processo finalizado.');
    process.exit(0); // Encerra o script com sucesso
}).catch(error => {
    console.error("❌ Erro no seeding:", error);
    process.exit(1); // Encerra o script com erro
});