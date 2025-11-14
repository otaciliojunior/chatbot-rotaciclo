const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { db, getUserState, updateUserState, deleteUserState } = require('./firestoreService');
const { 
    enviarTexto, 
    enviarLista, 
    enviarBotoes, 
    enviarImagemComLegenda 
} = require('./whatsappClient');

const botMessages = {
    welcomeFirstTime: (userName) => `Fala, ${userName}! Bem-vindo(a) à *Rota Ciclo*! Esse é nosso novo canal de atendimento automático, feito para deixar sua experiência mais prática e aproximar você ainda mais da nossa loja. Bora pedalar junto nessasSwnova rota? 🚴🏼`,
    welcomeReturn: (userName) => `Fala, ${userName}! Bem-vindo(a) de volta à *Rota Ciclo*!`,
    invalidOption: "Ops, não entendi essa opção 🤔. Tenta clicar em uma das opções do menu, beleza?",
    thankYou: "Beleza! Se precisar de mais alguma coisa, é só chamar.",
    mainMenuHeader: "*Por favor, selecione a opção* que melhor representa a sua necessidade.\n\nPara retornar ao menu principal a qualquer momento, digite *Menu*. 😉",
    askBikeType: "Boa escolha! 🚴 Temos bikes pra todo tipo de rolê. Qual categoria você procura?",
    askPartsCategory: "Certo! Sobre qual categoria de peças e acessórios você gostaria de saber?", 
    askIluminacaoHandoff: "Você deseja falar com um atendente para finalizar a compra ou saber mais informações do produto?",
    camarasPriceTable: "Legal! Nossas câmaras de ar têm um excelente custo-benefício. Confira os valores:\n\n*TABELA DE PREÇOS - CÂMARAS DE AR*\n\n*KENDA*\n• Aro 29 (Bico Fino/Grosso): *R$ 35,00*\n• Aro 26 (Bico Grosso): *R$ 25,00*\n• Aro 24 (Bico Grosso): *R$ 25,00*\n• Aro 20 (Bico Grosso): *R$ 25,00*\n\n*PIRELLI*\n• Aro 29 (Bico Fino): *R$ 40,00*",
    askCamarasHandoff: "Deseja continuar a compra e finalizar?",
    askPneuSize: "Entendido. Qual o tamanho do pneu que você procura?",
    pneuSizeConfirmation: (aro) => `Você escolheu pneu *aro ${aro}*. Vou transferir para um atendente para entender melhor sua necessidade e finalizar a compra.`,
    partsGoodbye: "Tudo bem! Se precisar de algo mais, é só chamar.",
    productCaption: (bike) => `*${bike.nome}*\n\n${bike.descricao || 'Descrição não informada.'}\n\n*Preço:* ${bike.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n*Estoque:* ${bike.estoque || 'Consultar'} unidade(s)`,
    noBikesFound: (bikeType) => `Poxa, no momento estamos sem bikes na categoria *${bikeType}*. 😕\n\nDigite 'menu' para ver outras opções.`,
    productOutOfStock: (productName) => `Poxa, o item *${productName}* acabou de esgotar em nosso estoque! 😕\n\nVamos voltar ao menu para você escolher outro modelo, combinado?`,
    addToCartPrompt: "Qual destes modelos você gostaria de adicionar ao carrinho?",
    itemAddedToCart: (productName) => `✅ *${productName}* foi adicionado ao seu carrinho!`,
    afterAddToCartOptions: "Legal! O que você gostaria de fazer agora?",
    cartHeader: "🛒 *Seu Carrinho de Compras*",
    cartItem: (item) => `*${item.quantidade}x* ${item.nome} - *${(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`,
    cartTotal: (total) => `\n*Total:* *${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`,
    cartEmpty: "Seu carrinho está vazio no momento. Que tal dar uma olhada nos nossos produtos?",
    cartCleared: "✅ Seu carrinho foi esvaziado com sucesso!",
    cartActionsPrompt: "O que deseja fazer?",
    askForName: "Para finalizar, qual é o seu nome completo?",
    askForAddress: (name) => `Obrigado, ${name}! Agora, por favor, digite o seu endereço completo para a entrega (Rua, Número, Bairro, Cidade).`,
    askForPayment: "Perfeito. E como prefere pagar?",
    orderSuccess: (orderId) => `✅ Pedido recebido com sucesso!\n\nO número do seu pedido é *#${orderId}*.\n\nEntraremos em contato em breve para confirmar os detalhes do pagamento e da entrega. Obrigado por comprar na Rota Ciclo!`,
    orderError: "Ocorreu um erro ao processar o seu pedido. Por favor, tente novamente ou fale com um atendente.",
    orderStockError: (productName) => `Ops! 😟 Parece que o item *${productName}* esgotou enquanto você finalizava a compra. Por favor, remova-o do carrinho ou digite 'menu' para recomeçar.`,
    financeHeader: "Beleza, consultando seus dados financeiros... 🔎",
    financeInstallmentInfo: (venda) => `📄 Ref: *${venda.produto_nome}*\n🔢 Parcela: *${venda.proxima_parcela.numero}*\n💰 Valor: *R$ ${venda.proxima_parcela.valor.toFixed(2).replace('.', ',')}*\n🗓️ Vencimento: *${venda.proxima_parcela.data_vencimento.toDate().toLocaleDateString('pt-BR')}*`,
    financeNoPending: "Boas notícias! 🎉 Você não tem nenhuma parcela pendente com a gente no momento.",
    financeNotFound: "Não encontrei nenhuma compra parcelada registrada para o seu número. Se você acredita que isso é um erro, por favor, fale com um atendente.",
    financeError: "Ops, não consegui consultar seus dados agora. Tente novamente mais tarde, por favor.",
    askServiceType: "Claro! Qual dos nossos serviços de oficina você procura?",
    listAvailableDays: (serviceType) => `Show! Para *${serviceType}*, temos horários nos seguintes dias. Qual dia você prefere?`,
    noSchedulesFound: "Poxa, parece que não temos horários disponíveis para este serviço no momento. Tente novamente mais tarde.",
    noSchedulesFoundForService: (serviceName) => `Ops! Parece que o serviço *${serviceName}* não está com dias configurados no nosso painel. Já avisei um atendente.`,
    invalidDay: "Esse dia não tá disponível ou foi digitado errado 🤷. Escolhe um dos que te passei, beleza?",
    listAvailableTimes: (day, service) => `Fechado! Para *${service}* na *${day}*, temos esses horários disponíveis. Qual te serve melhor?`,
    invalidTime: "Esse horário não rola 😬. Escolhe um dos que eu te mostrei.",
    bookingSuccess: (service, day, time) => `✅ Agendamento confirmado!\n\nSeu serviço de *${service}* foi marcado para *${day}* às *${time}*.\n\nObrigado por escolher a Rota Ciclo! 🚴‍♂️`,
    adHandoff: (userName) => `Olá, ${userName}! Vi que você se interessou pelo nosso anúncio. Excelente escolha! 🤩\n\nJá estou passando sua solicitação para um especialista que vai te dar todos os detalhes. Só aguarda um pouquinho!`,
    requestHumanHandoffReason: "Beleza! Pra agilizar, me conta em uma mensagem só qual é a sua dúvida principal.\n\n_(Obs: não consigo entender áudios, só texto 🫱🏼‍🫲🏽)_",
    humanRequestSuccess: "Pronto! Sua solicitação já tá na fila. Um dos nossos vai falar contigo aqui mesmo, só aguarda um pouquinho 😉.",
    humanHandoff: "Entendi. Para te ajudar melhor com isso, estou te transferindo para um de nossos especialistas. Em instantes, alguém falará com você aqui mesmo. 👍",
    humanRequestError: "Deu erro ao registrar sua solicitação 😕. Tenta de novo mais tarde ou chama a gente no (84) 8750-4756",
};

const diasFormatados = {
    "segunda": "Segunda-feira",
    "terca": "Terça-feira",
    "quarta": "Quarta-feira",
    "quinta": "Quinta-feira",
    "sexta": "Sexta-feira",
    "sabado": "Sábado",
    "domingo": "Domingo"
};

function getIntention(message) {
    const lowerCaseMessage = message.toLowerCase();

    const humanKeywords = ['falar', 'atendente', 'humano', 'ajuda', 'pessoa', 'problema', 'alguem'];
    if (humanKeywords.some(keyword => lowerCaseMessage.includes(keyword))) return "falar com atendente";
    
    const productKeywords = ['bike', 'bicicleta', 'produto', 'comprar', 'ver', 'modelo', 'preço', 'catalogo'];
    if (productKeywords.some(keyword => lowerCaseMessage.includes(keyword))) return "bicicletas (produtos)";
    
    const financeKeywords = ['parcela', 'pagamento', 'boleto', 'dívida', 'financeiro', 'valor', 'conta'];
    if (financeKeywords.some(keyword => lowerCaseMessage.includes(keyword))) return "consultar parcelas";
    
    const scheduleKeywords = ['agendar', 'agendamento', 'revisão', 'consertar', 'manutenção', 'arrumar', 'oficina'];
    if (scheduleKeywords.some(keyword => lowerCaseMessage.includes(keyword))) return "revisão / agendamento";
    
    const cartKeywords = ['carrinho', 'ver carrinho', 'meu pedido', 'minhas compras'];
    if (cartKeywords.some(keyword => lowerCaseMessage.includes(keyword))) return "menu_ver_carrinho";
    
    return message;
}

async function encaminharParaAtendente(userNumber, atendimentoId, motivo, userMessage = null) {
    console.log(`[${userNumber}] Encaminhando para atendente. Motivo: ${motivo}`);
    
    if (userMessage) {
        const messagesRef = db.collection('atendimentos').doc(atendimentoId).collection('mensagens');
        await messagesRef.add({
            texto: userMessage,
            origem: 'cliente',
            enviadaEm: Timestamp.now()
        });
    }

    await db.collection('atendimentos').doc(atendimentoId).update({ 
        motivo: motivo,
        status: 'aguardando',
        atendimentoIniciadoEm: Timestamp.now()
    });
    
    await enviarTexto(userNumber, botMessages.humanHandoff);
    await deleteUserState(userNumber);
}

async function processarMensagem(userNumber, userName, userMessage, waId, referralData = null) {
    
    const originalMsg = typeof userMessage === 'string' ? userMessage.trim() : userMessage;
    const msg = originalMsg.toLowerCase();
    
    if (referralData) {
        console.log(`[${userNumber}] Cliente chegou via Anúncio (CTW). Source ID: ${referralData.source_id || 'N/A'}`);
        const atendimentosRef = db.collection('atendimentos');
        const q = atendimentosRef.where('cliente_id', '==', userNumber).orderBy('solicitadoEm', 'desc').limit(1);
        const snapshot = await q.get();
        let atendimentoId;

        if (snapshot.empty) {
            const fotoUrl = null;
            const newAtendimentoRef = await atendimentosRef.add({
                cliente_id: userNumber,
                cliente_nome: userName,
                cliente_foto_url: fotoUrl,
                status: 'aguardando', 
                solicitadoEm: Timestamp.now(),
                motivo: "Vindo de Anúncio"
            });
            atendimentoId = newAtendimentoRef.id;
        } else {
            atendimentoId = snapshot.docs[0].id;
        }

        const adHeadline = referralData.headline || "Produto do Anúncio";
        const motivoHandoff = `Interesse via Anúncio: ${adHeadline}. (Mensagem: "${userMessage}")`;
        
        const messagesRef = db.collection('atendimentos').doc(atendimentoId).collection('mensagens');
        await messagesRef.add({
            texto: originalMsg,
            origem: 'cliente',
            enviadaEm: Timestamp.now()
        });
        
        await db.collection('atendimentos').doc(atendimentoId).update({ 
            motivo: motivoHandoff,
            status: 'aguardando',
            atendimentoIniciadoEm: Timestamp.now()
        });
        
        await enviarTexto(userNumber, botMessages.adHandoff(userName));
        await deleteUserState(userNumber); 
        return; 
    }

    const atendimentosRef = db.collection('atendimentos');
    const q = atendimentosRef.where('cliente_id', '==', userNumber).orderBy('solicitadoEm', 'desc').limit(1);
    const snapshot = await q.get();
    let atendimentoId;
    let isNewConversation = true; 
    let isFirstContactEver = snapshot.empty; 
    
    if (!isFirstContactEver) {
        const lastAtendimento = snapshot.docs[0].data();
        atendimentoId = snapshot.docs[0].id;
        if (lastAtendimento.status === 'aguardando' || lastAtendimento.status === 'em_atendimento' || lastAtendimento.status === 'navegando' || lastAtendimento.status === 'navegando_avisado') {
            isNewConversation = false;
        }
    }
    
    if (isNewConversation) {
        if (isFirstContactEver) {
            console.log(`[${userNumber}] Primeiro contato de ${userName}.`);
            await enviarTexto(userNumber, botMessages.welcomeFirstTime(userName));
        } else {
            console.log(`[${userNumber}] Cliente ${userName} retornou após atendimento resolvido.`);
            await enviarTexto(userNumber, botMessages.welcomeReturn(userName));
        }

        const fotoUrl = null;
        const newAtendimentoRef = await atendimentosRef.add({
            cliente_id: userNumber,
            cliente_nome: userName,
            cliente_foto_url: fotoUrl,
            status: 'navegando',
            solicitadoEm: Timestamp.now(),
            ultimaInteracao: Timestamp.now(),
            motivo: null
        });
        atendimentoId = newAtendimentoRef.id;

        console.log(`[${userNumber}] Novo atendimento ${atendimentoId} criado.`);
        await updateUserState(userNumber, { state: 'AWAITING_CHOICE' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        await enviarMenuPrincipalComoLista(userNumber, { state: 'AWAITING_CHOICE' });
        return; 
    }
    
    console.log(`[${userNumber}] Atendimento ativo ${atendimentoId} encontrado.`);
    
    const atendimentoRef = db.collection('atendimentos').doc(atendimentoId);
    const userSession = await getUserState(userNumber) || {};
    let currentState = userSession.state || 'AWAITING_CHOICE';
    
    const docSnap = await atendimentoRef.get();
    if (docSnap.exists) {
        const currentStatus = docSnap.data().status;
        
        if ((currentStatus === 'em_atendimento' || currentStatus === 'aguardando' || currentStatus === 'em_atendimento_avisado') && currentState !== 'AWAITING_HUMAN_REQUEST_REASON') {
            console.log(`[${userNumber}] Atendimento com status '${currentStatus}'. Mensagem salva, sem resposta do bot.`);
            
            const messagesRef = db.collection('atendimentos').doc(atendimentoId).collection('mensagens');
            await messagesRef.add({
                texto: originalMsg,
                origem: 'cliente',
                enviadaEm: Timestamp.now()
            });

            let updateData = {
                ultimaInteracao: Timestamp.now()
            };
            
            if (currentStatus === 'em_atendimento_avisado') {
                updateData.status = 'em_atendimento';
            }

            await atendimentoRef.update(updateData);
            return;
        }
    }

    await atendimentoRef.update({ 
        status: 'navegando',
        ultimaInteracao: Timestamp.now() 
    });

    console.log(`[${userNumber}] Estado do Bot: ${currentState} | Mensagem: "${userMessage}"`);

    if (["menu", "voltar", "cancelar", "continue_shopping"].includes(msg)) {
        userSession.state = 'AWAITING_CHOICE';
        delete userSession.displayedProducts;
        delete userSession.checkoutData;
        delete userSession.agendamento;
        await updateUserState(userNumber, userSession);
        await db.collection('atendimentos').doc(atendimentoId).update({ ultimaInteracao: Timestamp.now() });
        await enviarMenuPrincipalComoLista(userNumber, userSession);
        return;
    }
    
    switch (currentState) {
        case 'AWAITING_CHOICE': {
            const intention = getIntention(msg);
            if (intention === "bicicletas (produtos)" || msg === 'menu_produtos') {
                const botoesBike = [ { id: "bike_estrada", title: "Estrada 🛣️" }, { id: "bike_mtb", title: "MTB (Trilha) 🌄" }, { id: "bike_passeio", title: "Passeio 🌳" } ];
                await enviarBotoes(userNumber, botMessages.askBikeType, botoesBike);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_BIKE_TYPE' });
            } else if (msg === 'menu_pecas' || msg.startsWith('peças e acessórios')) {
                const pecasOpcoes = [ { id: "peca_iluminacao", title: "Iluminação" }, { id: "peca_pneumaticos", title: "Pneumáticos" }, ];
                await enviarLista(userNumber, botMessages.askPartsCategory, "Categorias", pecasOpcoes);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_PARTS_PRIMARY_CATEGORY' });
            } else if (intention === "consultar parcelas" || msg === 'menu_financeiro') {
                await consultarEExibirParcelas(userNumber);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await enviarMenuPrincipalComoLista(userNumber, userSession);
            } else if (intention === "revisão / agendamento" || msg === 'menu_agendamento') {
                const servicosRef = db.collection('configuracoesServicos');
                const servicosSnapshot = await servicosRef.get();
                if (servicosSnapshot.empty) {
                    console.error(`[${userNumber}] ERRO: Coleção 'configuracoesServicos' está vazia.`);
                    await encaminharParaAtendente(userNumber, atendimentoId, "Erro: 'configuracoesServicos' não encontrada no painel.", originalMsg);
                    break;
                }
                const servicosDisponiveis = [];
                servicosSnapshot.forEach(doc => {
                    servicosDisponiveis.push({ id: doc.id, title: doc.id }); 
                });
                if (servicosDisponiveis.length > 0) {
                    await updateUserState(userNumber, { ...userSession, state: 'AWAITING_SCHEDULE_SERVICE_SELECTED' });
                    await enviarLista(userNumber, botMessages.askServiceType, "Tipos de Serviço", servicosDisponiveis);
                } else {
                    await encaminharParaAtendente(userNumber, atendimentoId, "Erro: Nenhum serviço configurado no painel.", originalMsg);
                }
            } else if (intention === "menu_ver_carrinho") {
                await enviarResumoCarrinho(userNumber, userSession);
            } else if (intention === "falar com atendente" || msg === 'menu_atendente') {
                await enviarTexto(userNumber, botMessages.requestHumanHandoffReason);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_HUMAN_REQUEST_REASON' });
            } else {
                const motivo = `Cliente enviou uma opção não reconhecida no menu principal: "${userMessage}"`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }
            
        case 'AWAITING_PARTS_PRIMARY_CATEGORY': {
            if (msg.includes('iluminação')) {
                const buttons = [{ id: 'sim', title: 'Sim' }, { id: 'nao', title: 'Não' }];
                await enviarBotoes(userNumber, botMessages.askIluminacaoHandoff, buttons);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_ILUMINACAO_HANDOFF_CONFIRMATION' });
            } else if (msg.includes('pneumáticos')) {
                const pneumaticoOpcoes = [{ id: 'peca_camaras', title: 'Câmaras' }, { id: 'peca_pneus', title: 'Pneus' }];
                await enviarLista(userNumber, 'Temos Câmaras e Pneus. Qual você procura?', 'Subcategorias', pneumaticoOpcoes);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_PNEUMATICOS_SUBCATEGORY' });
            } else { await enviarTexto(userNumber, botMessages.invalidOption); }
            break;
        }
        
        case 'AWAITING_ILUMINACAO_HANDOFF_CONFIRMATION': {
            if (msg === 'sim') {
                await encaminharParaAtendente(userNumber, atendimentoId, "Interesse em Peças: Iluminação", "Sim");
            } else if (msg === 'nao') {
                await enviarTexto(userNumber, botMessages.partsGoodbye);
                userSession.state = 'AWAITING_CHOICE';
                await updateUserState(userNumber, userSession);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await enviarMenuPrincipalComoLista(userNumber, userSession);
            } else { await enviarTexto(userNumber, botMessages.invalidOption); }
            break;
        }
        
        case 'AWAITING_PNEUMATICOS_SUBCATEGORY': {
            if (msg.includes('câmaras')) {
                await enviarTexto(userNumber, botMessages.camarasPriceTable);
                await new Promise(resolve => setTimeout(resolve, 1500));
                const buttons = [{ id: 'sim', title: 'Sim' }, { id: 'nao', title: 'Não' }];
                await enviarBotoes(userNumber, botMessages.askCamarasHandoff, buttons);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_CAMARAS_HANDOFF_CONFIRMATION' });
            } else if (msg.includes('pneus')) {
                const pneuSizeButtons = [{ id: 'aro_15', title: 'Aro 15' }, { id: 'aro_20', title: 'Aro 20' }, { id: 'aro_29', title: 'Aro 29' }];
                await enviarBotoes(userNumber, botMessages.askPneuSize, pneuSizeButtons);
                await updateUserState(userNumber, { ...userSession, state: 'AWAITING_PNEU_SIZE' });
            } else { await enviarTexto(userNumber, botMessages.invalidOption); }
            break;
        }
        
        case 'AWAITING_CAMARAS_HANDOFF_CONFIRMATION': {
             if (msg === 'sim') {
                await encaminharParaAtendente(userNumber, atendimentoId, "Interesse em Peças: Câmaras de Ar", "Sim");
            } else if (msg === 'nao') {
                await enviarTexto(userNumber, botMessages.partsGoodbye);
                userSession.state = 'AWAITING_CHOICE';
                await updateUserState(userNumber, userSession);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await enviarMenuPrincipalComoLista(userNumber, userSession);
            } else { await enviarTexto(userNumber, botMessages.invalidOption); }
            break;
        }
        
        case 'AWAITING_PNEU_SIZE': {
            let aroSelecionado = '';
            if (msg.includes('15')) aroSelecionado = '15';
            else if (msg.includes('20')) aroSelecionado = '20';
            else if (msg.includes('29')) aroSelecionado = '29';
            if (aroSelecionado) {
                await enviarTexto(userNumber, botMessages.pneuSizeConfirmation(aroSelecionado));
                await new Promise(resolve => setTimeout(resolve, 1500));
                const motivo = `Interesse em Peças: Pneus (Aro ${aroSelecionado})`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            } else { await enviarTexto(userNumber, botMessages.invalidOption); }
            break;
        }

        case 'AWAITING_SCHEDULE_SERVICE_SELECTED': {
            const servicoNome = originalMsg;
            const servicoRef = db.collection('configuracoesServicos').doc(servicoNome);
            const servicoDoc = await servicoRef.get();

            if (!servicoDoc.exists) {
                await enviarTexto(userNumber, botMessages.invalidOption);
                await encaminharParaAtendente(userNumber, atendimentoId, `Tentativa de agendar serviço inexistente: ${servicoNome}`, originalMsg);
                break;
            }

            const servicoData = servicoDoc.data();
            const diasDisponiveis = Object.keys(servicoData).filter(dia => 
                diasFormatados[dia] && servicoData[dia].length > 0
            );

            if (diasDisponiveis.length === 0) {
                await enviarTexto(userNumber, botMessages.noSchedulesFoundForService(servicoNome));
                await encaminharParaAtendente(userNumber, atendimentoId, `Serviço ${servicoNome} sem dias configurados.`, originalMsg);
                break;
            }

            userSession.agendamento = {
                servicoNome: servicoNome,
                horariosDoServico: servicoData 
            };

            const diasLista = diasDisponiveis.map(dia => ({ id: dia, title: diasFormatados[dia] }));
            
            await updateUserState(userNumber, { ...userSession, state: 'AWAITING_SCHEDULE_DAY' });
            await enviarLista(userNumber, botMessages.listAvailableDays(servicoNome), "Dias Disponíveis", diasLista);
            break;
        }

        case 'AWAITING_SCHEDULE_DAY': {
            let diaSelecionado = msg; 
            if (!diasFormatados[diaSelecionado]) {
                const diaKeyEncontrado = Object.keys(diasFormatados).find(key => diasFormatados[key].toLowerCase() === msg);
                if (diaKeyEncontrado) {
                    diaSelecionado = diaKeyEncontrado;
                }
            }

            const horariosDoServico = userSession.agendamento.horariosDoServico;
            
            if (horariosDoServico && horariosDoServico[diaSelecionado] && horariosDoServico[diaSelecionado].length > 0) {
                userSession.agendamento.dia = diaSelecionado;
                const horariosPadrao = horariosDoServico[diaSelecionado]; 

                const agendamentosRef = db.collection('agendamentos');
                const q = agendamentosRef.where('dia', '==', diaSelecionado).where('status', '==', 'pendente');
                const snapshot = await q.get();
                const horariosOcupados = snapshot.docs.map(doc => doc.data().horario);
                
                const horariosDisponiveis = horariosPadrao.filter(h => !horariosOcupados.includes(h));

                if (horariosDisponiveis.length > 0) {
                    const horariosLista = horariosDisponiveis.map(h => ({ id: h, title: h }));
                    const diaFormatado = diasFormatados[diaSelecionado];
                    await updateUserState(userNumber, { ...userSession, state: 'AWAITING_SCHEDULE_TIME' });
                    await enviarLista(userNumber, botMessages.listAvailableTimes(diaFormatado, userSession.agendamento.servicoNome), "Horários", horariosLista);
                } else {
                    await enviarTexto(userNumber, `Poxa, todos os horários para *${diasFormatados[diaSelecionado]}* já foram preenchidos. Por favor, escolha outro dia.`);
                }
            } else {
                await enviarTexto(userNumber, botMessages.invalidDay);
            }
            break;
        }
        
        case 'AWAITING_SCHEDULE_TIME': {
            const horarioSelecionado = msg; 
            const { servicoNome, dia, horariosDoServico } = userSession.agendamento;
            
            const horariosPadrao = horariosDoServico[dia];
            const agendamentosRefTime = db.collection('agendamentos');
            const qTime = agendamentosRefTime.where('dia', '==', dia).where('status', '==', 'pendente');
            const snapshotTime = await qTime.get();
            const horariosOcupados = snapshotTime.docs.map(doc => doc.data().horario);
            const horariosDisponiveis = horariosPadrao.filter(h => !horariosOcupados.includes(h));

            if (horariosDisponiveis.includes(horarioSelecionado)) {
                userSession.agendamento.horario = horarioSelecionado;
                try {
                    await criarAgendamento(userNumber, userName, userSession.agendamento);
                    const diaFormatado = diasFormatados[dia];
                    await enviarTexto(userNumber, botMessages.bookingSuccess(servicoNome, diaFormatado, horarioSelecionado));
                    delete userSession.agendamento;
                    await updateUserState(userNumber, {...userSession, state: 'AWAITING_CHOICE'});
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await enviarMenuPrincipalComoLista(userNumber, userSession);
                } catch (error) {
                    console.error(`[${userNumber}] Erro ao criar agendamento:`, error);
                    await encaminharParaAtendente(userNumber, atendimentoId, "Falha ao criar agendamento no Firestore", originalMsg);
                }
            } else {
                await enviarTexto(userNumber, botMessages.invalidTime);
            }
            break;
        }

        case 'AWAITING_HUMAN_REQUEST_REASON': {
            const motivo = userMessage;
            
            const messagesRef = db.collection('atendimentos').doc(atendimentoId).collection('mensagens');
            await messagesRef.add({
                texto: motivo,
                origem: 'cliente',
                enviadaEm: Timestamp.now()
            });

            await db.collection('atendimentos').doc(atendimentoId).update({ 
                motivo: motivo, 
                status: 'aguardando',
                atendimentoIniciadoEm: Timestamp.now()
            });
            
            await enviarTexto(userNumber, botMessages.humanRequestSuccess); 
            console.log(`[${userNumber}] Motivo do atendimento ${atendimentoId} atualizado para: "${motivo}"`);
            await deleteUserState(userNumber);
            break;
        }

        case 'AWAITING_BIKE_TYPE': {
            let bikeType = null;
            if (msg === 'bike_estrada') bikeType = 'estrada';
            if (msg === 'bike_mtb') bikeType = 'mtb';
            if (msg === 'bike_passeio') bikeType = 'passeio';
            if (bikeType) {
                await enviarCatalogoDeProdutos(userNumber, userSession, bikeType, atendimentoId, originalMsg);
            } else {
                const motivo = `Cliente selecionou um tipo de bike inválido: "${userMessage}"`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }
        
        case 'AWAITING_PRODUCT_SELECTION_FOR_CART': {
            const productMap = userSession.displayedProducts || {};
            let productId = null;
            
            const possibleProduct = Object.keys(productMap).find(fullName => 
                originalMsg.endsWith('...') ? fullName.startsWith(originalMsg.slice(0, -3)) : fullName === originalMsg
            );
            
            if (possibleProduct) { 
                productId = productMap[possibleProduct]; 
            } else if (originalMsg.startsWith('add_')) {
                productId = originalMsg.split('add_')[1];
            }
            
            if (productId) {
                try {
                    const productRef = db.collection('produtos').doc(productId);
                    const productSnap = await productRef.get();
                    
                    if (productSnap.exists) {
                        const productData = productSnap.data();
                        
                        if (productData.estoque && productData.estoque > 0) {
                            if (!userSession.cart) userSession.cart = [];
                            const itemNoCarrinho = userSession.cart.find(item => item.productId === productId);
                            
                            if (itemNoCarrinho) {
                                itemNoCarrinho.quantidade++;
                            } else {
                                userSession.cart.push({ productId: productId, nome: productData.nome, preco: productData.preco, quantidade: 1 });
                            }
                            
                            delete userSession.displayedProducts;
                            await updateUserState(userNumber, { ...userSession, state: 'AWAITING_POST_ADD_ACTION' });
                            await enviarTexto(userNumber, botMessages.itemAddedToCart(productData.nome));
                            
                            const botoesPosCarrinho = [ { id: "view_cart", title: "🛒 Ver Carrinho" }, { id: "continue_shopping", title: "Continuar a Comprar" } ];
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await enviarBotoes(userNumber, botMessages.afterAddToCartOptions, botoesPosCarrinho);
                            
                        } else {
                            await enviarTexto(userNumber, botMessages.productOutOfStock(productData.nome));
                            delete userSession.displayedProducts;
                            await updateUserState(userNumber, userSession);
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            await enviarMenuPrincipalComoLista(userNumber, userSession);
                        }
                    } else {
                        console.error(`[${userNumber}] Produto com ID ${productId} não encontrado no Firestore.`);
                        const motivo = `Tentativa de adicionar produto com ID inexistente: ${productId}`;
                        await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
                    }
                    
                } catch (error) {
                    console.error(`[${userNumber}] Erro crítico ao buscar/adicionar produto ${productId}:`, error);
                    const motivo = `Erro técnico ao adicionar produto ao carrinho. (Ref: ${productId})`;
                    await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
                }
                
            } else {
                const motivo = `Cliente tentou adicionar um produto inválido ao carrinho: "${userMessage}"`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }
        
        case 'AWAITING_POST_ADD_ACTION': {
            if (msg === 'view_cart') {
                await enviarResumoCarrinho(userNumber, userSession);
            } else {
                const motivo = `Cliente escolheu uma opção inválida após adicionar item ao carrinho: "${userMessage}"`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }

        case 'AWAITING_CART_ACTION': {
            if (msg === 'checkout') {
                await enviarTexto(userNumber, botMessages.askForName);
                await updateUserState(userNumber, {...userSession, state: 'CHECKOUT_AWAITING_NAME' });
            } else if (msg === 'empty_cart') {
                userSession.cart = [];
                await updateUserState(userNumber, userSession);
                await enviarTexto(userNumber, botMessages.cartCleared);
                await enviarMenuPrincipalComoLista(userNumber, userSession);
            } else {
                const motivo = `Cliente escolheu uma ação inválida no carrinho: "${userMessage}"`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }

        case 'CHECKOUT_AWAITING_NAME': {
            userSession.checkoutData = { name: originalMsg };
            await updateUserState(userNumber, { ...userSession, state: 'CHECKOUT_AWAITING_ADDRESS'});
            await enviarTexto(userNumber, botMessages.askForAddress(originalMsg));
            break;
        }

        case 'CHECKOUT_AWAITING_ADDRESS': {
            userSession.checkoutData.address = originalMsg;
            const paymentButtons = [ { id: "payment_pix", title: "PIX" }, { id: "payment_card", title: "Cartão (Link)" }, { id: "payment_delivery", title: "Pagar na Entrega" } ];
            await updateUserState(userNumber, { ...userSession, state: 'CHECKOUT_AWAITING_PAYMENT' });
            await enviarBotoes(userNumber, botMessages.askForPayment, paymentButtons);
            break;
        }
            
        case 'CHECKOUT_AWAITING_PAYMENT': {
            userSession.checkoutData.payment = originalMsg;
            try {
                const result = await criarPedidoEnotificarAdmin(userNumber, userName, userSession, atendimentoId);
                
                if (result.success) {
                    
                    const { cart, checkoutData } = userSession;
                    let total = 0;
                    const itemsResumo = cart.map(item => {
                        total += item.preco * item.quantidade;
                        return `• ${item.quantidade}x ${item.nome} (${(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
                    }).join('\n');
                    
                    const paymentMethod = checkoutData.payment.replace('payment_', '').toUpperCase();

                    const summaryMessage = `🧾 *RESUMO DO NOVO PEDIDO* 🧾\n` +
                                         `---------------------------------\n` +
                                         `*Cliente:* ${checkoutData.name}\n` +
                                         `*Endereço:* ${checkoutData.address}\n` +
                                         `*Pagamento:* ${paymentMethod}\n` +
                                         `---------------------------------\n` +
                                         `*Itens do Pedido:*\n` +
                                         `${itemsResumo}\n` +
                                         `---------------------------------\n` +
                                         `*VALOR TOTAL:* *${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n` +
                                         `*ID do Pedido:* #${result.orderId}`;

                    const messagesRef = db.collection('atendimentos').doc(atendimentoId).collection('mensagens');
                    await messagesRef.add({
                        texto: summaryMessage,
                        origem: 'bot',
                        enviadaEm: Timestamp.now()
                    });
                    
                    await enviarTexto(userNumber, botMessages.orderSuccess(result.orderId));
                    await deleteUserState(userNumber); 

                } else {
                    await enviarTexto(userNumber, botMessages.orderStockError(result.productName));
                    await updateUserState(userNumber, { ...userSession, state: 'AWAITING_CART_ACTION' });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await enviarResumoCarrinho(userNumber, userSession);
                }
            } catch(error) {
                console.error("Erro ao criar pedido:", error);
                await enviarTexto(userNumber, botMessages.orderError);
                const motivo = `Erro técnico ao finalizar o pedido. Erro: ${error.message}`;
                await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
            }
            break;
        }
    }
}

async function enviarMenuPrincipalComoLista(userNumber, userSession) {
    const textoBoasVindas = botMessages.mainMenuHeader;
    let menuItens = [];
    if (userSession.cart && userSession.cart.length > 0) {
        menuItens.push({ id: "menu_ver_carrinho", title: "🛒 Ver Carrinho" });
    }
    menuItens.push(
        { id: "menu_produtos", title: "Bicicletas (Produtos) 🚲" },
        { id: "menu_pecas", title: "Peças e Acessórios 🛠️" },
        { id: "menu_financeiro", title: "Consultar Parcelas 💰" },
        { id: "menu_agendamento", title: "Revisão / Agendamento ⚙️" },
        { id: "menu_atendente", title: "Falar com Atendente 👨‍🔧" }
    );
    await updateUserState(userNumber, { ...userSession, state: 'AWAITING_CHOICE' });
    await enviarLista(userNumber, textoBoasVindas, "Menu Principal", menuItens);
}
async function consultarEExibirParcelas(userNumber) {
    try {
        await enviarTexto(userNumber, botMessages.financeHeader);
        const vendasRef = db.collection('vendasParceladas');
        const q = vendasRef.where('cliente_id', '==', userNumber).where('status_venda', '==', 'ativa');
        const snapshot = await q.get();
        if (snapshot.empty) {
            await enviarTexto(userNumber, botMessages.financeNotFound);
            return;
        }
        let pendingInstallmentsFound = [];
        snapshot.forEach(doc => {
            const venda = doc.data();
            if (venda.parcelas && Array.isArray(venda.parcelas)) {
                const nextPending = venda.parcelas
                    .filter(p => p.status === 'pendente')
                    .sort((a, b) => a.numero - b.numero)[0]; 
                if (nextPending) {
                    pendingInstallmentsFound.push({
                        produto_nome: venda.produto_nome,
                        proxima_parcela: nextPending
                    });
                }
            }
        });
        if (pendingInstallmentsFound.length === 0) {
            await enviarTexto(userNumber, botMessages.financeNoPending);
        } else {
            for (const vendaInfo of pendingInstallmentsFound) {
                await enviarTexto(userNumber, botMessages.financeInstallmentInfo(vendaInfo));
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    } catch (error) {
        console.error(`[${userNumber}] Erro ao consultar parcelas:`, error);
        await enviarTexto(userNumber, botMessages.financeError);
    }
}
async function criarAgendamento(userNumber, userName, agendamentoInfo) {
    const { servicoNome, dia, horario } = agendamentoInfo;
    const novoAgendamento = {
        cliente: userNumber,
        cliente_nome: userName,
        servico: servicoNome,
        dia: dia,
        horario: horario,
        status: 'pendente',
        criadoEm: Timestamp.now()
    };
    const agendamentoRef = await db.collection('agendamentos').add(novoAgendamento);
    console.log(`[${userNumber}] Agendamento ${agendamentoRef.id} criado com sucesso.`);
    return agendamentoRef;
}
async function enviarCatalogoDeProdutos(userNumber, userSession, bikeType, atendimentoId, originalMsg) {
    try {
        const produtosRef = db.collection('produtos');
        const q = produtosRef.where('categoria', '==', bikeType);
        const snapshot = await q.get();
        if (snapshot.empty) {
            await enviarTexto(userNumber, botMessages.noBikesFound(bikeType));
            setTimeout(() => enviarMenuPrincipalComoLista(userNumber, userSession), 2000);
            return;
        }
        await enviarTexto(userNumber, `Beleza! Separamos alguns modelos de *${bikeType.toUpperCase()}* pra você dar uma olhada:`);
        const produtosParaAdicionar = [];
        const productMap = {};
        for (const doc of snapshot.docs) {
            const produto = doc.data();
            const tituloCurto = produto.nome.length > 24 ? produto.nome.substring(0, 21) + '...' : produto.nome;
            produtosParaAdicionar.push({ id: `add_${doc.id}`, title: tituloCurto });
            productMap[produto.nome] = doc.id; 
            const legenda = botMessages.productCaption(produto);
            
            await enviarImagemComLegenda(userNumber, produto.imagemUrl, legenda);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        await enviarLista(userNumber, botMessages.addToCartPrompt, "Selecionar Produto", produtosParaAdicionar);
        await updateUserState(userNumber, { ...userSession, state: 'AWAITING_PRODUCT_SELECTION_FOR_CART', displayedProducts: productMap });
    } catch (error) {
        console.error(`[${userNumber}] Falha crítica ao buscar catálogo de '${bikeType}'. Erro:`, error);
        const motivo = `Erro técnico ao buscar produtos de ${bikeType}.`;
        await encaminharParaAtendente(userNumber, atendimentoId, motivo, originalMsg);
    }
}
async function enviarResumoCarrinho(userNumber, userSession) {
    if (!userSession.cart || userSession.cart.length === 0) {
        await enviarTexto(userNumber, botMessages.cartEmpty);
        await enviarMenuPrincipalComoLista(userNumber, userSession);
        return;
    }
    let total = 0;
    const messageLines = [botMessages.cartHeader];
    userSession.cart.forEach(item => {
        messageLines.push(botMessages.cartItem(item));
        total += item.preco * item.quantidade;
    });
    messageLines.push(botMessages.cartTotal(total));
    await enviarTexto(userNumber, messageLines.join('\n'));
    await new Promise(resolve => setTimeout(resolve, 500));
    const botoesAcaoCarrinho = [
        { id: "checkout", title: "✅ Finalizar Compra" },
        { id: "empty_cart", title: "🗑️ Esvaziar Carrinho" },
        { id: "continue_shopping", title: "Continuar a Comprar" }
    ];
    await updateUserState(userNumber, { ...userSession, state: 'AWAITING_CART_ACTION' });
    await enviarBotoes(userNumber, botMessages.cartActionsPrompt, botoesAcaoCarrinho);
}
async function criarPedidoEnotificarAdmin(userNumber, userName, userSession, atendimentoId) {
    const { cart, checkoutData } = userSession;
    return db.runTransaction(async (transaction) => {
        const productRefs = cart.map(item => db.collection('produtos').doc(item.productId));
        const productDocs = await transaction.getAll(...productRefs);
        
        for (let i = 0; i < productDocs.length; i++) {
            const productDoc = productDocs[i];
            const item = cart[i];
            if (!productDoc.exists) { throw new Error(`Produto ${item.nome} não encontrado.`); }
            const currentStock = productDoc.data().estoque;
            if (currentStock < item.quantidade) {
                const error = new Error(`Estoque insuficiente para ${item.nome}.`);
                error.productName = item.nome;
                error.isStockError = true;
                throw error;
            }
        }
        
        for (let i = 0; i < productDocs.length; i++) {
            const productRef = productRefs[i];
            const item = cart[i];
            transaction.update(productRef, { estoque: FieldValue.increment(-item.quantidade) });
        }
        
        let total = 0;
        cart.forEach(item => total += item.preco * item.quantidade);
        
        const novoPedido = {
            cliente_id: userNumber,
            cliente_nome_chat: userName,
            cliente_nome_completo: checkoutData.name,
            endereco_entrega: checkoutData.address,
            metodo_pagamento: checkoutData.payment,
            items: cart,
            valor_total: total,
            status_pedido: 'recebido',
            criadoEm: Timestamp.now()
        };
        
        const pedidoRef = db.collection('pedidos').doc();
        transaction.set(pedidoRef, novoPedido);
        
        const orderIdShort = pedidoRef.id.substring(0, 5).toUpperCase();
        const paymentMethod = checkoutData.payment.replace('payment_', '').toUpperCase();
        const itemsSummary = cart.map(item => `${item.quantidade}x ${item.nome}`).join(', ');

        const newMotivo = `NOVO PEDIDO #${orderIdShort}\n` +
                        `Cliente: ${checkoutData.name}\n` +
                        `Endereço: ${checkoutData.address}\n` +
                        `Pagamento: ${paymentMethod}\n` +
                        `Itens: ${itemsSummary}\n` +
                        `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

        const docAtendimentoRef = db.collection('atendimentos').doc(atendimentoId);
        
        transaction.update(docAtendimentoRef, { 
            motivo: newMotivo, 
            cliente_nome: checkoutData.name,
            status: 'aguardando'
        });
        
        return { 
            success: true, 
            orderId: orderIdShort,
            totalValue: total,
            itemsSummary: itemsSummary
        };

    }).catch(error => {
        console.error(`[${userNumber}] Falha na transação de criação de pedido:`, error.message);
        if (error.isStockError) {
            return { success: false, productName: error.productName };
        }
        throw error;
    });
}

module.exports = { processarMensagem };