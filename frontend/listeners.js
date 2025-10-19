import { db, collection, query, where, onSnapshot, orderBy } from './firebase.js';
import * as UI from './ui.js';
import { getInitials } from './utils.js';

// --- ESTADO GERENCIADO POR ESTE MÓDULO ---
export let allProducts = [];
let isWindowFocused = true;
let currentQueueSize = 0;

window.addEventListener('focus', () => {
    isWindowFocused = true;
    UI.stopTabNotification();
});
window.addEventListener('blur', () => { isWindowFocused = false; });

// --- FUNÇÕES DE SETUP DOS LISTENERS ---

export function setupAtendimentosListener() {
    const q = query(collection(db, "atendimentos"), where("status", "in", ["aguardando", "em_atendimento"]), orderBy("solicitadoEm", "asc"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.size > currentQueueSize && !isWindowFocused) {
            UI.notificationSound.play().catch(e => console.warn("A reprodução de som requer interação do usuário."));
            UI.startTabNotification();
        }
        currentQueueSize = snapshot.size;
        UI.atendimentosLista.innerHTML = '';
        snapshot.forEach((doc) => {
            const a = doc.data();
            const item = document.createElement('li');
            item.className = 'chat-list-item';
            item.dataset.id = doc.id;
            item.dataset.clienteNome = a.cliente_nome;
            item.dataset.clienteId = a.cliente_id;
            item.dataset.status = a.status;
            const dataFormatada = (a.solicitadoEm && a.solicitadoEm.toDate) 
                ? a.solicitadoEm.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : new Date().toLocaleDateString('pt-BR');
            item.innerHTML = `<div class="avatar">${getInitials(a.cliente_nome)}</div><div class="chat-info"><div class="info-top"><span class="name">${a.cliente_nome}</span><span class="timestamp">${dataFormatada}</span></div><p class="last-message">${a.motivo || 'Clique para iniciar...'}</p></div>`;
            if (UI.chatView.dataset.activeChatId === doc.id) item.classList.add('selected');
            UI.atendimentosLista.appendChild(item);
        });
    }, (error) => {
        console.error("Erro no listener de atendimentos: ", error);
    });
}

export function setupProdutosListener() {
    const q = query(collection(db, "produtos"), orderBy("adicionadoEm", "desc"));
    onSnapshot(q, (snapshot) => {
        UI.produtosLista.innerHTML = '';
        UI.produtosEmptyState.classList.toggle('active', snapshot.empty);
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        allProducts.forEach(p => {
            const item = document.createElement('li');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="info">
                    <img src="${p.imagemUrl}" alt="${p.nome}">
                    <div>
                        <span class="name">${p.nome}</span>
                        <span class="subtext">${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
                <div class="actions-group">
                    <button class="action-btn" data-action="edit-product" data-id="${p.id}">Editar</button>
                    <button class="action-btn info" data-action="delete-product" data-id="${p.id}">Excluir</button>
                </div>`;
            UI.produtosLista.appendChild(item);
        });
    }, (error) => {
        console.error("Erro no listener de produtos: ", error);
    });
}

export function setupVendasListener() {
    const q = query(collection(db, "vendasParceladas"), where("status_venda", "==", "ativa"));
    onSnapshot(q, (snapshot) => {
        UI.parcelasLista.innerHTML = '';
        let count = 0;
        snapshot.forEach((doc) => {
            const v = doc.data();
            const p = v.parcelas && v.parcelas.find(p => p.status === 'pendente');
            if (p) {
                count++;
                const item = document.createElement('li');
                item.className = 'list-item parcela-item';
                item.dataset.vendaId = doc.id;
                item.dataset.parcelaNumero = p.numero;
                item.innerHTML = `<div class="info"><span class="name">${v.cliente_nome}</span><span class="subtext">Ref: ${v.produto_nome}</span></div><div class="meta"><span class="price">${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div><div class="actions-group"><button class="action-btn success" data-action="mark-paid">Marcar Paga</button></div>`;
                UI.parcelasLista.appendChild(item);
            }
        });
        UI.parcelasEmptyState.classList.toggle('active', count === 0);
    }, (error) => {
        console.error("Erro no listener de vendas: ", error);
    });
}

export function setupServicosListener() {
    const q = query(collection(db, "configuracoesServicos"));
    onSnapshot(q, (snapshot) => {
        UI.servicosContainer.innerHTML = '';
        if (snapshot.empty) {
            UI.servicosContainer.innerHTML = '<div class="empty-state active">Nenhuma configuração de serviço encontrada.</div>';
            return;
        }
        snapshot.forEach(doc => {
            UI.renderServicoCard(doc.id, doc.data());
        });
    }, (error) => {
        console.error("Erro no listener de serviços: ", error);
    });
}

// NOVA FUNÇÃO DE LISTENER PARA AS RESPOSTAS RÁPIDAS
export function setupRespostasRapidasListener() {
    const q = query(collection(db, "respostasRapidas"), orderBy("criadaEm", "desc"));
    onSnapshot(q, (snapshot) => {
        UI.quickRepliesBar.innerHTML = ''; // Limpa a barra antes de renderizar
        if (snapshot.empty) {
            return;
        }
        snapshot.forEach(doc => {
            UI.renderQuickReplyItem({ id: doc.id, ...doc.data() });
        });
    }, (error) => {
        console.error("Erro no listener de respostas rápidas: ", error);
    });
}