// seed.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function popularDados() {
  console.log('Definindo a estrutura e criando os dados...');
  try {
    // 1. O código aponta para a coleção que queremos criar/usar.
    // Se 'vendasParceladas' não existir, ela será criada neste passo.
    const vendasRef = db.collection('vendasParceladas');

    // 2. Aqui estamos DEFININDO A ESTRUTURA COMPLETA do nosso documento em um objeto JavaScript.
    // Este objeto é o seu "esquema" ou "molde".
    const novaVenda = {
      cliente_nome: "Cliente Criado via Código",  // <-- Define o campo 'cliente_nome'
      cliente_id: "5584000000000",             // <-- Define o campo 'cliente_id'
      produto_nome: "Produto Definido no Código",   // <-- etc.
      status_venda: "ativa",
      data_venda: admin.firestore.Timestamp.now(),
      valor_total: 3000,
      parcelas: [                               // <-- Define o campo 'parcelas' como um array
        {                                       // <-- Define a estrutura dos objetos dentro do array
          numero: 1,
          status: "pendente",
          valor: 1500,
          data_vencimento: admin.firestore.Timestamp.fromDate(new Date())
        },
        {
          numero: 2,
          status: "pendente",
          valor: 1500,
          data_vencimento: admin.firestore.Timestamp.fromDate(new Date())
        }
      ]
    };

    // 3. E aqui, o código EFETIVAMENTE CRIA o documento no Firebase com a estrutura definida acima.
    await vendasRef.add(novaVenda);

    console.log('✅ Estrutura definida e dados criados com sucesso no Firebase!');

  } catch (error) {
    console.error('❌ Erro ao criar dados:', error);
  }
}

popularDados();