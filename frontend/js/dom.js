// js/dom.js (Completo e Atualizado)

// Seleciona e exporta todos os elementos do DOM que precisamos
export const messageInput = document.getElementById("message-input");
export const sendButton = document.getElementById("send-button");
export const messageContainer = document.getElementById("message-container");
export const chatListContainer = document.getElementById("chat-list");

// Header do Chat Ativo
export const activeChatAvatar = document.getElementById("active-chat-avatar");
export const activeChatName = document.getElementById("active-chat-name");

// Pesquisa da Lista de Chats
export const searchChatInput = document.getElementById("search-chat-input");

// Painel de Info (CRM)
export const infoPanel = document.getElementById("client-info-panel");
export const toggleInfoButton = document.getElementById("toggle-info-panel");
export const closeInfoButton = document.getElementById("close-info-panel");
export const infoPanelNotes = document.getElementById("info-panel-notes");
export const infoPanelAvatar = document.getElementById("info-panel-avatar");
export const infoPanelName = document.getElementById("info-panel-name");
export const infoPanelPhone = document.getElementById("info-panel-phone");
export const infoPanelEmail = document.getElementById("info-panel-email");
export const infoPanelTags = document.getElementById("info-panel-tags");

// Respostas Rápidas
export const quickReplyTrigger = document.getElementById("quick-reply-trigger");
export const quickReplyPopup = document.getElementById("quick-reply-popup");
export const quickReplyList = document.getElementById("quick-reply-list");

// Seletores de Anexo de Arquivo
export const attachFileTrigger = document.getElementById("attach-file-trigger");
export const fileInput = document.getElementById("file-input");
export const filePreviewContainer = document.getElementById("file-preview-container");
export const previewImage = document.getElementById("preview-image");
export const removePreviewButton = document.getElementById("remove-preview");

// Navegação Principal (Coluna 1) e Painéis (Coluna 2)
export const navChatButton = document.getElementById("nav-chat");
export const navContactsButton = document.getElementById("nav-contacts");
export const navSettingsButton = document.getElementById("nav-settings");

export const panelChatList = document.getElementById("panel-chat-list");
export const panelContacts = document.getElementById("panel-contacts");
export const panelSettings = document.getElementById("panel-settings");

// Menu de Opções do Chat (Finalizar)
export const chatOptionsTrigger = document.getElementById("chat-options-trigger");
export const chatOptionsMenu = document.getElementById("chat-options-menu");
export const finishChatButton = document.getElementById("finish-chat-button");

// Painéis da Coluna 3 (Chat e Vazio)
export const chatWindow = document.getElementById("chat-window");
export const chatEmptyState = document.getElementById("chat-empty-state");

// Painel de Histórico de Contatos (Coluna 2)
export const searchContactsInput = document.getElementById("search-contacts-input");
export const contactHistoryList = document.getElementById("contact-history-list");

// --- NOVOS ITENS ADICIONADOS ---

// Painel de Configurações
export const settingsProfileName = document.getElementById("settings-profile-name");
export const settingsProfileEmail = document.getElementById("settings-profile-email");
export const settingsAvatar = document.getElementById("settings-avatar");

// Botão de Logout
export const logoutButton = document.getElementById("logout-button");