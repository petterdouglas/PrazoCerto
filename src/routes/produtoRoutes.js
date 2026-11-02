const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const produtoController = require('../controllers/produtoController');

// Todas as rotas de produtos e painel "Farol" exigem estabelecimento autenticado
router.use(authMiddleware);

// POST /api/produtos -> Cadastra um novo lote de produto com validação contra entradas inválidas
router.post('/', produtoController.criarProduto);

// GET /api/produtos -> Lista os lotes do painel com cálculo automático do "Farol" (VERMELHO, AMARELO, VERDE)
router.get('/', produtoController.listarProdutosPainel);

// GET /api/produtos/painel e /api/produtos/farol -> Aliases para leitura do Dashboard "Farol"
router.get('/painel', produtoController.listarProdutosPainel);
router.get('/farol', produtoController.listarProdutosPainel);

// GET /api/produtos/:id -> Obtém detalhes de um lote específico
router.get('/:id', produtoController.obterProdutoPorId);

// PUT /api/produtos/:id -> Atualiza dados cadastrais de um lote existente
router.put('/:id', produtoController.atualizarProduto);

// PATCH, PUT e POST /api/produtos/:id/baixa -> Registra saída rápida ("VENDIDO_PROMOCAO" ou "DESCARTADO")
router.patch('/:id/baixa', produtoController.darBaixaProduto);
router.put('/:id/baixa', produtoController.darBaixaProduto);
router.post('/:id/baixa', produtoController.darBaixaProduto);

// DELETE /api/produtos/:id -> Exclui um lote cadastrado por engano
router.delete('/:id', produtoController.excluirProduto);

module.exports = router;

