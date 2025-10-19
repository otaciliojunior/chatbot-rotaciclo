import { getInitials } from './utils.js';

// --- REFERÊNCIAS AOS ELEMENTOS DO DOM (EXPORTADAS) ---
export const body = document.body;
export const navItems = document.querySelectorAll('.nav-item');
export const views = document.querySelectorAll('.view');
export const atendimentosLista = document.getElementById('atendimentos-lista');
export const chatView = document.getElementById('chat-view');
export const chatHeaderName = document.getElementById('chat-header-name');
export const chatHeaderNumber = document.getElementById('chat-header-number');
export const chatHeaderAvatar = document.getElementById('chat-header-avatar');
export const chatHistoryContent = document.getElementById('chat-history-content');
export const chatForm = document.getElementById('chat-form');
export const chatMessageInput = document.getElementById('chat-message-input');
export const encerrarChatBtn = document.getElementById('encerrar-chat-btn');
export const buscaAtendimentoInput = document.getElementById('busca-atendimento');
export const activeChatPlaceholder = document.getElementById('active-chat-placeholder');
export const notificationSound = document.getElementById('notification-sound');
export const userAvatar = document.getElementById('user-avatar');
export const userName = document.getElementById('user-name');
export const parcelasLista = document.getElementById('parcelas-lista');
export const parcelasEmptyState = document.getElementById('parcelas-empty-state');
export const buscaParcelasInput = document.getElementById('busca-parcelas');
export const produtosLista = document.getElementById('produtos-lista');
export const produtosEmptyState = document.getElementById('produtos-empty-state');
export const addProductBtn = document.getElementById('add-product-btn');
export const openProductSenderBtn = document.getElementById('open-product-sender-btn');
export const productSenderPanel = document.getElementById('product-sender-panel');
export const closeProductSenderBtn = document.getElementById('close-product-sender-btn');
export const productSearchInput = document.getElementById('product-search-input');
export const productSearchResults = document.getElementById('product-search-results');
export const productModal = document.getElementById('product-modal');
export const closeModalBtn = document.getElementById('close-modal-btn');
export const productForm = document.getElementById('product-form');
export const modalTitle = document.getElementById('modal-title');
export const productIdInput = document.getElementById('product-id');
export const servicosContainer = document.getElementById('servicos-container');
// NOVA REFERÊNCIA PARA A BARRA DE RESPOSTAS RÁPIDAS
export const quickRepliesBar = document.getElementById('quick-replies-bar');
// NOVAS REFERÊNCIAS PARA O PAINEL DE PERFIL DO CLIENTE
export const openCustomerProfileBtn = document.getElementById('open-customer-profile-btn');
export const closeCustomerProfileBtn = document.getElementById('close-customer-profile-btn');
export const customerProfilePanel = document.getElementById('customer-profile-panel');
export const profileName = document.getElementById('profile-name');
export const profilePhone = document.getElementById('profile-phone');
export const profileHistoryList = document.getElementById('profile-history-list');
export const profileNotesTextarea = document.getElementById('profile-notes-textarea');
export const saveNotesBtn = document.getElementById('save-notes-btn');

// --- VARIÁVEIS DE NOTIFICAÇÃO ---
let notificationInterval = null;
const originalTitle = document.title;

// --- FUNÇÕES DE UI EXPORTADAS ---

export function startTabNotification() {
    if (notificationInterval) return;
    notificationInterval = setInterval(() => {
        document.title = document.title === originalTitle ? "🔔 Nova Mensagem!" : originalTitle;
    }, 1000);
}

export function stopTabNotification() {
    clearInterval(notificationInterval);
    notificationInterval = null;
    document.title = originalTitle;
}

export function showView(viewId) {
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewId));
}

export function toggleProductSender(show = false) {
    productSenderPanel.classList.toggle('hidden', !show);
}

export function renderProductSearchResults(products, term = '') {
    productSearchResults.innerHTML = '';
    const filteredProducts = products.filter(p => p.nome.toLowerCase().includes(term.toLowerCase()));
    if (filteredProducts.length === 0) {
        productSearchResults.innerHTML = '<li class="empty-state active">Nenhum produto encontrado.</li>';
        return;
    }
    filteredProducts.forEach(product => {
        const item = document.createElement('li');
        item.className = 'product-result-item';
        item.innerHTML = `
            <div class="info">
                <img src="${product.imagemUrl}" alt="${product.nome}">
                <div>
                    <span class="name">${product.nome}</span>
                    <span class="price">${product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            </div>
            <button class="send-product-btn" data-action="send-product" data-id="${product.id}">Enviar</button>`;
        productSearchResults.appendChild(item);
    });
}

// NOVA FUNÇÃO PARA RENDERIZAR A TAG DE RESPOSTA RÁPIDA
export function renderQuickReplyItem(replyData) {
    const button = document.createElement('button');
    button.className = 'quick-reply-tag';
    button.type = 'button';
    button.dataset.text = replyData.texto;
    button.textContent = replyData.titulo;
    quickRepliesBar.appendChild(button);
}

export function renderMessage(msgData) {
    const wrapper = document.createElement('div');
    const messageType = msgData.origem === 'cliente' ? 'contact' : 'user';
    wrapper.className = `message-wrapper ${messageType}`;
    const horario = msgData.enviadaEm?.toDate ? msgData.enviadaEm.toDate().toLocaleTimeString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR');
    wrapper.innerHTML = `
        <div class="message-bubble">
            <p>${msgData.texto}</p>
            <span class="timestamp">${horario.replace(' ', ' de ').replace(',', ' às')}</span>
        </div>`;
    chatHistoryContent.appendChild(wrapper);
    chatHistoryContent.scrollTop = chatHistoryContent.scrollHeight;
}

export function resetActiveChatPanel(unsubscribeCallback) {
    if (unsubscribeCallback) unsubscribeCallback();
    chatView.classList.remove('active');
    chatView.dataset.activeChatId = '';
    chatView.dataset.clienteId = '';
    chatHeaderName.textContent = 'Selecione um chat';
    chatHeaderNumber.textContent = 'Nenhum cliente ativo';
    chatHeaderAvatar.style.backgroundImage = 'none';
    chatHeaderAvatar.textContent = '';
    chatMessageInput.placeholder = 'Digite uma mensagem';
    activeChatPlaceholder.style.display = 'flex';
    const selectedItem = atendimentosLista.querySelector('.selected');
    if (selectedItem) selectedItem.classList.remove('selected');
    toggleProductSender(false);
    toggleCustomerProfilePanel(false); // Garante que o painel feche
}

export function updateChatHeader(clienteNome, clienteId) {
    chatView.classList.add('active');
    activeChatPlaceholder.style.display = 'none';
    chatHeaderName.textContent = clienteNome;
    chatHeaderNumber.textContent = `+${clienteId}`;
    chatHeaderAvatar.textContent = getInitials(clienteNome);
    chatMessageInput.placeholder = `Responder para ${clienteNome}...`;
    chatHistoryContent.innerHTML = '';
}

export function renderServicoCard(servicoId, servicoData) {
    const card = document.createElement('div');
    card.className = 'service-card';
    const diasDaSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasOrdenados = Object.keys(servicoData).sort((a, b) => diasDaSemana.indexOf(a) - diasDaSemana.indexOf(b));
    let daysHtml = '';
    for (const dia of diasOrdenados) {
        const horariosHtml = servicoData[dia].map(h => `<div class="time-slot">${h}</div>`).join('');
        daysHtml += `<div class="day-schedule"><div class="day-name">${dia}</div><div class="time-slots">${horariosHtml}</div></div>`;
    }
    card.innerHTML = `<h3>${servicoId}</h3>${daysHtml}`;
    servicosContainer.appendChild(card);
}

export function openProductModal(product = null) {
    productForm.reset();
    if (product) {
        modalTitle.textContent = 'Editar Produto';
        productIdInput.value = product.id;
        document.getElementById('product-name').value = product.nome;
        document.getElementById('product-price').value = product.preco;
        document.getElementById('product-stock').value = product.estoque;
        document.getElementById('product-category').value = product.categoria;
        document.getElementById('product-image').value = product.imagemUrl;
        document.getElementById('product-description').value = product.descricao || '';
    } else {
        modalTitle.textContent = 'Adicionar Novo Produto';
        productIdInput.value = '';
    }
    productModal.classList.remove('hidden');
}

export function closeProductModal() {
    productModal.classList.add('hidden');
}

export function toggleCustomerProfilePanel(show = false) {
    customerProfilePanel.classList.toggle('hidden', !show);
}

export function renderCustomerProfile(clienteData, atendimentos) {
    if (!clienteData) {
        profileName.textContent = 'Cliente não encontrado';
        profilePhone.textContent = '';
        profileHistoryList.innerHTML = '';
        profileNotesTextarea.value = '';
        return;
    }
    
    profileName.textContent = clienteData.nome;
    profilePhone.textContent = `+${clienteData.telefone}`;
    profileNotesTextarea.value = clienteData.notasDoAtendente || '';
    
    profileHistoryList.innerHTML = ''; // Limpa a lista
    if (atendimentos && atendimentos.length > 0) {
        atendimentos.forEach(atendimento => {
            const item = document.createElement('li');
            item.className = 'list-item';
            const data = atendimento.solicitadoEm.toDate().toLocaleDateString('pt-BR');
            item.innerHTML = `
                <div class="info">
                    <span class="name">Atendimento</span>
                    <span class="subtext">${data} - ${atendimento.motivo || 'Sem motivo'}</span>
                </div>
            `;
            profileHistoryList.appendChild(item);
        });
    } else {
        profileHistoryList.innerHTML = '<li class="empty-state active" style="padding: 20px 0;">Nenhum histórico encontrado.</li>';
    }
}