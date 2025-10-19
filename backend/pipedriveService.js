// backend/pipedriveService.js
const axios = require('axios');
const { pipedriveApiToken, pipedriveDomain } = require('./config');

const apiClient = axios.create({
    baseURL: `https://${pipedriveDomain}.pipedrive.com/api/v1`,
    params: {
        api_token: pipedriveApiToken,
    },
});

/**
 * Procura por uma pessoa no Pipedrive pelo número de telefone.
 * @param {string} phone - Número de telefone no formato internacional (ex: 5584999999999).
 * @returns {Promise<object|null>} Dados da pessoa se encontrada, senão null.
 */
async function findPersonByPhone(phone) {
    try {
        const response = await apiClient.get('/persons/search', {
            params: {
                term: phone,
                fields: 'phone',
                exact_match: true,
            },
        });
        if (response.data.data.items.length > 0) {
            console.log(`[Pipedrive] Contato encontrado para o telefone ${phone}`);
            return response.data.data.items[0].item;
        }
        return null;
    } catch (error) {
        console.error('[Pipedrive] Erro ao buscar pessoa:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Cria uma nova pessoa no Pipedrive.
 * @param {string} name - Nome da pessoa.
 * @param {string} phone - Telefone da pessoa.
 * @returns {Promise<object|null>} Dados da pessoa criada.
 */
async function createPerson(name, phone) {
    try {
        const response = await apiClient.post('/persons', {
            name: name,
            phone: [{ value: phone, primary: true }],
        });
        console.log(`[Pipedrive] Contato criado com ID: ${response.data.data.id}`);
        return response.data.data;
    } catch (error) {
        console.error('[Pipedrive] Erro ao criar pessoa:', error.response?.data || error.message);
        return null;
    }
}

/**
 * (NOVO) Atualiza o nome de uma pessoa existente no Pipedrive.
 * @param {number} personId - ID da pessoa no Pipedrive.
 * @param {string} newName - O novo nome completo da pessoa.
 */
async function updatePersonName(personId, newName) {
    try {
        await apiClient.put(`/persons/${personId}`, {
            name: newName,
        });
        console.log(`[Pipedrive] Nome do contato ${personId} atualizado para "${newName}".`);
    } catch (error) {
        console.error(`[Pipedrive] Erro ao atualizar o nome da pessoa ${personId}:`, error.response?.data || error.message);
    }
}


/**
 * (ATUALIZADO) Cria um novo negócio (deal) no Pipedrive, agora com valor opcional.
 * @param {string} title - Título do negócio.
 * @param {number} personId - ID da pessoa associada.
 * @param {number|null} value - Valor monetário do negócio (opcional).
 * @returns {Promise<object|null>} Dados do negócio criado.
 */
async function createDeal(title, personId, value = null) {
    try {
        const dealData = {
            title: title,
            person_id: personId,
            // stage_id: 1, // Opcional: ID da etapa inicial do seu funil. Verifique em Pipedrive > Configurações > Funis
        };

        if (value !== null) {
            dealData.value = value;
        }

        const response = await apiClient.post('/deals', dealData);
        console.log(`[Pipedrive] Negócio criado com ID: ${response.data.data.id}`);
        return response.data.data;
    } catch (error) {
        console.error('[Pipedrive] Erro ao criar negócio:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Adiciona uma nota a um negócio existente.
 * @param {string} content - Conteúdo da nota.
 * @param {number} dealId - ID do negócio.
 */
async function addNoteToDeal(content, dealId) {
    try {
        await apiClient.post('/notes', {
            content: content,
            deal_id: dealId,
        });
        console.log(`[Pipedrive] Nota adicionada ao negócio ${dealId}`);
    } catch (error) {
        console.error('[Pipedrive] Erro ao adicionar nota:', error.response?.data || error.message);
    }
}


module.exports = {
    findPersonByPhone,
    createPerson,
    updatePersonName, // Exporta a nova função
    createDeal,
    addNoteToDeal
};