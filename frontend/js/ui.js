// js/ui.js

// Importa os elementos do DOM que este módulo irá controlar
import * as dom from './dom.js';

// --- Arrays de Navegação (privados para este módulo) ---
// Agrupa os botões e painéis para facilitar o 'toggle'
const navButtons = [
    dom.navChatButton,
    dom.navContactsButton,
    dom.navSettingsButton
];

const sidebarPanels = [
    dom.panelChatList,
    dom.panelContacts,
    dom.panelSettings
];

/**
 * Controla qual painel da barra lateral (Coluna 2) está visível.
 * @param {string} panelToShow - O nome do painel a ser exibido ('chat', 'contacts', ou 'settings')
 */
export function showSidebarPanel(panelToShow) {
    
    // 1. Esconde todos os painéis e desativa todos os botões
    navButtons.forEach(btn => btn.classList.remove('active'));
    sidebarPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });

    // 2. Ativa o botão e o painel corretos
    switch (panelToShow) {
        case 'chat':
            dom.navChatButton.classList.add('active');
            dom.panelChatList.classList.remove('hidden');
            dom.panelChatList.classList.add('active');
            break;
        
        case 'contacts':
            dom.navContactsButton.classList.add('active');
            dom.panelContacts.classList.remove('hidden');
            dom.panelContacts.classList.add('active');
            break;

        case 'settings':
            dom.navSettingsButton.classList.add('active');
            dom.panelSettings.classList.remove('hidden');
            dom.panelSettings.classList.add('active');
            break;
    }
}