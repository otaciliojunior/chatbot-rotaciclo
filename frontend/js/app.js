document.addEventListener("DOMContentLoaded", () => {

    // --- 1A. BANCO DE DADOS SIMULADO (CHAT) ---
    const chatData = {
        "1": { 
            contactInfo: { name: "Cliente 1 (Exemplo)", avatar: "https://i.pravatar.cc/150?img=1" },
            contactDetails: {
                phone: "+55 11 98765-4321", email: "cliente1@email.com",
                tags: ["VIP", "Orçamento Pendente"], notes: "Cliente parece apressado. Fazer follow-up sobre o orçamento da peça XYZ amanhã."
            },
            messages: [
                { id: "msg1", type: "received", text: "Olá, gostaria de um orçamento para a peça XYZ.", timestamp: "10:30" },
                { id: "msg2", type: "sent", text: "Olá! Claro, só um momento que vou verificar o estoque.", timestamp: "10:31", status: "read" }
            ]
        },
        "2": { 
            contactInfo: { name: "Cliente 2 (Exemplo)", avatar: "https://i.pravatar.cc/150?img=2" },
            contactDetails: {
                phone: "+55 21 91234-5678", email: "cliente2.rj@email.com",
                tags: ["Pedido Atrasado"], notes: "Pedido 12345. Verificar com a transportadora e dar retorno URGENTE."
            },
            messages: [
                { id: "msg3", type: "received", text: "Meu pedido 12345 está atrasado.", timestamp: "Ontem" },
                { id: "msg4", type: "received", text: "Pode verificar para mim?", timestamp: "Ontem" },
                { id: "msg5", type: "sent", text: "Boa tarde! Peço desculpa pela demora. Vou verificar o status do seu pedido agora mesmo.", timestamp: "08:30", status: "read" },
                { id: "msg6", type: "sent", text: "Encontrei aqui. Parece que houve um problema com a transportadora. Já estou a solicitar urgência.", timestamp: "08:31", status: "delivered" },
                { id: "msg7", type: "received", text: "Obrigado!", timestamp: "08:35" }
            ]
        },
        "3": {
            contactInfo: { name: "Cliente 3 (Novo)", avatar: "https://i.pravatar.cc/150?img=3" },
            contactDetails: { phone: "+55 81 99999-8888", email: "cliente3.pe@email.com", tags: ["Lead"], notes: "" },
            messages: [
                { id: "msg8", type: "received", text: "Vocês têm loja física?", timestamp: "11:00" }
            ]
        }
    };
    const getDefaultContactDetails = (id) => ({
        phone: "+XX X XXXX-XXXX", email: "email@desconhecido.com",
        tags: ["Novo Cliente"], notes: `Cliente ${id} iniciou contato.`
    });

    // --- 1B. DADOS DE RESPOSTAS RÁPIDAS ---
    const quickRepliesData = [
        { shortcut: "/saudacao", text: "Olá! Obrigado por entrar em contato. Como posso ajudar?" },
        { shortcut: "/momento", text: "Só um momento, por favor. Já estou verificando sua solicitação." },
        { shortcut: "/despedida", text: "Obrigado! Se precisar de mais alguma coisa, é só chamar." },
        { shortcut: "/orcamento", text: "Para qual produto ou serviço você gostaria de um orçamento?" },
        { shortcut: "/horario", text: "Nosso horário de atendimento é de Segunda a Sexta, das 8h às 18h." }
    ];

    // --- 2. VARIÁVEL DE ESTADO ---
    let chatAtivoId = "1"; 

    // --- 3. SELETORES DO DOM ---
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const messageContainer = document.getElementById("message-container");
    const chatListContainer = document.getElementById("chat-list");
    const activeChatAvatar = document.getElementById("active-chat-avatar");
    const activeChatName = document.getElementById("active-chat-name");
    const searchChatInput = document.getElementById("search-chat-input");
    const infoPanel = document.getElementById("client-info-panel");
    const toggleInfoButton = document.getElementById("toggle-info-panel");
    const closeInfoButton = document.getElementById("close-info-panel");
    const quickReplyTrigger = document.getElementById("quick-reply-trigger");
    const quickReplyPopup = document.getElementById("quick-reply-popup");
    const quickReplyList = document.getElementById("quick-reply-list");
    const infoPanelNotes = document.getElementById("info-panel-notes"); // Seletor para as Notas

    // --- 4. FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
    function inicializarDashboard() {
        
        popularListaDeChats(); 

        const chatContacts = chatListContainer.querySelectorAll(".chat-contact");
        chatContacts.forEach(contactEl => {
            const chatId = contactEl.dataset.chatId;
            contactEl.addEventListener("click", () => {
                abrirChat(chatId);
            });
        });

        abrirChat(chatAtivoId);

        // --- Ouvintes de Eventos ---
        sendButton.addEventListener("click", enviarMensagem);
        searchChatInput.addEventListener("input", filtrarChats);
        
        // Ouvintes do Painel de Info
        toggleInfoButton.addEventListener("click", toggleInfoPanel);
        closeInfoButton.addEventListener("click", toggleInfoPanel);
        infoPanelNotes.addEventListener("blur", salvarNotasDoCliente); // Ouvinte para salvar notas

        // Ouvintes de Respostas Rápidas
        quickReplyTrigger.addEventListener("click", toggleQuickReplies);
        popularRespostasRapidas();
        document.addEventListener("click", fecharPopupSeClicarFora);

        messageInput.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                if (quickReplyPopup.classList.contains("hidden")) {
                    enviarMensagem();
                }
                quickReplyPopup.classList.add("hidden"); 
                filtrarRespostasRapidas("");
            }
            else if (event.key === "/" && messageInput.value.startsWith("/")) {
                quickReplyPopup.classList.remove("hidden");
                filtrarRespostasRapidas(messageInput.value); 
            }
            else if (event.key === "Escape") {
                quickReplyPopup.classList.add("hidden");
                filtrarRespostasRapidas("");
            }
            else if (messageInput.value.startsWith("/")) {
                filtrarRespostasRapidas(messageInput.value);
            }
            else if (messageInput.value === "") {
                 quickReplyPopup.classList.add("hidden");
                 filtrarRespostasRapidas("");
            }
        });

        // Simulações (como antes)
        setTimeout(() => simularMensagemRecebida("2", "Equipe, alguma novidade sobre meu pedido?"), 5000); 
        setTimeout(() => simularMensagemRecebida("4", "Olá! Sou um novo cliente, preciso de ajuda."), 10000); 
    }

    // --- 5A. FUNÇÕES (PAINEL DE INFO) ---
    function toggleInfoPanel() {
        infoPanel.classList.toggle("open");
    }

    // MODIFICADO: Usa a variável global 'infoPanelNotes'
    function popularInfoPanel(chatId) {
        const chat = chatData[chatId];
        if (!chat) return;
        const details = chat.contactDetails || getDefaultContactDetails(chatId);
        document.getElementById("info-panel-avatar").src = chat.contactInfo.avatar;
        document.getElementById("info-panel-name").textContent = chat.contactInfo.name;
        document.getElementById("info-panel-phone").textContent = details.phone;
        document.getElementById("info-panel-email").textContent = details.email;
        infoPanelNotes.value = details.notes; // Usa a variável global
        const tagsContainer = document.getElementById("info-panel-tags");
        tagsContainer.innerHTML = "";
        if (details.tags && details.tags.length > 0) {
            details.tags.forEach(tagText => {
                const tagEl = document.createElement("span");
                tagEl.classList.add("tag");
                tagEl.textContent = tagText;
                tagsContainer.appendChild(tagEl);
            });
        }
    }
    
    /**
     * NOVO: Salva o conteúdo do textarea de notas no chatData
     */
    function salvarNotasDoCliente() {
        // Pega o texto atual do textarea
        const notas = infoPanelNotes.value;

        // Verifica se o chat ativo e os detalhes de contato existem
        if (chatAtivoId && chatData[chatAtivoId] && chatData[chatAtivoId].contactDetails) {
            // Salva as notas no nosso "banco de dados"
            chatData[chatAtivoId].contactDetails.notes = notas;
            
            // Opcional: Confirmação no console
            console.log(`Notas salvas para o Chat ${chatAtivoId}.`);
        }
    }

    // --- 5B. FUNÇÕES (RESPOSTAS RÁPIDAS) ---
    function popularRespostasRapidas() {
        quickReplyList.innerHTML = "";
        quickRepliesData.forEach(reply => {
            const itemEl = document.createElement("div");
            itemEl.classList.add("quick-reply-item");
            itemEl.dataset.reply = reply.text;
            itemEl.innerHTML = `
                <span class="shortcut">${reply.shortcut}</span>
                <span class="reply-text">${reply.text}</span>
            `;
            itemEl.addEventListener("click", () => {
                selecionarRespostaRapida(reply.text);
            });
            quickReplyList.appendChild(itemEl);
        });
    }
    function toggleQuickReplies(event) {
        event.stopPropagation(); 
        quickReplyPopup.classList.toggle("hidden");
        filtrarRespostasRapidas(""); 
    }
    function selecionarRespostaRapida(text) {
        messageInput.value = text;
        quickReplyPopup.classList.add("hidden"); 
        filtrarRespostasRapidas("");
        messageInput.focus();
    }
    function fecharPopupSeClicarFora(event) {
        if (!quickReplyPopup.classList.contains("hidden")) {
            if (!quickReplyPopup.contains(event.target) && 
                event.target !== quickReplyTrigger &&
                event.target !== messageInput) 
            {
                quickReplyPopup.classList.add("hidden");
                filtrarRespostasRapidas("");
            }
        }
    }
    function filtrarRespostasRapidas(termo) {
        const termoBusca = termo.toLowerCase();
        const itens = quickReplyList.querySelectorAll(".quick-reply-item");
        itens.forEach(item => {
            const shortcut = item.querySelector(".shortcut").textContent.toLowerCase();
            const text = item.querySelector(".reply-text").textContent.toLowerCase();
            if (shortcut.includes(termoBusca) || text.includes(termoBusca)) {
                item.style.display = "block";
            } else {
                item.style.display = "none";
            }
        });
    }

    // --- 6. FUNÇÕES DO CHAT (MODIFICADAS) ---

    function enviarMensagem() {
        const textoDaMensagem = messageInput.value.trim();

        if (textoDaMensagem !== "") {
            const agora = new Date();
            const horas = agora.getHours().toString().padStart(2, '0');
            const minutos = agora.getMinutes().toString().padStart(2, '0');
            
            const msgId = 'msg_' + agora.getTime(); 
            
            const novaMensagemObj = {
                id: msgId, 
                type: "sent", 
                text: textoDaMensagem,
                timestamp: `${horas}:${minutos}`,
                status: 'sent' 
            };

            chatData[chatAtivoId].messages.push(novaMensagemObj);
            renderizarMensagemNaTela(novaMensagemObj);
            atualizarPreviewChatList(chatAtivoId, textoDaMensagem);
            
            messageInput.value = "";
            messageInput.focus();
            messageContainer.scrollTop = messageContainer.scrollHeight;

            simularAtualizacaoStatus(chatAtivoId, msgId);
        }
    }

    function renderizarMensagemNaTela(msg) {
        const novaMensagem = document.createElement("div");
        novaMensagem.classList.add("message", msg.type);
        novaMensagem.dataset.msgId = msg.id; 
        
        const statusIconHtml = (msg.type === 'sent')
            ? getStatusIcon(msg.status)
            : '';
            
        novaMensagem.innerHTML = `
            <span>${msg.text}</span>
            <div class="message-meta">
                <span class="message-timestamp">${msg.timestamp}</span>
                ${statusIconHtml}
            </div>
        `;
        messageContainer.appendChild(novaMensagem);
    }
    
    function getStatusIcon(status) {
        switch (status) {
            case 'sent':
                return `<span class="message-status">done</span>`;
            case 'delivered':
                return `<span class="message-status">done_all</span>`;
            case 'read':
                return `<span class="message-status read">done_all</span>`;
            default:
                return ''; 
        }
    }

    function simularAtualizacaoStatus(chatId, msgId) {
        
        const atualizarDOM = (novoStatus) => {
            if (chatId !== chatAtivoId) return; 

            const msgEl = document.querySelector(`.message[data-msg-id="${msgId}"]`);
            if (msgEl) {
                const statusEl = msgEl.querySelector(".message-status");
                if (statusEl) {
                    statusEl.innerHTML = getStatusIcon(novoStatus).match(/>(.*?)</)[1]; 
                    statusEl.className = getStatusIcon(novoStatus).match(/class="(.*?)"/)[1];
                }
            }
        };

        const atualizarDados = (novoStatus) => {
             const chat = chatData[chatId];
             if (chat) {
                const msg = chat.messages.find(m => m.id === msgId);
                if (msg) {
                    msg.status = novoStatus;
                }
             }
        };

        setTimeout(() => {
            atualizarDados('delivered');
            atualizarDOM('delivered');
        }, 1500);

        setTimeout(() => {
            atualizarDados('read');
            atualizarDOM('read');
        }, 3000 + (Math.random() * 2000)); 
    }


    function abrirChat(chatId) {
        const chat = chatData[chatId];
        if (!chat) return;

        chatAtivoId = chatId;
        activeChatAvatar.src = chat.contactInfo.avatar;
        activeChatName.textContent = chat.contactInfo.name;
        
        popularInfoPanel(chatId);

        messageContainer.innerHTML = "";
        if (chat.messages.length > 0 && !chat.messages[0].id) {
             chat.messages.forEach((msg, index) => msg.id = `msg_${chatId}_${index}`);
        }
        chat.messages.forEach(msg => renderizarMensagemNaTela(msg));

        const chatContacts = chatListContainer.querySelectorAll(".chat-contact");
        chatContacts.forEach(contactEl => {
            contactEl.classList.remove("active", "unread"); 
            if (contactEl.dataset.chatId === chatId) {
                contactEl.classList.add("active");
            }
        });
        messageContainer.scrollTop = messageContainer.scrollHeight;
        messageInput.focus();
    }

    function simularMensagemRecebida(chatId, texto) {
        const agora = new Date();
        const horas = agora.getHours().toString().padStart(2, '0');
        const minutos = agora.getMinutes().toString().padStart(2, '0');
        
        const msgId = 'msg_' + agora.getTime();
        const novaMensagemObj = { id: msgId, type: "received", text: texto, timestamp: `${horas}:${minutos}` };

        if (!chatData[chatId]) {
            chatData[chatId] = {
                contactInfo: { name: `Novo Cliente (${chatId})`, avatar: `https://i.pravatar.cc/150?img=${chatId}` },
                contactDetails: getDefaultContactDetails(chatId), 
                messages: [] 
            };
            adicionarNovoChatNaLista(chatId);
        }

        chatData[chatId].messages.push(novaMensagemObj);
        atualizarPreviewChatList(chatId, texto);

        if (chatId === chatAtivoId) {
            renderizarMensagemNaTela(novaMensagemObj);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        } else {
            const contactEl = chatListContainer.querySelector(`.chat-contact[data-chat-id="${chatId}"]`);
            if (contactEl) contactEl.classList.add("unread");
        }
    }

    // --- 7. FUNÇÕES AUXILIARES (Sem mudanças) ---

    function popularListaDeChats() {
        chatListContainer.innerHTML = ""; 
        for (const chatId in chatData) {
            const chat = chatData[chatId];
            // Garante que existe uma última mensagem
            const ultimaMensagem = chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1] 
                : { text: "...", timestamp: "" };

            const contactEl = document.createElement("div");
            contactEl.classList.add("chat-contact");
            contactEl.dataset.chatId = chatId; 
            if (chatId === chatAtivoId) contactEl.classList.add("active");
            contactEl.innerHTML = `
                <img src="${chat.contactInfo.avatar}" alt="Avatar ${chat.contactInfo.name}" class="avatar">
                <div class="contact-details">
                    <span class="contact-name">${chat.contactInfo.name}</span>
                    <span class="last-message">${ultimaMensagem.text}</span>
                </div>
                <span class="message-time">${ultimaMensagem.timestamp}</span>
            `;
            chatListContainer.appendChild(contactEl);
        }
    }

    function atualizarPreviewChatList(chatId, texto) {
        const contactEl = chatListContainer.querySelector(`.chat-contact[data-chat-id="${chatId}"]`);
        if (contactEl) {
            contactEl.querySelector(".last-message").textContent = texto;
            const agora = new Date();
            const horas = agora.getHours().toString().padStart(2, '0');
            const minutos = agora.getMinutes().toString().padStart(2, '0');
            contactEl.querySelector(".message-time").textContent = `${horas}:${minutos}`;
            chatListContainer.prepend(contactEl);
        }
    }

    function adicionarNovoChatNaLista(chatId) {
        const chat = chatData[chatId];
        if (!chat) return;
        const contactEl = document.createElement("div");
        contactEl.classList.add("chat-contact");
        contactEl.dataset.chatId = chatId; 
        const ultimaMensagem = chat.messages[0] || { id: "msg_new", text: "...", timestamp: "" };
        contactEl.innerHTML = `
            <img src="${chat.contactInfo.avatar}" alt="Avatar ${chat.contactInfo.name}" class="avatar">
            <div class="contact-details">
                <span class="contact-name">${chat.contactInfo.name}</span>
                <span class="last-message">${ultimaMensagem.text}</span>
            </div>
            <span class="message-time">${ultimaMensagem.timestamp}</span>
        `;
        contactEl.addEventListener("click", () => abrirChat(chatId));
        chatListContainer.prepend(contactEl);
    }

    function filtrarChats() {
        const termo = searchChatInput.value.trim().toLowerCase();
        const chatsNaLista = chatListContainer.querySelectorAll(".chat-contact");
        chatsNaLista.forEach(chatEl => {
            const nomeContato = chatEl.querySelector(".contact-name").textContent.toLowerCase();
            if (nomeContato.includes(termo)) {
                chatEl.style.display = "flex";
            } else {
                chatEl.style.display = "none";
            }
        });
    }

    // --- 8. INICIALIZAR TUDO ---
    inicializarDashboard();
});