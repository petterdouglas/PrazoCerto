const pool = require('../config/db');

/**
 * Formata um objeto Date ou string de data para o padrão ISO 'AAAA-MM-DD'
 * sem sofrer deslocamento de fuso horário.
 */
function formatarDataISO(valorData) {
  if (!valorData) return null;

  if (valorData instanceof Date) {
    if (Number.isNaN(valorData.getTime())) return null;
    const ano = valorData.getFullYear();
    const mes = String(valorData.getMonth() + 1).padStart(2, '0');
    const dia = String(valorData.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  const texto = String(valorData).trim();

  // Formato AAAA-MM-DD (ou ISO completo AAAA-MM-DDTHH:mm:ss...)
  const matchISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
  if (matchISO) {
    return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
  }

  // Formato DD/MM/AAAA
  const matchBR = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchBR) {
    return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
  }

  return null;
}

/**
 * Valida se uma string representa uma data real do calendário e retorna 'AAAA-MM-DD'
 * ou null caso seja inválida (ex: '2026-02-30', 'data-invalida', '').
 */
function normalizarEValidarData(valorData) {
  const dataISO = formatarDataISO(valorData);
  if (!dataISO) return null;

  const partes = dataISO.split('-');
  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return null;
  }

  if (ano < 2000 || ano > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }

  const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    dataUTC.getUTCFullYear() !== ano ||
    dataUTC.getUTCMonth() + 1 !== mes ||
    dataUTC.getUTCDate() !== dia
  ) {
    return null;
  }

  return dataISO;
}

/**
 * Motor de Cálculo do "Farol" 
 * Compara a data atual com a data_validade e os dias_antecedencia_alerta da loja:
 * - VERMELHO: vencido (dias_restantes < 0) ou vence hoje (dias_restantes === 0)
 * - AMARELO: dentro da janela de alerta configurada (1 <= dias_restantes <= dias_antecedencia_alerta)
 * - VERDE: dentro do prazo seguro (dias_restantes > dias_antecedencia_alerta)
 */
function calcularFarol(dataValidade, diasAntecedenciaAlerta = 7, dataReferencia = new Date()) {
  const dataValidadeISO = formatarDataISO(dataValidade);
  const antecedencia = Number.isInteger(Number(diasAntecedenciaAlerta))
    ? Number(diasAntecedenciaAlerta)
    : 7;

  const [anoVal, mesVal, diaVal] = dataValidadeISO.split('-').map(Number);
  const utcValidade = Date.UTC(anoVal, mesVal - 1, diaVal);

  const refISO = formatarDataISO(dataReferencia);
  const [anoRef, mesRef, diaRef] = refISO.split('-').map(Number);
  const utcHoje = Date.UTC(anoRef, mesRef - 1, diaRef);

  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  const diasRestantes = Math.round((utcValidade - utcHoje) / MS_POR_DIA);

  if (diasRestantes < 0) {
    const diasVencidos = Math.abs(diasRestantes);
    const textoDias = diasVencidos === 1 ? '1 dia' : `${diasVencidos} dias`;
    return {
      data_validade_formatada: dataValidadeISO,
      dias_restantes: diasRestantes,
      farol: 'VERMELHO',
      cor_farol: 'VERMELHO',
      status_validade: 'VENCIDO',
      etiqueta_acao: `Vencido há ${textoDias} — Retirar da Gôndola`,
      prioridade_ordem: 1
    };
  }

  if (diasRestantes === 0) {
    return {
      data_validade_formatada: dataValidadeISO,
      dias_restantes: 0,
      farol: 'VERMELHO',
      cor_farol: 'VERMELHO',
      status_validade: 'VENCE_HOJE',
      etiqueta_acao: 'Vence hoje — Retirar da Gôndola',
      prioridade_ordem: 1
    };
  }

  if (diasRestantes <= antecedencia) {
    const textoDias = diasRestantes === 1 ? '1 dia' : `${diasRestantes} dias`;
    return {
      data_validade_formatada: dataValidadeISO,
      dias_restantes: diasRestantes,
      farol: 'AMARELO',
      cor_farol: 'AMARELO',
      status_validade: 'PROXIMO_VENCIMENTO',
      etiqueta_acao: `Vence em ${textoDias} — Sugerir Promoção`,
      prioridade_ordem: 2
    };
  }

  return {
    data_validade_formatada: dataValidadeISO,
    dias_restantes: diasRestantes,
    farol: 'VERDE',
    cor_farol: 'VERDE',
    status_validade: 'DENTRO_DO_PRAZO',
    etiqueta_acao: `Vence em ${diasRestantes} dias — Dentro do prazo seguro`,
    prioridade_ordem: 3
  };
}

/**
 * Valida os dados de entrada de um produto/lote 
 * (rejeitar campos obrigatórios em branco, quantidades <= 0 e datas inválidas).
 */
function validarDadosProduto(corpo = {}) {
  const { nome, codigo_barras, lote, quantidade, data_validade } = corpo;

  const nomeLimpo = nome !== undefined && nome !== null ? String(nome).trim() : '';
  const loteLimpo = lote !== undefined && lote !== null ? String(lote).trim() : '';
  const codigoBarrasLimpo =
    codigo_barras !== undefined && codigo_barras !== null && String(codigo_barras).trim() !== ''
      ? String(codigo_barras).trim()
      : null;

  const quantidadeVazia =
    quantidade === undefined || quantidade === null || String(quantidade).trim() === '';
  const dataValidadeVazia =
    data_validade === undefined || data_validade === null || String(data_validade).trim() === '';

  if (!nomeLimpo || !loteLimpo || quantidadeVazia || dataValidadeVazia) {
    return {
      valido: false,
      erro: 'Preencha todos os campos obrigatórios: nome, lote, quantidade e data_validade.'
    };
  }

  if (nomeLimpo.length > 150) {
    return {
      valido: false,
      erro: 'O nome do produto deve ter no máximo 150 caracteres.'
    };
  }

  if (loteLimpo.length > 60) {
    return {
      valido: false,
      erro: 'O código do lote deve ter no máximo 60 caracteres.'
    };
  }

  if (codigoBarrasLimpo && codigoBarrasLimpo.length > 60) {
    return {
      valido: false,
      erro: 'O código de barras deve ter no máximo 60 caracteres.'
    };
  }

  const qtdNumerica = Number(quantidade);
  if (!Number.isInteger(qtdNumerica) || qtdNumerica <= 0) {
    return {
      valido: false,
      erro: 'A quantidade deve ser um número inteiro maior que zero.'
    };
  }

  const dataISO = normalizarEValidarData(data_validade);
  if (!dataISO) {
    return {
      valido: false,
      erro: 'A data de validade informada é inválida. Utilize uma data real no formato AAAA-MM-DD.'
    };
  }

  return {
    valido: true,
    dados: {
      nome: nomeLimpo,
      codigo_barras: codigoBarrasLimpo,
      lote: loteLimpo,
      quantidade: qtdNumerica,
      data_validade: dataISO
    }
  };
}

/**
 * Normaliza e valida o status de baixa acionável ("Vendido/Promoção" ou "Descartado").
 */
function normalizarStatusBaixa(valorStatus) {
  if (!valorStatus || typeof valorStatus !== 'string') return null;

  const normalizado = valorStatus
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapaStatus = {
    VENDIDO_PROMOCAO: 'VENDIDO_PROMOCAO',
    'VENDIDO/PROMOCAO': 'VENDIDO_PROMOCAO',
    'VENDIDO / PROMOCAO': 'VENDIDO_PROMOCAO',
    VENDIDO_NA_PROMOCAO: 'VENDIDO_PROMOCAO',
    VENDIDO: 'VENDIDO_PROMOCAO',
    PROMOCAO: 'VENDIDO_PROMOCAO',
    DESCARTADO: 'DESCARTADO',
    DESCARTE: 'DESCARTADO'
  };

  return mapaStatus[normalizado] || null;
}

/**
 * Formata uma linha da tabela produtos_lotes adicionando os campos calculados pelo motor "Farol".
 */
function enriquecerProdutoComFarol(row, diasAntecedenciaAlerta) {
  const dadosFarol = calcularFarol(row.data_validade, diasAntecedenciaAlerta);
  return {
    id: row.id,
    estabelecimento_id: row.estabelecimento_id,
    nome: row.nome,
    codigo_barras: row.codigo_barras,
    lote: row.lote,
    quantidade: row.quantidade,
    data_validade: dadosFarol.data_validade_formatada,
    status: row.status,
    dias_restantes: dadosFarol.dias_restantes,
    farol: dadosFarol.farol,
    cor_farol: dadosFarol.cor_farol,
    status_validade: dadosFarol.status_validade,
    etiqueta_acao: dadosFarol.etiqueta_acao,
    prioridade_ordem: dadosFarol.prioridade_ordem,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em
  };
}

/**
 * Busca a configuração de dias_antecedencia_alerta e plano do estabelecimento logado.
 */
async function obterParametrosEstabelecimento(estabelecimentoId) {
  const [rows] = await pool.query(
    'SELECT id, dias_antecedencia_alerta, plano FROM estabelecimentos WHERE id = ?',
    [estabelecimentoId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * POST /api/produtos
 * 1. Cadastro Simplificado de Lote com validação contra entradas inválidas.
 */
exports.criarProduto = async (req, res) => {
  try {
    const estabelecimentoId = req.estabelecimento.id;

    // Validação de situações inválidas (campos em branco, quantidade <= 0, data inválida)
    const validacao = validarDadosProduto(req.body);
    if (!validacao.valido) {
      return res.status(400).json({ erro: validacao.erro });
    }

    const parametrosLoja = await obterParametrosEstabelecimento(estabelecimentoId);
    if (!parametrosLoja) {
      return res.status(404).json({ erro: 'Estabelecimento não encontrado.' });
    }

    // Verifica limite do plano gratuito (50 lotes ativos)
    if (parametrosLoja.plano === 'GRATUITO') {
      const [contagem] = await pool.query(
        `SELECT COUNT(*) AS total_ativos
         FROM produtos_lotes
         WHERE estabelecimento_id = ? AND status = 'ATIVO'`,
        [estabelecimentoId]
      );

      if (contagem[0].total_ativos >= 50) {
        return res.status(403).json({
          erro: 'Limite de 50 lotes ativos do Plano Gratuito atingido. Dê baixa em lotes antigos ou migre para o Plano PRO.'
        });
      }
    }

    const { nome, codigo_barras, lote, quantidade, data_validade } = validacao.dados;

    const [resultado] = await pool.query(
      `INSERT INTO produtos_lotes
        (estabelecimento_id, nome, codigo_barras, lote, quantidade, data_validade, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ATIVO')`,
      [estabelecimentoId, nome, codigo_barras, lote, quantidade, data_validade]
    );

    const [rowsCriados] = await pool.query(
      'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [resultado.insertId, estabelecimentoId]
    );

    const produtoCriado = enriquecerProdutoComFarol(
      rowsCriados[0],
      parametrosLoja.dias_antecedencia_alerta
    );

    return res.status(201).json({
      mensagem: 'Lote de produto cadastrado com sucesso!',
      produto: produtoCriado
    });
  } catch (error) {
    console.error('Erro ao cadastrar produto/lote:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao cadastrar o lote de produto.'
    });
  }
};

/**
 * GET /api/produtos (e /api/produtos/painel, /api/produtos/farol)
 * 3. Motor de Cálculo do "Farol": lista os lotes ordenados do mais urgente para o mais distante,
 * classificando em VERMELHO, AMARELO ou VERDE e retornando os contadores do painel.
 */
exports.listarProdutosPainel = async (req, res) => {
  try {
    const estabelecimentoId = req.estabelecimento.id;
    const parametrosLoja = await obterParametrosEstabelecimento(estabelecimentoId);

    if (!parametrosLoja) {
      return res.status(404).json({ erro: 'Estabelecimento não encontrado.' });
    }

    const diasAntecedencia = parametrosLoja.dias_antecedencia_alerta;

    // Filtro opcional de status (padrão: 'ATIVO' para exibir apenas lotes em risco no painel)
    const statusFiltro = req.query.status ? String(req.query.status).trim().toUpperCase() : 'ATIVO';
    const statusPermitidos = ['ATIVO', 'VENDIDO_PROMOCAO', 'DESCARTADO', 'TODOS'];

    if (!statusPermitidos.includes(statusFiltro)) {
      return res.status(400).json({
        erro: 'Filtro de status inválido. Utilize ATIVO, VENDIDO_PROMOCAO, DESCARTADO ou TODOS.'
      });
    }

    let sql = 'SELECT * FROM produtos_lotes WHERE estabelecimento_id = ?';
    const params = [estabelecimentoId];

    if (statusFiltro !== 'TODOS') {
      sql += ' AND status = ?';
      params.push(statusFiltro);
    }

    // Ordena do mais urgente (menor data_validade) para o mais distante
    sql += ' ORDER BY data_validade ASC, id ASC';

    const [rows] = await pool.query(sql, params);

    const todosEnriquecidos = rows.map((row) =>
      enriquecerProdutoComFarol(row, diasAntecedencia)
    );

    // Calcula contadores consolidados para o topo do Dashboard "Farol"
    const resumo = {
      total: todosEnriquecidos.length,
      vermelho: 0,
      amarelo: 0,
      verde: 0
    };

    for (const item of todosEnriquecidos) {
      if (item.farol === 'VERMELHO') resumo.vermelho += 1;
      else if (item.farol === 'AMARELO') resumo.amarelo += 1;
      else if (item.farol === 'VERDE') resumo.verde += 1;
    }

    // Filtro opcional por cor do farol (?farol=VERMELHO|AMARELO|VERDE ou ?cor=...)
    const filtroCorRaw = req.query.farol || req.query.cor;
    let produtosRetornados = todosEnriquecidos;

    if (filtroCorRaw) {
      const corNormalizada = String(filtroCorRaw).trim().toUpperCase();
      if (!['VERMELHO', 'AMARELO', 'VERDE'].includes(corNormalizada)) {
        return res.status(400).json({
          erro: 'Filtro de cor do farol inválido. Utilize VERMELHO, AMARELO ou VERDE.'
        });
      }
      produtosRetornados = todosEnriquecidos.filter((item) => item.farol === corNormalizada);
    }

    return res.status(200).json({
      dias_antecedencia_alerta: diasAntecedencia,
      resumo,
      contadores: resumo,
      total: produtosRetornados.length,
      produtos: produtosRetornados
    });
  } catch (error) {
    console.error('Erro ao listar produtos no painel Farol:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao carregar o painel de produtos.'
    });
  }
};

/**
 * GET /api/produtos/:id
 * Obtém detalhes de um lote específico do estabelecimento autenticado.
 */
exports.obterProdutoPorId = async (req, res) => {
  try {
    const estabelecimentoId = req.estabelecimento.id;
    const produtoId = Number(req.params.id);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ erro: 'ID do lote inválido.' });
    }

    const parametrosLoja = await obterParametrosEstabelecimento(estabelecimentoId);
    if (!parametrosLoja) {
      return res.status(404).json({ erro: 'Estabelecimento não encontrado.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [produtoId, estabelecimentoId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        erro: 'Lote de produto não encontrado para este estabelecimento.'
      });
    }

    const produto = enriquecerProdutoComFarol(
      rows[0],
      parametrosLoja.dias_antecedencia_alerta
    );

    return res.status(200).json({ produto });
  } catch (error) {
    console.error('Erro ao buscar lote por ID:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao consultar o lote de produto.'
    });
  }
};

/**
 * PUT /api/produtos/:id
 * Atualiza os dados cadastrais de um lote existente com validação completa.
 */
exports.atualizarProduto = async (req, res) => {
  try {
    const estabelecimentoId = req.estabelecimento.id;
    const produtoId = Number(req.params.id);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ erro: 'ID do lote inválido.' });
    }

    const validacao = validarDadosProduto(req.body);
    if (!validacao.valido) {
      return res.status(400).json({ erro: validacao.erro });
    }

    const [existentes] = await pool.query(
      'SELECT id FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [produtoId, estabelecimentoId]
    );

    if (existentes.length === 0) {
      return res.status(404).json({
        erro: 'Lote de produto não encontrado para este estabelecimento.'
      });
    }

    const { nome, codigo_barras, lote, quantidade, data_validade } = validacao.dados;

    await pool.query(
      `UPDATE produtos_lotes
       SET nome = ?, codigo_barras = ?, lote = ?, quantidade = ?, data_validade = ?
       WHERE id = ? AND estabelecimento_id = ?`,
      [nome, codigo_barras, lote, quantidade, data_validade, produtoId, estabelecimentoId]
    );

    const parametrosLoja = await obterParametrosEstabelecimento(estabelecimentoId);
    const [atualizados] = await pool.query(
      'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [produtoId, estabelecimentoId]
    );

    const produtoAtualizado = enriquecerProdutoComFarol(
      atualizados[0],
      parametrosLoja ? parametrosLoja.dias_antecedencia_alerta : 7
    );

    return res.status(200).json({
      mensagem: 'Lote de produto atualizado com sucesso!',
      produto: produtoAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar lote:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao atualizar o lote de produto.'
    });
  }
};

/**
 * PATCH / PUT / POST /api/produtos/:id/baixa
 * 4. Baixa de Produto (Saída): recebe a quantidade que saiu do lote e o motivo.
 * Em uma baixa parcial, mantém o saldo do lote ativo e cria um registro da saída
 * como "VENDIDO_PROMOCAO" ("Vendido/Promoção") ou "DESCARTADO" ("Descartado").
 */
exports.darBaixaProduto = async (req, res) => {
  let conexao;

  try {
    const estabelecimentoId = req.estabelecimento.id;
    const produtoId = Number(req.params.id);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ erro: 'ID do lote inválido.' });
    }

    const statusEntrada =
      req.body && (req.body.status || req.body.tipo_baixa || req.body.motivo);
    const statusBaixa = normalizarStatusBaixa(statusEntrada);

    if (!statusBaixa) {
      return res.status(400).json({
        erro: 'Informe um motivo de baixa válido: "VENDIDO_PROMOCAO" (Vendido/Promoção) ou "DESCARTADO" (Descartado).'
      });
    }

    const quantidadeInformada = req.body && req.body.quantidade;
    const quantidadeBaixa = Number(quantidadeInformada);

    if (
      quantidadeInformada === undefined ||
      quantidadeInformada === null ||
      String(quantidadeInformada).trim() === '' ||
      !Number.isInteger(quantidadeBaixa) ||
      quantidadeBaixa <= 0
    ) {
      return res.status(400).json({
        erro: 'Informe uma quantidade de baixa que seja um número inteiro maior que zero.'
      });
    }

    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Bloqueia o lote durante a operação para impedir duas baixas simultâneas sobre o mesmo saldo.
    const [rows] = await conexao.query(
      'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ? FOR UPDATE',
      [produtoId, estabelecimentoId]
    );

    if (rows.length === 0) {
      const erro = new Error('Lote de produto não encontrado para este estabelecimento.');
      erro.statusCode = 404;
      throw erro;
    }

    const produtoOriginal = rows[0];

    if (produtoOriginal.status !== 'ATIVO') {
      const erro = new Error(
        `Este lote já recebeu baixa anteriormente com o status "${produtoOriginal.status}".`
      );
      erro.statusCode = 400;
      throw erro;
    }

    if (quantidadeBaixa > produtoOriginal.quantidade) {
      const erro = new Error(
        `A quantidade para baixa (${quantidadeBaixa}) não pode ser maior que o saldo do lote (${produtoOriginal.quantidade}).`
      );
      erro.statusCode = 400;
      throw erro;
    }

    let produtoBaixadoId = produtoId;
    let produtoRestanteId = null;

    if (quantidadeBaixa === produtoOriginal.quantidade) {
      // Quando toda a quantidade sai, o próprio lote passa a representar a baixa.
      await conexao.query(
        'UPDATE produtos_lotes SET status = ? WHERE id = ? AND estabelecimento_id = ?',
        [statusBaixa, produtoId, estabelecimentoId]
      );
    } else {
      // Em baixas parciais, preserva o saldo ativo e registra a quantidade retirada no histórico.
      const [resultadoBaixa] = await conexao.query(
        `INSERT INTO produtos_lotes
          (estabelecimento_id, nome, codigo_barras, lote, quantidade, data_validade, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          estabelecimentoId,
          produtoOriginal.nome,
          produtoOriginal.codigo_barras,
          produtoOriginal.lote,
          quantidadeBaixa,
          produtoOriginal.data_validade,
          statusBaixa
        ]
      );

      await conexao.query(
        'UPDATE produtos_lotes SET quantidade = quantidade - ? WHERE id = ? AND estabelecimento_id = ?',
        [quantidadeBaixa, produtoId, estabelecimentoId]
      );

      produtoBaixadoId = resultadoBaixa.insertId;
      produtoRestanteId = produtoId;
    }

    const [parametros] = await conexao.query(
      'SELECT dias_antecedencia_alerta FROM estabelecimentos WHERE id = ?',
      [estabelecimentoId]
    );

    const [produtosBaixados] = await conexao.query(
      'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [produtoBaixadoId, estabelecimentoId]
    );

    let produtoRestante = null;
    if (produtoRestanteId) {
      const [produtosRestantes] = await conexao.query(
        'SELECT * FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
        [produtoRestanteId, estabelecimentoId]
      );
      produtoRestante = produtosRestantes[0];
    }

    await conexao.commit();

    const produtoBaixado = enriquecerProdutoComFarol(
      produtosBaixados[0],
      parametros[0] ? parametros[0].dias_antecedencia_alerta : 7
    );

    const saldoRestante = produtoRestante
      ? enriquecerProdutoComFarol(
          produtoRestante,
          parametros[0] ? parametros[0].dias_antecedencia_alerta : 7
        )
      : null;

    const descricaoBaixa =
      statusBaixa === 'VENDIDO_PROMOCAO' ? 'Vendido/Promoção' : 'Descartado';

    return res.status(200).json({
      mensagem: `Baixa de ${quantidadeBaixa} unidade(s) registrada com sucesso como "${descricaoBaixa}"!`,
      quantidade_baixada: quantidadeBaixa,
      produto: produtoBaixado,
      produto_restante: saldoRestante
    });
  } catch (error) {
    if (conexao) await conexao.rollback();

    if (error.statusCode) {
      return res.status(error.statusCode).json({ erro: error.message });
    }

    console.error('Erro ao dar baixa no lote:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao registrar a baixa do produto.'
    });
  } finally {
    if (conexao) conexao.release();
  }
};

/**
 * DELETE /api/produtos/:id
 * Remove um lote cadastrado por engano pelo estabelecimento.
 */
exports.excluirProduto = async (req, res) => {
  try {
    const estabelecimentoId = req.estabelecimento.id;
    const produtoId = Number(req.params.id);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ erro: 'ID do lote inválido.' });
    }

    const [resultado] = await pool.query(
      'DELETE FROM produtos_lotes WHERE id = ? AND estabelecimento_id = ?',
      [produtoId, estabelecimentoId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Lote de produto não encontrado para este estabelecimento.'
      });
    }

    return res.status(200).json({
      mensagem: 'Lote de produto removido com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao excluir lote:', error);
    return res.status(500).json({
      erro: 'Erro interno no servidor ao remover o lote de produto.'
    });
  }
};

// Exporta funções utilitárias para facilitar testes unitários e validação
exports.calcularFarol = calcularFarol;
exports.validarDadosProduto = validarDadosProduto;
exports.normalizarStatusBaixa = normalizarStatusBaixa;
exports.normalizarEValidarData = normalizarEValidarData;
