require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const EMAIL_DEMO = 'demo@prazocerto.local';
const SENHA_DEMO = '123456';

function dataRelativa(quantidadeDias) {
  const hoje = new Date();
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + quantidadeDias);

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

const produtos = [
  {
    nome: 'Iogurte Natural Integral 170 g',
    codigoBarras: '7891000053508',
    lote: 'SEED-IORG-01',
    quantidade: 18,
    diasParaVencer: -2
  },
  {
    nome: 'Pão de Forma Tradicional 500 g',
    codigoBarras: '7896002300027',
    lote: 'SEED-PFOR-01',
    quantidade: 12,
    diasParaVencer: 0
  },
  {
    nome: 'Queijo Muçarela Fatiado 150 g',
    codigoBarras: '7891025111030',
    lote: 'SEED-QMUC-01',
    quantidade: 9,
    diasParaVencer: 2
  },
  {
    nome: 'Presunto Cozido Fatiado 200 g',
    codigoBarras: '7891515432088',
    lote: 'SEED-PRES-01',
    quantidade: 7,
    diasParaVencer: 4
  },
  {
    nome: 'Leite UHT Integral 1 L',
    codigoBarras: '7891025110163',
    lote: 'SEED-LEIT-01',
    quantidade: 24,
    diasParaVencer: 6
  },
  {
    nome: 'Requeijão Cremoso Tradicional 200 g',
    codigoBarras: '7896005801019',
    lote: 'SEED-REQQ-01',
    quantidade: 10,
    diasParaVencer: 8
  },
  {
    nome: 'Suco de Uva Integral 1,5 L',
    codigoBarras: '7896007000014',
    lote: 'SEED-SUCO-01',
    quantidade: 16,
    diasParaVencer: 14
  },
  {
    nome: 'Café Torrado e Moído 500 g',
    codigoBarras: '7896089012012',
    lote: 'SEED-CAFE-01',
    quantidade: 20,
    diasParaVencer: 35
  },
  {
    nome: 'Arroz Tipo 1 5 kg',
    codigoBarras: '7896036090100',
    lote: 'SEED-ARRO-01',
    quantidade: 15,
    diasParaVencer: 70
  },
  {
    nome: 'Biscoito Maisena 350 g',
    codigoBarras: '7891962050010',
    lote: 'SEED-BISC-01',
    quantidade: 30,
    diasParaVencer: 120
  }
];

async function executarSeed() {
  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [estabelecimentos] = await conexao.query(
      'SELECT id FROM estabelecimentos WHERE email = ?',
      [EMAIL_DEMO]
    );

    let estabelecimentoId;
    let estabelecimentoCriado = false;

    if (estabelecimentos.length > 0) {
      estabelecimentoId = estabelecimentos[0].id;
    } else {
      const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
      const [resultado] = await conexao.query(
        `INSERT INTO estabelecimentos
          (nome_estabelecimento, nome_responsavel, email, senha_hash, dias_antecedencia_alerta)
         VALUES (?, ?, ?, ?, ?)`,
        ['Mercado Boa Compra', 'Maria Silva', EMAIL_DEMO, senhaHash, 7]
      );

      estabelecimentoId = resultado.insertId;
      estabelecimentoCriado = true;
    }

    let produtosInseridos = 0;

    for (const produto of produtos) {
      const [resultado] = await conexao.query(
        `INSERT INTO produtos_lotes
          (estabelecimento_id, nome, codigo_barras, lote, quantidade, data_validade, status)
         SELECT ?, ?, ?, ?, ?, ?, 'ATIVO'
         WHERE NOT EXISTS (
           SELECT 1 FROM produtos_lotes WHERE estabelecimento_id = ? AND lote = ?
         )`,
        [
          estabelecimentoId,
          produto.nome,
          produto.codigoBarras,
          produto.lote,
          produto.quantidade,
          dataRelativa(produto.diasParaVencer),
          estabelecimentoId,
          produto.lote
        ]
      );

      produtosInseridos += resultado.affectedRows;
    }

    await conexao.commit();

    console.log(`Seed concluída: ${produtosInseridos} produto(s) inserido(s).`);
    if (estabelecimentoCriado) {
      console.log(`Conta de demonstração criada: ${EMAIL_DEMO} | senha: ${SENHA_DEMO}`);
    } else {
      console.log(`Produtos associados à conta de demonstração existente: ${EMAIL_DEMO}`);
    }
  } catch (erro) {
    if (conexao) await conexao.rollback();
    console.error('Falha ao executar a seed:', erro.message);
    process.exitCode = 1;
  } finally {
    if (conexao) conexao.release();
    await pool.end();
  }
}

executarSeed();
