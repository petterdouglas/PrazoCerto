const API_URL = '';
let produtosAtuais = [];
let toastTimeout;

function mostrarSecao(secaoId, carregarDados = true) {
    document.querySelectorAll('.view-section').forEach(secao => secao.classList.add('d-none'));
    const secoes = {
        login: 'login-section',
        register: 'register-section',
        farol: 'farol-section',
        produto: 'produto-section',
        config: 'config-section'
    };
    const secao = document.getElementById(secoes[secaoId]);

    if (!secao) {
        throw new Error(`Seção inválida: ${secaoId}`);
    }

    secao.classList.remove('d-none');
    const autenticado = secaoId === 'farol' || secaoId === 'produto' || secaoId === 'config';
    document.getElementById('bottom-nav').classList.toggle('d-none', !autenticado);

    if (autenticado) {
        const alvoAtivo = secaoId === 'farol'
            ? 'farol-section'
            : secaoId === 'produto'
                ? 'produto-section'
                : 'config-section';
        atualizarMenuAtivo(alvoAtivo);
    }

    if (carregarDados && secaoId === 'farol') carregarPainel();
    if (carregarDados && secaoId === 'config') carregarConfiguracao();
}

function atualizarMenuAtivo(secaoAtiva) {
    document.querySelectorAll('.btn-nav').forEach(botao => {
        const ativo = botao.getAttribute('data-target') === secaoAtiva;
        botao.classList.toggle('text-primary', ativo);
        botao.classList.toggle('text-muted', !ativo);
        botao.setAttribute('aria-current', ativo ? 'page' : 'false');
    });
}

async function requisitarAPI(caminho, opcoes = {}) {
    const headers = { ...opcoes.headers };
    const token = localStorage.getItem('token');

    if (token) headers.Authorization = `Bearer ${token}`;

    let resposta;
    try {
        resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });
    } catch (erro) {
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }

    let dados = {};
    try {
        dados = await resposta.json();
    } catch (erro) {
        if (resposta.ok) throw new Error('O servidor retornou uma resposta inválida.');
    }

    if (!resposta.ok) {
        if (resposta.status === 401 && token) {
            localStorage.removeItem('token');
            mostrarSecao('login', false);
        }
        throw new Error(dados.erro || 'Não foi possível concluir a operação.');
    }

    return dados;
}

function mostrarErroPainel(mensagem) {
    const elemento = document.getElementById('dashboard-message');
    elemento.textContent = mensagem;
    elemento.classList.remove('d-none', 'alert-success');
    elemento.classList.add('alert-danger');
}

function mostrarToast(mensagem) {
    const elemento = document.getElementById('action-toast');
    elemento.textContent = mensagem;
    elemento.classList.remove('d-none');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elemento.classList.add('d-none'), 3500);
}

function formatarData(dataISO) {
    const [ano, mes, dia] = String(dataISO).split('-').map(Number);
    if (!ano || !mes || !dia) return dataISO;
    return new Intl.DateTimeFormat('pt-BR').format(new Date(ano, mes - 1, dia));
}

function atualizarResumo(resumo) {
    const vermelho = Number(resumo.vermelho) || 0;
    const amarelo = Number(resumo.amarelo) || 0;
    const verde = Number(resumo.verde) || 0;
    const total = Number(resumo.total) || 0;

    document.getElementById('count-red').textContent = vermelho;
    document.getElementById('count-yellow').textContent = amarelo;
    document.getElementById('count-green').textContent = verde;
    document.getElementById('count-total').textContent =
        `${total} ${total === 1 ? 'lote ativo' : 'lotes ativos'}`;
}

function criarCartaoProduto(produto) {
    const cor = String(produto.farol || 'VERDE').toLowerCase();
    const cartao = document.createElement('article');
    cartao.className = `product-card farol-${cor} card`;

    const corpo = document.createElement('div');
    corpo.className = 'product-card-body';

    const topo = document.createElement('div');
    topo.className = 'd-flex justify-content-between align-items-start gap-2';

    const titulo = document.createElement('h3');
    titulo.className = 'h5 fw-bold product-name mb-0';
    titulo.textContent = produto.nome;

    const codigoLote = document.createElement('span');
    codigoLote.className = 'badge rounded-pill text-bg-light';
    codigoLote.textContent = cor;

    topo.append(titulo, codigoLote);

    const detalhes = document.createElement('p');
    detalhes.className = 'product-meta mt-2 mb-0';
    detalhes.textContent =
        `Lote ${produto.lote} · ${produto.quantidade} ${Number(produto.quantidade) === 1 ? 'unidade' : 'unidades'} · Validade ${formatarData(produto.data_validade)}`;

    const etiqueta = document.createElement('div');
    etiqueta.className = `expiry-label farol-${cor}`;
    etiqueta.textContent = produto.etiqueta_acao;

    const acoes = document.createElement('div');
    acoes.className = 'product-actions';

    const vendido = document.createElement('button');
    vendido.type = 'button';
    vendido.className = 'btn btn-success';
    vendido.textContent = 'Vendido / Promoção';
    vendido.setAttribute('aria-label', `Dar baixa de ${produto.nome} como Vendido / Promoção`);
    vendido.addEventListener('click', () => registrarBaixa(produto, 'VENDIDO_PROMOCAO', vendido, descartado));

    const descartado = document.createElement('button');
    descartado.type = 'button';
    descartado.className = 'btn btn-outline-danger';
    descartado.textContent = 'Descartado';
    descartado.setAttribute('aria-label', `Dar baixa de ${produto.nome} como Descartado`);
    descartado.addEventListener('click', () => registrarBaixa(produto, 'DESCARTADO', descartado, vendido));

    acoes.append(vendido, descartado);
    corpo.append(topo, detalhes, etiqueta, acoes);
    cartao.append(corpo);
    return cartao;
}

function renderizarProdutos(produtos) {
    const lista = document.getElementById('product-list');
    const estadoVazio = document.getElementById('dashboard-empty');
    lista.replaceChildren();

    if (produtos.length === 0) {
        estadoVazio.classList.remove('d-none');
        return;
    }

    estadoVazio.classList.add('d-none');
    produtos.forEach(produto => lista.append(criarCartaoProduto(produto)));
}

async function carregarPainel() {
    const lista = document.getElementById('product-list');
    const estadoVazio = document.getElementById('dashboard-empty');
    const mensagem = document.getElementById('dashboard-message');
    mensagem.classList.add('d-none');
    estadoVazio.classList.add('d-none');
    lista.textContent = 'Carregando lotes...';

    try {
        const dados = await requisitarAPI('/api/produtos/painel');
        produtosAtuais = Array.isArray(dados.produtos) ? dados.produtos : [];
        atualizarResumo(dados.resumo || dados.contadores || {});
        renderizarProdutos(produtosAtuais);
    } catch (erro) {
        lista.replaceChildren();
        mostrarErroPainel(erro.message);
    }
}

async function registrarBaixa(produto, status, botao, outroBotao) {
    const botoes = [botao, outroBotao];
    botoes.forEach(item => { item.disabled = true; });
    botao.textContent = 'Registrando...';

    try {
        await requisitarAPI(`/api/produtos/${produto.id}/baixa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, quantidade: Number(produto.quantidade) })
        });
        produtosAtuais = produtosAtuais.filter(item => item.id !== produto.id);
        mostrarToast(status === 'DESCARTADO'
            ? 'Baixa como descartado registrada.'
            : 'Baixa como vendido / promoção registrada.');
        await carregarPainel();
    } catch (erro) {
        mostrarErroPainel(erro.message);
        botoes.forEach(item => { item.disabled = false; });
        botao.textContent = status === 'DESCARTADO' ? 'Descartado' : 'Vendido / Promoção';
    }
}

async function carregarConfiguracao() {
    try {
        const dados = await requisitarAPI('/api/configuracoes');
        document.getElementById('config-dias').value = dados.dias_antecedencia_alerta;
        document.querySelectorAll('.btn-dias').forEach(botao => {
            botao.classList.toggle(
                'active',
                Number(botao.getAttribute('data-dias')) === Number(dados.dias_antecedencia_alerta)
            );
        });
    } catch (erro) {
        alert(erro.message);
    }
}

document.getElementById('btn-go-register').addEventListener('click', () => mostrarSecao('register'));
document.getElementById('btn-go-login').addEventListener('click', () => mostrarSecao('login'));
document.getElementById('btn-refresh-dashboard').addEventListener('click', carregarPainel);

document.querySelectorAll('.btn-nav').forEach(botao => {
    botao.addEventListener('click', () => {
        const destino = botao.getAttribute('data-target');
        if (destino === 'farol-section') mostrarSecao('farol');
        if (destino === 'produto-section') mostrarSecao('produto');
        if (destino === 'config-section') mostrarSecao('config');
    });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    mostrarSecao('login', false);
});

document.getElementById('login-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
        formulario.classList.add('was-validated');
        return;
    }

    try {
        const dados = await requisitarAPI('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('login-email').value,
                senha: document.getElementById('login-senha').value
            })
        });
        localStorage.setItem('token', dados.token);
        formulario.reset();
        formulario.classList.remove('was-validated');
        mostrarSecao('farol');
    } catch (erro) {
        alert(erro.message);
    }
});

document.getElementById('register-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
        formulario.classList.add('was-validated');
        return;
    }

    try {
        const dados = await requisitarAPI('/api/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_estabelecimento: document.getElementById('reg-nome-estabelecimento').value,
                nome_responsavel: document.getElementById('reg-nome-responsavel').value,
                email: document.getElementById('reg-email').value,
                senha: document.getElementById('reg-senha').value
            })
        });
        localStorage.setItem('token', dados.token);
        formulario.reset();
        formulario.classList.remove('was-validated');
        mostrarSecao('farol');
    } catch (erro) {
        alert(erro.message);
    }
});

document.getElementById('produto-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
        formulario.classList.add('was-validated');
        return;
    }

    try {
        await requisitarAPI('/api/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: document.getElementById('prod-nome').value,
                codigo_barras: document.getElementById('prod-codigo').value,
                lote: document.getElementById('prod-lote').value,
                quantidade: Number(document.getElementById('prod-quantidade').value),
                data_validade: document.getElementById('prod-validade').value
            })
        });
        formulario.reset();
        formulario.classList.remove('was-validated');
        mostrarToast('Lote salvo com sucesso.');
        mostrarSecao('farol');
    } catch (erro) {
        alert(erro.message);
    }
});

document.querySelectorAll('.btn-dias').forEach(botao => {
    botao.addEventListener('click', () => {
        document.querySelectorAll('.btn-dias').forEach(item => item.classList.remove('active'));
        botao.classList.add('active');
        document.getElementById('config-dias').value = botao.getAttribute('data-dias');
    });
});

document.getElementById('config-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    const dias = document.getElementById('config-dias').value;

    try {
        await requisitarAPI('/api/configuracoes/antecedencia', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dias_antecedencia_alerta: dias })
        });
        mostrarToast('Configuração salva com sucesso.');
        await carregarPainel();
    } catch (erro) {
        alert(erro.message);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('token')) {
        mostrarSecao('farol');
    } else {
        mostrarSecao('login', false);
    }
});
