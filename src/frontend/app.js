// Aponte para a porta onde o server.js está rodando
const API_URL = 'http://localhost:3000';

// Função para alternar telas
function mostrarSecao(secaoId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
    
    if (secaoId === 'login') {
        document.getElementById('login-section').classList.remove('d-none');
        document.getElementById('bottom-nav').classList.add('d-none');
    } else if (secaoId === 'register') {
        document.getElementById('register-section').classList.remove('d-none');
        document.getElementById('bottom-nav').classList.add('d-none');
    } else if (secaoId === 'produto') {
        document.getElementById('produto-section').classList.remove('d-none');
        document.getElementById('bottom-nav').classList.remove('d-none');
        atualizarMenuAtivo('produto-section');
    } else if (secaoId === 'config') {
        document.getElementById('config-section').classList.remove('d-none');
        document.getElementById('bottom-nav').classList.remove('d-none');
        atualizarMenuAtivo('config-section');
    }
}

// Atualiza a cor dos ícones no menu inferior
function atualizarMenuAtivo(secaoAtiva) {
    document.querySelectorAll('.btn-nav').forEach(btn => {
        if (btn.getAttribute('data-target') === secaoAtiva) {
            btn.classList.remove('text-muted');
            btn.classList.add('text-primary');
        } else {
            btn.classList.remove('text-primary');
            btn.classList.add('text-muted');
        }
    });
}

// Navegação pelos botões do HTML
document.getElementById('btn-go-register').addEventListener('click', () => mostrarSecao('register'));
document.getElementById('btn-go-login').addEventListener('click', () => mostrarSecao('login'));

document.querySelectorAll('.btn-nav').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target === 'produto-section') mostrarSecao('produto');
        if (target === 'config-section') mostrarSecao('config');
    });
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    mostrarSecao('login');
});

// LOGIN
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const payload = {
        email: document.getElementById('login-email').value,
        senha: document.getElementById('login-senha').value
    };

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Salva o token de segurança no navegador
            localStorage.setItem('token', data.token);
            form.reset();
            form.classList.remove('was-validated');
            mostrarSecao('produto'); // Redireciona para o painel
        } else {
            alert(data.erro || 'Erro no login.');
        }
    } catch (err) {
        alert('Erro de conexão com o servidor.');
    }
});

// CADASTRO
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const payload = {
        nome_estabelecimento: document.getElementById('reg-nome-estabelecimento').value,
        nome_responsavel: document.getElementById('reg-nome-responsavel').value,
        email: document.getElementById('reg-email').value,
        senha: document.getElementById('reg-senha').value
    };

    try {
        const res = await fetch(`${API_URL}/api/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // A API também retorna um token no cadastro, salvamos para logar automático
            localStorage.setItem('token', data.token);
            alert('Conta criada com sucesso!');
            form.reset();
            form.classList.remove('was-validated');
            mostrarSecao('produto');
        } else {
            alert(data.erro || 'Erro no cadastro.');
        }
    } catch (err) {
        alert('Erro de conexão com o servidor.');
    }
});

// CADASTRO DE PRODUTO
document.getElementById('produto-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const token = localStorage.getItem('token');
    
    const payload = {
        nome: document.getElementById('prod-nome').value,
        codigo_barras: document.getElementById('prod-codigo').value,
        lote: document.getElementById('prod-lote').value,
        quantidade: Number(document.getElementById('prod-quantidade').value),
        data_validade: document.getElementById('prod-validade').value
    };

    try {
        const res = await fetch(`${API_URL}/api/produtos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert('Lote salvo com sucesso!');
            form.reset();
            form.classList.remove('was-validated');
        } else {
            alert(data.erro || 'Erro ao salvar produto.');
        }
    } catch (err) {
        alert('Erro de conexão ao salvar.');
    }
});

// LÓGICA DOS BOTÕES DE DIAS DE ANTECEDÊNCIA (TELA DE CONFIGURAÇÃO)
document.querySelectorAll('.btn-dias').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-dias').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById('config-dias').value = e.currentTarget.getAttribute('data-dias');
    });
});

// SALVAR CONFIGURAÇÃO

document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const dias = document.getElementById('config-dias').value;

    try {
        // Rota exata que o seu colega programou: /api/configuracoes/antecedencia
        const res = await fetch(`${API_URL}/api/configuracoes/antecedencia`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // Enviamos o nome da variável igual ao que foi usado no cadastro
            body: JSON.stringify({ dias_antecedencia_alerta: dias })
        });
        
        if (res.ok) {
            alert('Configuração salva com sucesso!');
        } else {
            const data = await res.json();
            alert(data.erro || 'Erro ao salvar configuração.');
        }
    } catch (err) {
        alert('Erro de conexão ao salvar.');
    }
});

// Verifica se já está logado ao abrir a página
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        mostrarSecao('produto');
    }
});