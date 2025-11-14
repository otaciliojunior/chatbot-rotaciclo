// js/chat.js

import * as dom from './dom.js';
import { getChatAtivoId, setChatAtivoId, getAtendimentoData } from './state.js';
import { db, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc, limit, getDocs } from './firebase.js'; 
import { popularInfoPanel } from './crmPanel.js';
import { atualizarPreviewChatList } from './chatList.js';

const API_BACKEND_URL = 'https://rotaciclo-api.onrender.com/api/enviar-mensagem';

let attachedFile = null; 
let unsubscribeMessages = null; 
let latestMessageTimestamp = null; 

function formatarTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const data = timestamp.toDate();
    const agora = new Date();
    if (data.toDateString() === agora.toDateString()) {
        return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function marcarAtendimentoComoAtivo(chatId) {
    const docRef = doc(db, "atendimentos", chatId);
    try {
        await updateDoc(docRef, {
            status: 'em_atendimento'
        });
        console.log(`[${chatId}] Status alterado para 'em_atendimento'. Bot silenciado.`);
    } catch (error) {
        console.error("Erro ao atualizar status para em_atendimento:", error);
    }
}

export async function abrirChat(chatId) {
    if (getChatAtivoId() === chatId) {
        return;
    }
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    setChatAtivoId(chatId);

    dom.chatEmptyState.classList.add("hidden");
    dom.chatWindow.classList.remove("hidden");

    let chat;
    try {
        const docRef = doc(db, "atendimentos", chatId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            console.error("Documento do chat não existe:", chatId);
            return;
        }
        chat = docSnap.data(); 
    } catch (e) {
        console.error("Erro ao buscar dados completos do chat:", e);
        chat = getAtendimentoData(chatId);
        if (!chat) return; 
    }
    
    const status = chat.status;

    if (status === 'aguardando' || status === 'navegando') {
        console.log("Assumindo chat:", chatId);
        marcarAtendimentoComoAtivo(chatId);
        dom.messageInput.disabled = false;
        dom.sendButton.disabled = false;
        dom.finishChatButton.style.display = 'flex';
        dom.messageInput.focus();

    } else if (status === 'em_atendimento') {
        console.log("Reabrindo chat em atendimento:", chatId);
        dom.messageInput.disabled = false;
        dom.sendButton.disabled = false;
        dom.finishChatButton.style.display = 'flex';
        dom.messageInput.focus();

    } else if (status === 'resolvido') {
        console.log("Visualizando histórico resolvido:", chatId);
        dom.messageInput.disabled = true; 
        dom.sendButton.disabled = true;
        dom.finishChatButton.style.display = 'none';
    }

    const fallbackAvatar = `https://i.pravatar.cc/150?u=${chatId}`;
    dom.activeChatAvatar.src = chat.cliente_foto_url || fallbackAvatar;
    dom.activeChatName.textContent = chat.cliente_nome || "Carregando...";
    
    popularInfoPanel(chatId, chat); 

    dom.messageContainer.innerHTML = "";

    if (chat.motivo) {
        const doubtCardEl = document.createElement("div");
        doubtCardEl.classList.add("doubt-card");
        doubtCardEl.innerHTML = `
            <span class="doubt-header">
                <span class="material-symbols-outlined">help_outline</span>
                Dúvida Inicial do Cliente
            </span>
            <p class="doubt-text">${chat.motivo}</p>
        `;
        dom.messageContainer.appendChild(doubtCardEl);
    }

    const chatContacts = document.querySelectorAll(`.chat-contact[data-chat-id="${chatId}"]`);
    chatContacts.forEach(contactEl => {
        contactEl.parentElement.querySelectorAll('.chat-contact').forEach(el => el.classList.remove('active'));
        contactEl.classList.add('active');
        contactEl.classList.remove('unread');
    });
    
    const messagesRef = collection(db, "atendimentos", chatId, "mensagens");

    const timestampInicio = chat.atendimentoIniciadoEm || chat.solicitadoEm; 
    
    if (!chat.atendimentoIniciadoEm) {
        console.warn(`[${chatId}] 'atendimentoIniciadoEm' não encontrado. Usando 'solicitadoEm' como fallback.`);
    }

    const historyQuery = query(
        messagesRef, 
        where("enviadaEm", ">=", timestampInicio || new Date(0)), 
        orderBy("enviadaEm", "desc"), 
        limit(30)
    );
    
    const historySnapshot = await getDocs(historyQuery);
    const historyDocs = historySnapshot.docs.reverse(); 

    let firstMessageTimestamp = null;

    for (const doc of historyDocs) {
        const msg = doc.data();
        msg.id = doc.id; 

        const msgTimestamp = msg.enviadaEm;
        const inicioTimestamp = chat.atendimentoIniciadoEm;

        if (msg.origem === 'cliente' &&
            chat.motivo && msg.texto === chat.motivo &&
            msgTimestamp &&
            inicioTimestamp &&
            typeof msgTimestamp.toMillis === 'function' &&
            (msgTimestamp.toMillis() - inicioTimestamp.toMillis() >= 0) &&
            (msgTimestamp.toMillis() - inicioTimestamp.toMillis()) < 2000)
        {
            console.log("Filtrando mensagem 'motivo' duplicada (por texto e janela de tempo):", msg.texto);
            if (!firstMessageTimestamp) {
                firstMessageTimestamp = msg.enviadaEm;
            }
            continue; 
        }

        renderizarMensagemNaTela(msg); 
        if (!firstMessageTimestamp) {
            firstMessageTimestamp = msg.enviadaEm;
        }
    }
    
    if (historyDocs.length > 0) {
        latestMessageTimestamp = historyDocs[historyDocs.length - 1].data().enviadaEm;
    } else if (firstMessageTimestamp) {
        latestMessageTimestamp = firstMessageTimestamp;
    } else {
        latestMessageTimestamp = timestampInicio || new Date(); 
    }

    dom.messageContainer.scrollTop = dom.messageContainer.scrollHeight;

    const newMessagesQuery = query(
        messagesRef, 
        where("enviadaEm", ">", latestMessageTimestamp),
        orderBy("enviadaEm", "asc")
    );

    unsubscribeMessages = onSnapshot(newMessagesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const msg = change.doc.data();
                msg.id = change.doc.id; 
                renderizarMensagemNaTela(msg); 
                latestMessageTimestamp = msg.enviadaEm;
                dom.messageContainer.scrollTop = dom.messageContainer.scrollHeight;
            }
        });
    });
}

export function triggerFileInput() {
    dom.fileInput.click();
}

export function clearFilePreview() {
    attachedFile = null;
    dom.fileInput.value = null; 
    dom.filePreviewContainer.classList.add("hidden");
    dom.previewImage.src = "";
}

export function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        console.warn("Apenas arquivos de imagem são permitidos.");
        clearFilePreview();
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        attachedFile = e.target.result; 
        dom.previewImage.src = attachedFile;
        dom.filePreviewContainer.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

export async function enviarMensagem() {
    const textoDaMensagem = dom.messageInput.value.trim();
    const fileData = attachedFile; 
    const chatId = getChatAtivoId();

    if (!chatId || (textoDaMensagem === "" && !fileData)) {
        return;
    }

    let numeroCliente;
    let chatData = getAtendimentoData(chatId);

    if (chatData && chatData.cliente_id) {
        numeroCliente = chatData.cliente_id;
    } else {
        console.warn(`Cache falhou para ${chatId}. Buscando 'cliente_id' no Firestore...`);
        try {
            const docRef = doc(db, "atendimentos", chatId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().cliente_id) {
                numeroCliente = docSnap.data().cliente_id;
            }
        } catch (e) {
            console.error("Erro crítico ao buscar cliente_id no fallback:", e);
        }
    }

    if (!numeroCliente) {
        console.error("ERRO: Não foi possível encontrar o cliente_id para enviar a mensagem.");
        alert("Erro: Não foi possível encontrar o número do cliente para enviar a mensagem.");
        return;
    }

    const attachmentUrl = fileData; 

    try {
        const payloadAPI = {
            para: numeroCliente
        };

        if (attachmentUrl) {
            payloadAPI.imageUrl = attachmentUrl; 
            payloadAPI.caption = textoDaMensagem;
        } else {
            payloadAPI.texto = textoDaMensagem;
        }
        
        await chamarApiParaEnviarMensagem(payloadAPI);
        console.log("API chamada com sucesso.");
        
        const novaMensagemObj = {
            texto: textoDaMensagem,
            origem: 'atendente',
            enviadaEm: serverTimestamp(), 
            status: 'sent'
        };
        if (attachmentUrl) {
            novaMensagemObj.attachment = attachmentUrl;
        }

        const messagesRef = collection(db, "atendimentos", chatId, "mensagens");
        await addDoc(messagesRef, novaMensagemObj);
        
        const previewText = fileData ? (textoDaMensagem || "📷 Foto") : textoDaMensagem;
        atualizarPreviewChatList(chatId, previewText, new Date()); 
        
        dom.messageInput.value = "";
        clearFilePreview(); 
        dom.messageInput.focus();
        
    } catch (error) {
        console.error("Erro ao enviar mensagem (API ou Firestore):", error);
        alert("Erro ao enviar mensagem. Verifique o console.");
    }
}

async function chamarApiParaEnviarMensagem(payload) {
    try {
        const response = await fetch(API_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro do servidor: ${response.status}`);
        }

        const result = await response.json();
        console.log("Resposta da API de envio:", result);
        return result;

    } catch (error) {
        console.error('Falha ao chamar a API do backend:', error);
        throw error; 
    }
}

function renderizarMensagemNaTela(msg) {
    const novaMensagem = document.createElement("div");
    const type = (msg.origem === 'cliente') ? 'received' : 'sent';
    
    novaMensagem.classList.add("message", type);
    novaMensagem.dataset.msgId = msg.id; 
    
    const statusIconHtml = (type === 'sent') ? getStatusIcon(msg.status) : '';
        
    const attachmentHtml = msg.attachment
        ? `<img src="${msg.attachment}" alt="Anexo" class="message-image-attachment">`
        : '';

    const textHtml = msg.texto 
        ? `<span>${msg.texto}</span>`
        : '';
        
    novaMensagem.innerHTML = `
        ${attachmentHtml}
        ${textHtml}
        <div class="message-meta">
            <span class="message-timestamp">${formatarTimestamp(msg.enviadaEm)}</span>
            ${statusIconHtml}
        </div>
    `;

    if (msg.attachment && !msg.texto) {
        novaMensagem.classList.add("image-only");
    }

    dom.messageContainer.appendChild(novaMensagem);
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
            return `<span class="message-status">done</span>`; 
    }
}

export async function finalizarAtendimento() {
    const chatId = getChatAtivoId();
    if (!chatId) {
        alert("Nenhum chat ativo para finalizar.");
        return;
    }
    
    const finalMessage = "Nosso atendimento foi finalizado. A Rota Ciclo agradece o seu contato! 👋";

    let numeroCliente;
    let chatData = getAtendimentoData(chatId);
    if (chatData && chatData.cliente_id) {
        numeroCliente = chatData.cliente_id;
    } else {
        console.warn(`Cache falhou para ${chatId}. Buscando 'cliente_id' no Firestore...`);
        try {
            const docRef = doc(db, "atendimentos", chatId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().cliente_id) {
                numeroCliente = docSnap.data().cliente_id;
            }
        } catch (e) { console.error("Erro crítico ao buscar cliente_id no fallback:", e); }
    }

    if (numeroCliente) {
        try {
            await chamarApiParaEnviarMensagem({
                para: numeroCliente,
                texto: finalMessage
            });
            console.log(`[${chatId}] Mensagem de finalização enviada para o cliente.`);
            
            const messagesRef = collection(db, "atendimentos", chatId, "mensagens");
            await addDoc(messagesRef, {
                texto: finalMessage,
                origem: 'atendente',
                enviadaEm: serverTimestamp(), 
                status: 'sent'
            });

        } catch (error) {
            console.error("Erro ao enviar mensagem final pela API:", error);
            alert("Não foi possível enviar a mensagem de finalização ao cliente, mas o chat será fechado localmente.");
        }
    } else {
        alert("Número do cliente não encontrado. O chat será fechado apenas localmente.");
    }
    
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    const docRef = doc(db, "atendimentos", chatId);
    try {
        await updateDoc(docRef, {
            status: 'resolvido'
        });
        console.log(`[${chatId}] Atendimento finalizado.`);
    } catch (error) {
        console.error("Erro ao finalizar atendimento:", error);
        alert("Erro ao finalizar o chat. Tente novamente.");
        return; 
    }

    dom.chatWindow.classList.add("hidden");
    dom.chatEmptyState.classList.remove("hidden");

    dom.messageInput.value = "";
    dom.messageInput.disabled = true; 
    dom.sendButton.disabled = true; 
    clearFilePreview(); 

    setChatAtCivoId(null);
}