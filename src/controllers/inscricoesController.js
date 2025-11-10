const { pool } = require('../config/database');
const { convertRowToInscricao } = require('../utils/helpers');
const fs = require('fs-extra');

// Criar nova inscrição
const criarInscricao = async (req, res) => {
  try {
    console.log('📝 Recebendo nova inscrição:', req.body);
    
    const dados = req.body;
    
    const query = `
      INSERT INTO inscricoes_crisma (
        email, nome_completo, data_nascimento, naturalidade, sexo, endereco,
        tipo_inscricao, batizado, paroquia_batismo, diocese_batismo, comunhao, paroquia_comunhao, diocese_comunhao,
        telefone_whatsapp, email_contato,
        nome_pai, estado_civil_pai, naturalidade_pai,
        nome_mae, estado_civil_mae, naturalidade_mae,
        pais_casados_igreja, paroquia_casamento_pais, diocese_casamento_pais,
        nome_padrinho_madrinha, padrinho_crismado,
        data_inicio_curso, comunidade_curso, nome_catequista, horario_curso
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26,
        $27, $28, $29, $30
      ) RETURNING id, created_at;
    `;

    const values = [
      dados.email, dados.nomeCompleto, dados.dataNascimento, dados.naturalidade, dados.sexo, dados.endereco,
      dados.tipoInscricao, dados.batizado, dados.paroquiaBatismo, dados.dioceseBatismo, dados.comunhao, dados.paroquiaComunhao, dados.dioceseComunhao,
      dados.telefoneWhatsApp, dados.emailContato,
      dados.nomePai, dados.estadoCivilPai, dados.naturalidadePai,
      dados.nomeMae, dados.estadoCivilMae, dados.naturalidadeMae,
      dados.paisCasadosIgreja, dados.paroquiaCasamentoPais, dados.dioceseCasamentoPais,
      dados.nomePadrinhoMadrinha, dados.padrinhoCrismado,
      dados.dataInicioCurso, dados.comunidadeCurso, dados.nomeCatequista, dados.horarioCurso
    ];

    const result = await pool.query(query, values);
    const novaInscricao = result.rows[0];
    
    // Criar registro de status inicial
    const statusQuery = `
      INSERT INTO status_controle (inscricao_id, status, observacao, data_atualizacao)
      VALUES ($1, 'Em Andamento', 'Cadastro inicial', CURRENT_TIMESTAMP)
    `;
    await pool.query(statusQuery, [novaInscricao.id]);
    
    res.json({
      success: true,
      message: 'Inscrição salva com sucesso!',
      data: novaInscricao
    });
    
    console.log('✅ Inscrição salva com ID:', novaInscricao.id);
  } catch (error) {
    console.error('❌ Erro ao salvar inscrição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar inscrição',
      error: error.message,
      details: error.detail || error.hint || 'Verifique se o banco de dados está configurado corretamente'
    });
  }
};

// Buscar inscrições com filtros
const buscarInscricoes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Construir query com filtros
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Filtros disponíveis
    if (req.query.email) {
      whereConditions.push(`email ILIKE $${paramIndex}`);
      queryParams.push(`%${req.query.email}%`);
      paramIndex++;
    }
    
    if (req.query.nomeCompleto) {
      whereConditions.push(`nome_completo ILIKE $${paramIndex}`);
      queryParams.push(`%${req.query.nomeCompleto}%`);
      paramIndex++;
    }
    
    if (req.query.comunidadeCurso) {
      whereConditions.push(`comunidade_curso ILIKE $${paramIndex}`);
      queryParams.push(`%${req.query.comunidadeCurso}%`);
      paramIndex++;
    }
    
    if (req.query.sexo) {
      whereConditions.push(`sexo = $${paramIndex}`);
      queryParams.push(req.query.sexo);
      paramIndex++;
    }
    
    if (req.query.batizado) {
      const batizadoValue = req.query.batizado === 'true';
      whereConditions.push(`batizado = $${paramIndex}`);
      queryParams.push(batizadoValue);
      paramIndex++;
    }
    
    if (req.query.dataInicio) {
      whereConditions.push(`data_nascimento >= $${paramIndex}`);
      queryParams.push(req.query.dataInicio);
      paramIndex++;
    }
    
    if (req.query.dataFim) {
      whereConditions.push(`data_nascimento <= $${paramIndex}`);
      queryParams.push(req.query.dataFim);
      paramIndex++;
    }
    
    // Construir query final
    let query = `
      SELECT 
        i.*,
        sh.status as ultimo_status,
        sh.observacao as ultimo_status_obs,
        sh.data_atualizacao as ultimo_status_data
      FROM inscricoes_crisma i
      LEFT JOIN (
        SELECT DISTINCT ON (inscricao_id) 
          inscricao_id,
          status,
          observacao,
          data_atualizacao
        FROM status_historico
        ORDER BY inscricao_id, created_at DESC
      ) sh ON i.id = sh.inscricao_id
    `;
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ` ORDER BY i.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    console.log('🔍 Query de consulta:', query);
    console.log('📋 Parâmetros:', queryParams);
    
    const result = await pool.query(query, queryParams);
    
    // Converter campos para formato frontend usando função auxiliar
    const inscricoes = result.rows.map(row => convertRowToInscricao(row));
    
    // Log temporário para debug
    if (inscricoes.length > 0) {
      console.log('🔍 Debug - Primeira inscrição retornada:');
      console.log('- documentoIdentidadeNome:', inscricoes[0].documentoIdentidadeNome);
      console.log('- certidaoBatismoNome:', inscricoes[0].certidaoBatismoNome);
      console.log('- documentoIdentidadeTamanho:', inscricoes[0].documentoIdentidadeTamanho);
      console.log('- certidaoBatismoTamanho:', inscricoes[0].certidaoBatismoTamanho);
    }
    
    res.json(inscricoes);
    
  } catch (error) {
    console.error('❌ Erro ao buscar inscrições:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar inscrições',
      error: error.message
    });
  }
};

// Buscar inscrição por ID
const obterInscricao = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM inscricoes_crisma WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscrição não encontrada'
      });
    }
    
    const row = result.rows[0];
    const inscricao = convertRowToInscricao(row);
    
    res.json(inscricao);
    
  } catch (error) {
    console.error('❌ Erro ao buscar inscrição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar inscrição',
      error: error.message
    });
  }
};

// Atualizar inscrição
const atualizarInscricao = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;
    
    console.log(`🔄 Atualizando inscrição ID: ${id}`);
    console.log('📋 Dados recebidos:', dados);
    
    const query = `
      UPDATE inscricoes_crisma 
      SET 
        email = $1,
        nome_completo = $2,
        data_nascimento = $3,
        naturalidade = $4,
        sexo = $5,
        endereco = $6,
        tipo_inscricao = $7,
        batizado = $8,
        paroquia_batismo = $9,
        diocese_batismo = $10,
        comunhao = $11,
        paroquia_comunhao = $12,
        diocese_comunhao = $13,
        telefone_whatsapp = $14,
        email_contato = $15,
        nome_pai = $16,
        estado_civil_pai = $17,
        naturalidade_pai = $18,
        nome_mae = $19,
        estado_civil_mae = $20,
        naturalidade_mae = $21,
        pais_casados_igreja = $22,
        paroquia_casamento_pais = $23,
        diocese_casamento_pais = $24,
        nome_padrinho_madrinha = $25,
        padrinho_crismado = $26,
        data_inicio_curso = $27,
        comunidade_curso = $28,
        nome_catequista = $29,
        horario_curso = $30,
        updated_at = NOW()
      WHERE id = $31
      RETURNING *
    `;
    
    const values = [
      dados.email, dados.nomeCompleto, dados.dataNascimento, dados.naturalidade, dados.sexo, dados.endereco,
      dados.tipoInscricao, dados.batizado, dados.paroquiaBatismo, dados.dioceseBatismo, dados.comunhao, dados.paroquiaComunhao, dados.dioceseComunhao,
      dados.telefoneWhatsApp, dados.emailContato,
      dados.nomePai, dados.estadoCivilPai, dados.naturalidadePai,
      dados.nomeMae, dados.estadoCivilMae, dados.naturalidadeMae,
      dados.paisCasadosIgreja, dados.paroquiaCasamentoPais, dados.dioceseCasamentoPais,
      dados.nomePadrinhoMadrinha, dados.padrinhoCrismado,
      dados.dataInicioCurso, dados.comunidadeCurso, dados.nomeCatequista, dados.horarioCurso,
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscrição não encontrada'
      });
    }
    
    console.log('✅ Inscrição atualizada com sucesso');
    
    res.json({
      success: true,
      message: 'Inscrição atualizada com sucesso!',
      data: convertRowToInscricao(result.rows[0])
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar inscrição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar inscrição',
      error: error.message
    });
  }
};

// Excluir inscrição
const excluirInscricao = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Excluindo inscrição ID: ${id}`);
    
    // Primeiro, buscar os dados da inscrição antes de excluir
    const selectQuery = 'SELECT * FROM inscricoes_crisma WHERE id = $1';
    const selectResult = await pool.query(selectQuery, [id]);
    
    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscrição não encontrada'
      });
    }
    
    const inscricao = selectResult.rows[0];
    
    // Excluir a inscrição
    const deleteQuery = 'DELETE FROM inscricoes_crisma WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    console.log(`✅ Inscrição de "${inscricao.nome_completo}" excluída com sucesso`);
    
    res.json({
      success: true,
      message: `Inscrição de "${inscricao.nome_completo}" excluída com sucesso!`,
      deletedData: convertRowToInscricao(inscricao)
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir inscrição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir inscrição',
      error: error.message
    });
  }
};

// Criar inscrição com arquivos
const criarInscricaoComArquivos = async (req, res) => {
  try {
    console.log('📄 Recebendo inscrição com arquivos...');
    console.log('📋 Dados recebidos:', req.body);
    console.log('📎 Arquivos recebidos:', req.files);

    const dados = JSON.parse(req.body.dadosInscricao);
    
    // Processar arquivos para BLOB
    let documentoIdentidadeData = null, docIdNome = null, docIdTipo = null, docIdTamanho = null;
    let certidaoBatismoData = null, certBatNome = null, certBatTipo = null, certBatTamanho = null;

    if (req.files['documentoIdentidade']) {
      const file = req.files['documentoIdentidade'][0];
      documentoIdentidadeData = file.buffer;
      docIdNome = file.originalname;
      docIdTipo = file.mimetype;
      docIdTamanho = file.size;
    }

    if (req.files['certidaoBatismo']) {
      const file = req.files['certidaoBatismo'][0];
      certidaoBatismoData = file.buffer;
      certBatNome = file.originalname;
      certBatTipo = file.mimetype;
      certBatTamanho = file.size;
    }

    // Query SQL atualizada com campos BLOB
    const query = `
      INSERT INTO inscricoes_crisma (
        email, nome_completo, data_nascimento, naturalidade, sexo, endereco,
        tipo_inscricao, batizado, paroquia_batismo, diocese_batismo, comunhao, paroquia_comunhao, diocese_comunhao,
        telefone_whatsapp, email_contato,
        nome_pai, estado_civil_pai, naturalidade_pai,
        nome_mae, estado_civil_mae, naturalidade_mae,
        pais_casados_igreja, paroquia_casamento_pais, diocese_casamento_pais,
        nome_padrinho_madrinha, padrinho_crismado,
        data_inicio_curso, comunidade_curso, nome_catequista, horario_curso,
        documento_identidade_data, documento_identidade_nome, documento_identidade_tipo, documento_identidade_tamanho,
        certidao_batismo_data, certidao_batismo_nome, certidao_batismo_tipo, certidao_batismo_tamanho
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33, $34,
        $35, $36, $37, $38
      ) RETURNING id, created_at;
    `;

    const values = [
      dados.email, dados.nomeCompleto, dados.dataNascimento, dados.naturalidade, dados.sexo, dados.endereco,
      dados.tipoInscricao, dados.batizado, dados.paroquiaBatismo, dados.dioceseBatismo, dados.comunhao, dados.paroquiaComunhao, dados.dioceseComunhao,
      dados.telefoneWhatsApp, dados.emailContato,
      dados.nomePai, dados.estadoCivilPai, dados.naturalidadePai,
      dados.nomeMae, dados.estadoCivilMae, dados.naturalidadeMae,
      dados.paisCasadosIgreja, dados.paroquiaCasamentoPais, dados.dioceseCasamentoPais,
      dados.nomePadrinhoMadrinha, dados.padrinhoCrismado,
      dados.dataInicioCurso, dados.comunidadeCurso, dados.nomeCatequista, dados.horarioCurso,
      documentoIdentidadeData, docIdNome, docIdTipo, docIdTamanho,
      certidaoBatismoData, certBatNome, certBatTipo, certBatTamanho
    ];

    const result = await pool.query(query, values);
    const novaInscricao = result.rows[0];

    // Criar registro de status inicial
    const statusQuery = `
      INSERT INTO status_controle (inscricao_id, status, observacao, data_atualizacao)
      VALUES ($1, 'Em Andamento', 'Cadastro inicial', CURRENT_TIMESTAMP)
    `;
    await pool.query(statusQuery, [novaInscricao.id]);

    console.log('✅ Inscrição criada com arquivos no banco:', {
      id: novaInscricao.id,
      documentoIdentidade: docIdNome || 'Não anexado',
      certidaoBatismo: certBatNome || 'Não anexado'
    });

    res.status(201).json({
      success: true,
      message: 'Inscrição criada com sucesso! Arquivos salvos no banco de dados.',
      data: {
        id: novaInscricao.id,
        created_at: novaInscricao.created_at,
        arquivos: {
          documentoIdentidade: docIdNome ? {
            nome: docIdNome,
            tipo: docIdTipo,
            tamanho: docIdTamanho
          } : null,
          certidaoBatismo: certBatNome ? {
            nome: certBatNome,
            tipo: certBatTipo,
            tamanho: certBatTamanho
          } : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar inscrição com arquivos:', error);

    // Remover arquivos temporários se houve erro
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Download de arquivos
const downloadDocumentoIdentidade = async (req, res) => {
  try {
    const inscricaoId = req.params.id;
    
    const result = await pool.query(
      'SELECT documento_identidade_data, documento_identidade_nome, documento_identidade_tipo FROM inscricoes_crisma WHERE id = $1',
      [inscricaoId]
    );

    if (result.rows.length === 0 || !result.rows[0].documento_identidade_data) {
      return res.status(404).json({ success: false, message: 'Documento não encontrado' });
    }

    const arquivo = result.rows[0];
    
    res.setHeader('Content-Type', arquivo.documento_identidade_tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.documento_identidade_nome}"`);
    res.send(arquivo.documento_identidade_data);

  } catch (error) {
    console.error('❌ Erro ao baixar documento de identidade:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

const downloadCertidaoBatismo = async (req, res) => {
  try {
    const inscricaoId = req.params.id;
    
    const result = await pool.query(
      'SELECT certidao_batismo_data, certidao_batismo_nome, certidao_batismo_tipo FROM inscricoes_crisma WHERE id = $1',
      [inscricaoId]
    );

    if (result.rows.length === 0 || !result.rows[0].certidao_batismo_data) {
      return res.status(404).json({ success: false, message: 'Documento não encontrado' });
    }

    const arquivo = result.rows[0];
    
    res.setHeader('Content-Type', arquivo.certidao_batismo_tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.certidao_batismo_nome}"`);
    res.send(arquivo.certidao_batismo_data);

  } catch (error) {
    console.error('❌ Erro ao baixar certidão de batismo:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

module.exports = {
  criarInscricao,
  buscarInscricoes,
  obterInscricao,
  atualizarInscricao,
  excluirInscricao,
  criarInscricaoComArquivos,
  downloadDocumentoIdentidade,
  downloadCertidaoBatismo
};