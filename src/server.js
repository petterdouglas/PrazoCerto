require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const produtoRoutes = require('./routes/produtoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota de verificação de saúde da API e conexão com o MySQL
app.get('/api/status', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      status: 'online',
      sistema: 'PrazoCerto MVP API',
      banco_de_dados: 'conectado'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'erro',
      mensagem: 'Falha na conexão com o banco de dados MySQL.',
      detalhe: error.message
    });
  }
});

// Rotas da Pessoa 1 (Autenticação e Configuração de Antecedência)
app.use('/api/auth', authRoutes);
app.use('/api/configuracoes', configuracaoRoutes);

// Rotas da Pessoa 2 (Produtos, Motor do "Farol" e Baixas)
app.use('/api/produtos', produtoRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor PrazoCerto rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
