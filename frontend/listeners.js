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

// ================================================================
// FUNÇÃO ATUALIZADA
// ================================================================
export function setupServicosListener() {
    const q = query(collection(db, "configuracoesServicos"));
    
    onSnapshot(q, (snapshot) => {
        // 1. Encontra o container da GRID (onde os cards devem ficar)
        const gridContainer = UI.servicosContainer.querySelector('.servicos-grid');
        if (!gridContainer) {
            console.error("Elemento .servicos-grid não foi encontrado dentro de #servicos-container");
            return;
        }

        // 2. Limpa APENAS A GRID, mantendo o header da página
        gridContainer.innerHTML = ''; 
        
        if (snapshot.empty) {
            // 3. Se estiver vazio, exibe uma mensagem dentro da grid
            gridContainer.innerHTML = '<div class="empty-state active" style="display: block; text-align: left; padding: 0;">Nenhuma configuração de serviço encontrada.</div>';
            return;
        }
        
        // 4. Itera sobre os dados do Firebase e constrói o NOVO HTML do card
        snapshot.forEach(doc => {
            const servicoId = doc.id;
            const servicoData = doc.data(); // ex: { dias: { segunda: ['10:00', '16:00'], ... } }

            // Cria o elemento do card
            const card = document.createElement('div');
            card.className = 'servico-card';
            card.dataset.serviceId = servicoId;

            // ---- 4.1. Header do Card ----
            let headerHTML = `
                <div class="servico-card-header">
                    <h3>${servicoId}</h3>
                    <div class="actions-group">
                        <button class="action-btn" data-action="edit-service" data-id="${servicoId}" title="Editar Serviço">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                </div>
            `;

            // ---- 4.2. Corpo do Card (Horários) ----
            let bodyHTML = '<div class="servico-card-body"><ul class="horarios-list">';
            
            const diasOrdenados = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
            const diasData = servicoData.dias || {};

            let diasRenderizados = 0;
            // Itera na ordem correta dos dias da semana
            for (const dia of diasOrdenados) {
                // Verifica se o dia existe e tem horários
                if (diasData[dia] && Array.isArray(diasData[dia]) && diasData[dia].length > 0) {
                    diasRenderizados++;
                    const horarios = diasData[dia]; // ex: ['09:00', '11:00']
                    
                    // Mapeia cada horário para uma tag HTML
                    const tagsHTML = horarios.map(h => `<span class="time-tag">${h}</span>`).join('');
                    
                    // Adiciona a linha (li) para o dia
                    bodyHTML += `
                        <li>
                            <span class="dia">${dia}</span>
                            <div class="horarios-tags">
                                ${tagsHTML}
                            </div>
                        </li>
                    `;
                }
            }

            // Se nenhum dia com horário foi encontrado
            if (diasRenderizados === 0) {
                 bodyHTML += '<li><div class="horarios-tags"><span class="no-times">Sem horários definidos.</span></div></li>';
            }
            
            bodyHTML += '</ul></div>';
            
            // ---- 4.3. Monta o Card ----
            card.innerHTML = headerHTML + bodyHTML;
            gridContainer.appendChild(card); // Adiciona o card pronto na grid
        });
    }, (error) => {
        console.error("Erro no listener de serviços: ", error);
    });
}
// ================================================================
// FIM DA FUNÇÃO ATUALIZADA
// ================================================================


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