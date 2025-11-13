// frontend/js/modules/api.js

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Envia uma mensagem de texto simples para a API do backend.
 * @param {string} numero - O número de destino do WhatsApp.
 * @param {string} texto - O conteúdo da mensagem.
 */
export async function enviarMensagemViaAPI(numero, texto) {
    try {
        const response = await fetch(`${API_BASE_URL}/enviar-mensagem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ para: numero, texto: texto }),
        });
        if (!response.ok) {
            throw new Error(`Falha na API: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Erro ao enviar mensagem via API:", error);
        // Lançar o erro permite que a função que chamou saiba que algo deu errado
        throw error;
    }
}

/**
 * **FUNÇÃO ATIVADA**
 * Envia uma imagem com legenda para a API do backend.
 * @param {string} numero - O número de destino do WhatsApp.
 * @param {string} imageUrl - A URL da imagem a ser enviada.
 * @param {string} caption - O texto que aparecerá como legenda da imagem.
 */
export async function enviarImagemComLegendaViaAPI(numero, imageUrl, caption) {
    try {
        // Usando a mesma rota, pois o backend já sabe lidar com imagem
        const response = await fetch(`${API_BASE_URL}/enviar-mensagem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // O corpo agora envia os dados da imagem, conforme esperado pelo backend
            body: JSON.stringify({ para: numero, imageUrl: imageUrl, caption: caption }),
        });
        if (!response.ok) {
            throw new Error(`Falha na API de imagem: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Erro ao enviar imagem via API:", error);
        throw error;
    }
}