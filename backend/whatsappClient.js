// /backend/whatsappClient.js
const axios = require('axios');
const { PHONE_NUMBER_ID, META_ACCESS_TOKEN } = require('./config');

async function enviarPayloadGenerico(payload) {
    const recipientId = payload.to;
    console.log(`--- TENTANDO ENVIAR MENSAGEM PARA ${recipientId} ---`);
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };
    
    try {
        await axios.post(url, payload, { headers: headers });
        console.log(`--- MENSAGEM ENVIADA COM SUCESSO PARA ${recipientId} ---`);
    } catch (error) {
        console.error('--- ERRO AO ENVIAR MENSAGEM PELA API DA META ---');
        console.error('Payload de envio:', JSON.stringify(payload, null, 2));
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

async function enviarTexto(recipientId, text) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "text",
        text: {
            body: text
        }
    };
    await enviarPayloadGenerico(payload);
}

async function enviarImagem(recipientId, imageUrl, caption) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "image",
        image: {
            link: imageUrl
        }
    };

    if (caption) {
        payload.image.caption = caption;
    }

    await enviarPayloadGenerico(payload);
}

async function enviarLista(recipientId, bodyText, buttonText, items) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "interactive",
        interactive: {
            type: "list",
            body: {
                text: bodyText
            },
            action: {
                button: buttonText,
                sections: [
                    {
                        title: "Opções Disponíveis",
                        rows: items.map(item => ({
                            id: item.id,
                            title: item.title,
                        }))
                    }
                ]
            }
        }
    };
    await enviarPayloadGenerico(payload);
}

async function enviarBotoes(recipientId, bodyText, buttons) {
    const payload = {
        messaging_product: "whatsapp",
        to: recipientId,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: bodyText
            },
            action: {
                buttons: buttons.map(btn => ({
                    type: "reply",
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };
    await enviarPayloadGenerico(payload);
}

// ALTERAÇÃO 1: Adicionada a nova função para buscar dados do perfil
async function buscarDadosDePerfil(waId) {
    const url = `https://graph.facebook.com/v19.0/${waId}?fields=name,profile_picture_url`;
    const headers = {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`
    };

    try {
        console.log(`--- BUSCANDO DADOS DE PERFIL PARA ${waId} ---`);
        const response = await axios.get(url, { headers: headers });
        console.log(`--- DADOS DE PERFIL OBTIDOS COM SUCESSO ---`);
        return response.data; // Retorna um objeto como { name: "José", profile_picture_url: "http..." }
    } catch (error) {
        console.error('--- ERRO AO BUSCAR DADOS DO PERFIL ---');
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        return null;
    }
}

module.exports = { 
    enviarTexto, 
    enviarLista, 
    enviarBotoes,
    enviarImagem,
    // ALTERAÇÃO 2: Exportamos a nova função
    buscarDadosDePerfil 
};