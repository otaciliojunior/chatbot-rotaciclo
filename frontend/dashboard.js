import * as Firebase from './firebase.js';
import * as API from './api.js';
import * as UI from './ui.js';
import * as Listeners from './listeners.js';
import * as Utils from './utils.js';

// --- ESTADO DA APLICAÇÃO ---
let unsubscribeMessages = null;
let adminName = '';

// --- LÓGICA DE NEGÓCIO PRINCIPAL ---

function setupAdminProfile() {
    adminName = localStorage.getItem('adminName') || prompt("Por favor, digite o seu nome de atendente:") || 'Atendente';
    localStorage.setItem('adminName', adminName);
    UI.userName.textContent = adminName;
    UI.userAvatar.textContent = Utils.getInitials(adminName);
}

// **NOVA FUNÇÃO AUXILIAR**
/**
 * Salva uma mensagem diretamente no histórico do Firestore, sem enviá-la ao cliente.
 * @param {string} texto - O conteúdo da mensagem a ser salva.
 * @param {string} [origem='sistema'] - A origem da mensagem (atendente, cliente, sistema).
 */
async function salvarMensagemNoHistorico(texto, origem = 'sistema') {
    const { activeChatId } = UI.chatView.dataset;
    if (!texto || !activeChatId) return;
    try {
        const messagesRef = Firebase.collection(Firebase.db, "atendimentos", activeChatId, "mensagens");
        await Firebase.addDoc(messagesRef, {
            texto,
            origem: origem,
            enviadaEm: Firebase.serverTimestamp()
        });
    } catch (error) {
        console.error("Erro ao salvar mensagem apenas no histórico:", error);
    }
}

async function enviarMensagem(texto) {
    const { activeChatId, clienteId } = UI.chatView.dataset;
    if (!texto || !activeChatId) return;
    try {
        // Envia para o cliente via API
        await API.enviarMensagemViaAPI(clienteId, texto);
        // Salva no histórico local (reutilizando a nova função)
        await salvarMensagemNoHistorico(texto, 'atendente');
    } catch (error) {
        alert("Não foi possível enviar a mensagem. Verifique o console para mais detalhes.");
    }
}

async function loadAndRenderProfileData(clienteId, clienteNome) {
    const profileNameEl = document.getElementById('profile-name');
    const profilePhoneEl = document.getElementById('profile-phone');
    const profileAvatarEl = document.getElementById('profile-card-avatar');
    const tagsContainerEl = document.getElementById('profile-tags-container');
    const historyListEl = document.getElementById('profile-history-list');
    const notesTextareaEl = document.getElementById('profile-notes-textarea');

    // 1. Renderiza informações básicas imediatamente
    profileNameEl.textContent = clienteNome;
    profilePhoneEl.textContent = clienteId.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 $2 $3-$4'); // Formata o número
    profileAvatarEl.textContent = Utils.getInitials(clienteNome);
    
    // Limpa dados anteriores
    tagsContainerEl.innerHTML = '';
    historyListEl.innerHTML = '<li>Carregando histórico...</li>';
    notesTextareaEl.value = '';

    // 2. Busca dados do cliente (notas e tags) na coleção 'clientes'
    try {
        const clienteRef = Firebase.doc(Firebase.db, 'clientes', clienteId);
        const clienteSnap = await Firebase.getDoc(clienteRef);
        if (clienteSnap.exists()) {
            const clienteData = clienteSnap.data();
            notesTextareaEl.value = clienteData.notas || '';
            
            if (clienteData.tags && clienteData.tags.length > 0) {
                clienteData.tags.forEach(tagText => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag info'; // Pode-se adicionar lógica para cores diferentes
                    tagEl.textContent = tagText;
                    tagsContainerEl.appendChild(tagEl);
                });
            }
        } else {
             tagsContainerEl.innerHTML = '<span class="tag">Novo Cliente</span>';
        }
    } catch (e) { console.error("Erro ao buscar dados do cliente:", e); }

    // 3. Busca histórico de atendimentos
    try {
        historyListEl.innerHTML = ''; // Limpa o "carregando"
        const q = Firebase.query(
            Firebase.collection(Firebase.db, "atendimentos"),
            Firebase.where("cliente_id", "==", clienteId), // Ajustado para snake_case
            Firebase.orderBy("solicitadoEm", "desc") // Ajustado para snake_case
        );
        const querySnapshot = await Firebase.getDocs(q);
        if (querySnapshot.empty) {
            historyListEl.innerHTML = '<li>Nenhum atendimento anterior.</li>';
        } else {
            querySnapshot.forEach(doc => {
                const atendimento = doc.data();
                const data = atendimento.solicitadoEm?.toDate().toLocaleDateString('pt-BR') || 'Data indisponível';
                const statusClass = atendimento.status === 'resolvido' ? 'resolved' : '';

                const itemEl = document.createElement('li');
                itemEl.className = 'history-item';
                itemEl.innerHTML = `
                    <div class="history-item__info">
                        <strong>Atendimento de ${data}</strong>
                        <span class="subtext">Status: ${atendimento.status}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${atendimento.status}</span>`;
                historyListEl.appendChild(itemEl);
            });
        }
    } catch (e) { console.error("Erro ao buscar histórico:", e); }
}


function openChat(atendimentoId, clienteNome, clienteId, clickedItemElement) {
    if (UI.chatView.dataset.activeChatId === atendimentoId) return;
    UI.resetActiveChatPanel(() => { if (unsubscribeMessages) unsubscribeMessages(); });
    UI.atendimentosLista.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    clickedItemElement.classList.add('selected');
    UI.chatView.dataset.activeChatId = atendimentoId;
    UI.chatView.dataset.clienteId = clienteId;
    UI.updateChatHeader(clienteNome, clienteId);

    // Carrega os dados do perfil do cliente ao abrir o chat
    loadAndRenderProfileData(clienteId, clienteNome);

    const messagesRef = Firebase.collection(Firebase.db, "atendimentos", atendimentoId, "mensagens");
    const qMessages = Firebase.query(messagesRef, Firebase.orderBy("enviadaEm", "asc"), Firebase.limit(50));
    unsubscribeMessages = Firebase.onSnapshot(qMessages, (snapshot) => {
        if (UI.chatView.dataset.activeChatId === atendimentoId) {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") UI.renderMessage(change.doc.data());
            });
        }
    });
}

async function saveProduct(event) {
    event.preventDefault();
    const productId = UI.productIdInput.value;
    const produtoData = {
        nome: document.getElementById('product-name').value,
        preco: parseFloat(document.getElementById('product-price').value),
        estoque: parseInt(document.getElementById('product-stock').value),
        categoria: document.getElementById('product-category').value,
        imagemUrl: document.getElementById('product-image').value,
        descricao: document.getElementById('product-description').value,
    };
    try {
        if (productId) {
            const productRef = Firebase.doc(Firebase.db, 'produtos', productId);
            await Firebase.updateDoc(productRef, produtoData);
            alert('Produto atualizado com sucesso!');
        } else {
            produtoData.adicionadoEm = Firebase.serverTimestamp();
            const produtosCollection = Firebase.collection(Firebase.db, 'produtos');
            await Firebase.addDoc(produtosCollection, produtoData);
            alert('Produto adicionado com sucesso!');
        }
        UI.closeProductModal();
    } catch (error) {
        console.error("Erro ao salvar produto: ", error);
        alert('Ocorreu um erro ao salvar o produto.');
    }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

function initializeApp() {
    setupAdminProfile();
    UI.showView('atendimento-view');
    UI.resetActiveChatPanel();

    // Inicia os listeners do Firestore
    Listeners.setupAtendimentosListener();
    Listeners.setupProdutosListener();
    Listeners.setupVendasListener();
    Listeners.setupServicosListener();
    Listeners.setupRespostasRapidasListener();

    // Listeners de navegação
    UI.navItems.forEach(item => item.addEventListener('click', (e) => {
        e.preventDefault();
        UI.showView(item.dataset.view);
    }));

    // Listeners de Atendimento e Chat
    UI.atendimentosLista.addEventListener('click', async (e) => {
        const item = e.target.closest('.chat-list-item');
        if (!item) return;
        const { id, clienteNome, clienteId, status } = item.dataset;
        if (status === 'aguardando') {
            const msg = `${Utils.getGreeting()}, ${clienteNome}. Meu nome é ${adminName}, em que posso ajudar?`;
            try {
                await API.enviarMensagemViaAPI(clienteId, msg);
                await Firebase.updateDoc(Firebase.doc(Firebase.db, "atendimentos", id), { status: "em_atendimento" });
                openChat(id, clienteNome, clienteId, item);
            } catch (error) { alert("Não foi possível iniciar o atendimento."); }
        } else {
            openChat(id, clienteNome, clienteId, item);
        }
    });

    UI.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = UI.chatMessageInput.value.trim();
        if (texto) {
            enviarMensagem(texto);
            UI.chatMessageInput.value = '';
            UI.chatMessageInput.focus();
        }
    });

    // Listener do botão Encerrar Chat (CORRIGIDO E MAIS ROBUSTO)
    UI.encerrarChatBtn.addEventListener('click', async () => {
        const { activeChatId, clienteId } = UI.chatView.dataset;
        if (!activeChatId || !confirm("Encerrar este atendimento?")) return;

        const msg = "Atendimento encerrado. Valeu pelo papo! A Rota Ciclo agradece e já está pronta para a próxima. 🚴😉";

        try {
            // 1. Tenta enviar a mensagem final pela API, mas não para o processo se falhar.
            console.log("Tentando enviar mensagem de encerramento via API...");
            await API.enviarMensagemViaAPI(clienteId, msg);
            console.log("Mensagem de encerramento enviada com sucesso.");
        } catch (error) {
            // 2. Se a API falhar, apenas registra o erro no console, mas não impede o fluxo.
            console.error("API de encerramento falhou, mas o chat será encerrado no sistema.", error);
            alert("Atenção: Não foi possível enviar a mensagem de encerramento ao cliente, mas o atendimento foi finalizado no sistema.");
        }

        try {
            // 3. ATUALIZA O STATUS NO FIREBASE (esta parte agora sempre executa)
            console.log(`Atualizando status do chat ${activeChatId} para 'resolvido'.`);
            await Firebase.updateDoc(Firebase.doc(Firebase.db, "atendimentos", activeChatId), { status: "resolvido" });
            
            // 4. Limpa o painel de chat
            UI.resetActiveChatPanel(() => { if (unsubscribeMessages) unsubscribeMessages(); });
            console.log("Painel do chat resetado. Operação concluída.");
        } catch (firebaseError) {
            console.error("Ocorreu um erro grave ao tentar atualizar o status no Firebase:", firebaseError);
            alert("Erro: Não foi possível encerrar o atendimento no banco de dados.");
        }
    });

    // Listeners de Ações Gerais (deletar produto, pagar parcela, etc.)
    UI.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;

        if (action === 'delete-product' && confirm("Tem certeza?")) {
            await Firebase.deleteDoc(Firebase.doc(Firebase.db, "produtos", id));
        }
        if (action === 'edit-product') {
            const productRef = Firebase.doc(Firebase.db, 'produtos', id);
            const productSnap = await Firebase.getDoc(productRef);
            if (productSnap.exists()) {
                UI.openProductModal({ id: productSnap.id, ...productSnap.data() });
            }
        }
        if (action === 'mark-paid') {
            const item = btn.closest('.parcela-item');
            const { vendaId, parcelaNumero } = item.dataset;
            if (!confirm(`Confirmar pagamento da parcela ${parcelaNumero}?`)) return;
            btn.disabled = true;
            const vRef = Firebase.doc(Firebase.db, "vendasParceladas", vendaId);
            const vSnap = await Firebase.getDoc(vRef);
            if (vSnap.exists()) {
                const parcelas = vSnap.data().parcelas.map(p => p.numero == parcelaNumero ? { ...p, status: 'paga' } : p);
                await Firebase.updateDoc(vRef, { parcelas });
            }
        }
        // --- AÇÃO DE ENVIAR PRODUTO (MODIFICADA) ---
        if (action === 'send-product') {
            const product = Listeners.allProducts.find(p => p.id === id);
            if (product) {
                // Pega o ID do cliente ativo no chat
                const { clienteId } = UI.chatView.dataset;
                if (!clienteId) {
                    alert("Selecione um chat para enviar o produto.");
                    return;
                }

                // Formata a legenda que irá abaixo da imagem
                const legenda = `*${product.nome}*\n\n` +
                              `*Preço:* ${product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
                              `${product.descricao || 'Consulte mais detalhes.'}`;

                try {
                    // Mostra um feedback visual de que o envio está acontecendo
                    btn.textContent = 'Enviando...';
                    btn.disabled = true;

                    // Chama a nova função da API para enviar imagem com legenda
                    await API.enviarImagemComLegendaViaAPI(clienteId, product.imagemUrl, legenda);
                    
                    // **CORREÇÃO APLICADA AQUI**
                    // Adiciona uma mensagem no chat local para o atendente ver o que foi enviado
                    const textoConfirmacao = `[PRODUTO ENVIADO]: ${product.nome}`;
                    await salvarMensagemNoHistorico(textoConfirmacao, 'sistema'); // Usa a nova função

                    // Fecha o painel de produtos
                    UI.toggleProductSender(false);
                } catch (error) {
                    console.error("Erro ao enviar produto com imagem:", error);
                    alert("Não foi possível enviar o produto. Verifique se o backend está rodando e tente novamente.");
                    // Restaura o botão em caso de erro
                    btn.textContent = 'Enviar';
                    btn.disabled = false;
                }
            }
        }
    });

    UI.quickRepliesBar.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-tag')) {
            const item = e.target;
            if (item && item.dataset.text) {
                UI.chatMessageInput.value = item.dataset.text;
                UI.chatMessageInput.focus();
            }
        }
    });

    // Listeners do Painel de Envio de Produto
    UI.openProductSenderBtn.addEventListener('click', () => {
        UI.renderProductSearchResults(Listeners.allProducts);
        UI.toggleProductSender(true);
    });
    UI.closeProductSenderBtn.addEventListener('click', () => UI.toggleProductSender(false));
    UI.productSearchInput.addEventListener('keyup', () => UI.renderProductSearchResults(Listeners.allProducts, UI.productSearchInput.value));

    // Listeners do Modal de Produto
    UI.addProductBtn.addEventListener('click', () => UI.openProductModal());
    UI.closeModalBtn.addEventListener('click', UI.closeProductModal);
    UI.productForm.addEventListener('submit', saveProduct);

    // Listeners dos campos de busca
    UI.buscaAtendimentoInput.addEventListener('keyup', () => {
        const t = UI.buscaAtendimentoInput.value.toLowerCase();
        UI.atendimentosLista.querySelectorAll('li').forEach(i => { i.style.display = i.textContent.toLowerCase().includes(t) ? '' : 'none'; });
    });
    UI.buscaParcelasInput.addEventListener('keyup', () => {
        const t = UI.buscaParcelasInput.value.toLowerCase();
        UI.parcelasLista.querySelectorAll('li').forEach(i => { i.style.display = i.textContent.toLowerCase().includes(t) ? '' : 'none'; });
    });

    // --- Listeners do Painel de Perfil do Cliente ---
    const openProfileBtn = document.getElementById('open-customer-profile-btn');
    const closeProfileBtn = document.getElementById('close-customer-profile-btn');
    const profilePanel = document.getElementById('customer-profile-panel');
    const tabsContainer = profilePanel.querySelector('.tabs');
    const tabContents = profilePanel.querySelectorAll('.tab-content');
    const saveNotesBtn = document.getElementById('save-notes-btn');

    openProfileBtn.addEventListener('click', () => {
        if (UI.chatView.dataset.activeChatId) {
            profilePanel.classList.remove('hidden');
        } else {
            alert("Selecione um atendimento para ver o perfil do cliente.");
        }
    });

    closeProfileBtn.addEventListener('click', () => {
        profilePanel.classList.add('hidden');
    });

    tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-btn');
        if (!clickedTab) return;

        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        clickedTab.classList.add('active');

        const tabId = clickedTab.dataset.tab;
        tabContents.forEach(content => content.classList.remove('active'));
        
        const activeContent = document.getElementById(tabId + '-content');
        if (activeContent) {
            activeContent.classList.add('active');
        }
    });

    // Lógica para salvar as notas
    saveNotesBtn.addEventListener('click', async () => {
        const { clienteId } = UI.chatView.dataset;
        if (!clienteId) return alert('Nenhum cliente ativo.');

        const notesTextarea = document.getElementById('profile-notes-textarea');
        const novasNotas = notesTextarea.value;
        
        saveNotesBtn.textContent = 'Salvando...';
        saveNotesBtn.disabled = true;

        try {
            const clienteRef = Firebase.doc(Firebase.db, 'clientes', clienteId);
            await Firebase.updateDoc(clienteRef, { notas: novasNotas });
            alert('Notas salvas com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar notas: ", error);
            alert('Não foi possível salvar as notas.');
        } finally {
            saveNotesBtn.textContent = 'Salvar Notas';
            saveNotesBtn.disabled = false;
        }
    });
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);