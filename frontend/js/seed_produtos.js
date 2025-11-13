// /seed_produtos.js
const admin = require('firebase-admin');

// ATENÇÃO: Verifique se este caminho para sua chave de serviço está correto!
// Pode ser './serviceAccountKey.json' ou '../backend/serviceAccountKey.json', etc.
const serviceAccount = require('../../backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Array com os dados dos produtos de exemplo
const produtosParaPopular = [
  {
    nome: 'Caloi Vulcan Aro 29',
    descricao: 'Bicicleta ideal para trilhas leves e passeios urbanos, com freios a disco e 21 velocidades.',
    preco: 1899.90,
    estoque: 15,
    categoria: 'mtb',
    imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_821734-MLB49737603952_042022-O.webp',
    adicionadoEm: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    nome: 'Bicicleta de Passeio Retrô',
    descricao: 'Estilo e conforto para o dia a dia. Vem com cestinha e bagageiro para sua comodidade.',
    preco: 999.00,
    estoque: 22,
    categoria: 'passeio',
    imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_994994-MLB51832906666_102022-O.webp',
    adicionadoEm: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    nome: 'Oggi Big Wheel 7.2 2023',
    descricao: 'Performance e agilidade para ciclistas de MTB. Quadro em alumínio e grupo Shimano Alivio.',
    preco: 3499.00,
    estoque: 8,
    categoria: 'mtb',
    imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_668478-MLB70762189689_072023-O.webp',
    adicionadoEm: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function popularProdutos() {
  console.log('Iniciando a criação de produtos de teste na coleção "produtos"...');
  const produtosRef = db.collection('produtos');
  const batch = db.batch();

  produtosParaPopular.forEach(produto => {
    const docRef = produtosRef.doc(); // Cria uma referência com ID automático
    batch.set(docRef, produto);
    console.log(`- Adicionando '${produto.nome}' ao batch.`);
  });

  await batch.commit(); // Envia todas as operações de uma vez
  console.log('✅ Dados de produtos criados com sucesso!');
}

popularProdutos().then(() => {
  console.log('Processo de seeding finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro ao criar produtos:', error);
  process.exit(1);
});