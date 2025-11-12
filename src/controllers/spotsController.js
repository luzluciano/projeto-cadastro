const { pool } = require('../config/database');

// Listar todos os spots (públicos - apenas ativos e dentro da vigência)
const listarSpotsPublicos = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, titulo, subtitulo, descricao, icone, imagem, 
        link_texto, link_url, tipo_spot, configuracoes, ordem
      FROM spots 
      WHERE ativo = true 
        AND (data_inicio IS NULL OR data_inicio <= CURRENT_TIMESTAMP)
        AND (data_fim IS NULL OR data_fim >= CURRENT_TIMESTAMP)
      ORDER BY ordem ASC, data_criacao DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar spots públicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Listar spots ativos (mesma lógica que públicos, mas com nome diferente)
const listarSpotsAtivos = async (req, res) => {
  try {
    console.log('🎯 Buscar spots ativos');
    
    const query = `
      SELECT 
        id, titulo, subtitulo, descricao, icone, imagem, 
        link_texto, link_url, tipo_spot, configuracoes, ordem,
        data_inicio, data_fim
      FROM spots 
      WHERE ativo = true 
        AND (data_inicio IS NULL OR data_inicio <= CURRENT_TIMESTAMP)
        AND (data_fim IS NULL OR data_fim >= CURRENT_TIMESTAMP)
      ORDER BY ordem ASC, data_criacao DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar spots ativos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Listar todos os spots (admin - todos, incluindo inativos)
const listarSpotsAdmin = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, titulo, subtitulo, descricao, icone, imagem, 
        link_texto, link_url, ativo, ordem, tipo_spot, 
        configuracoes, data_inicio, data_fim, 
        data_criacao, data_atualizacao
      FROM spots 
      ORDER BY ordem ASC, data_criacao DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar spots (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Buscar spot por ID
const buscarSpotPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM spots WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Spot não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao buscar spot:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Criar novo spot
const criarSpot = async (req, res) => {
  try {
    const {
      titulo, subtitulo, descricao, icone, imagem,
      link_texto, link_url, ativo, ordem, tipo_spot,
      configuracoes, data_inicio, data_fim,
      // Aceitar também formatos alternativos do frontend
      linkTexto, linkUrl, tipoSpot
    } = req.body;

    // Normalizar os campos para o formato do banco
    const linkTextoFinal = link_texto || linkTexto;
    const linkUrlFinal = link_url || linkUrl;
    const tipoSpotFinal = tipo_spot || tipoSpot;

    console.log('📝 Criando novo spot');
    console.log('🔗 Link texto recebido:', { link_texto, linkTexto, final: linkTextoFinal });
    console.log('🔗 Link URL recebido:', { link_url, linkUrl, final: linkUrlFinal });

    // Validações básicas
    if (!titulo || !descricao || !tipoSpotFinal || ordem === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: título, descrição, tipo_spot e ordem'
      });
    }

    // Verificar se já existe um spot com a mesma ordem
    const ordemExistente = await pool.query(
      'SELECT id FROM spots WHERE ordem = $1',
      [ordem]
    );

    if (ordemExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um spot com esta ordem. Escolha uma ordem diferente.'
      });
    }

    const query = `
      INSERT INTO spots (
        titulo, subtitulo, descricao, icone, imagem,
        link_texto, link_url, ativo, ordem, tipo_spot,
        configuracoes, data_inicio, data_fim
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      titulo, subtitulo, descricao, icone, imagem,
      linkTextoFinal, linkUrlFinal, ativo !== false, ordem, tipoSpotFinal,
      configuracoes ? JSON.stringify(configuracoes) : null,
      data_inicio || null, data_fim || null
    ];

    const result = await pool.query(query, values);
    const novoSpot = result.rows[0];

    console.log('✅ Novo spot criado:', novoSpot.id);
    console.log('✅ Valores finais:', { 
      link_texto: linkTextoFinal, 
      link_url: linkUrlFinal,
      tipo_spot: tipoSpotFinal 
    });

    res.status(201).json({
      success: true,
      data: novoSpot,
      message: 'Spot criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar spot:', error);
    
    if (error.code === '23505') { // Violação de constraint único
      return res.status(400).json({
        success: false,
        error: 'Já existe um spot com esta ordem'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Atualizar spot
const atualizarSpot = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo, subtitulo, descricao, icone, imagem,
      link_texto, link_url, ativo, ordem, tipo_spot,
      configuracoes, data_inicio, data_fim,
      // Aceitar também formatos alternativos do frontend
      linkTexto, linkUrl, tipoSpot
    } = req.body;

    // Normalizar os campos para o formato do banco
    const linkTextoFinal = link_texto || linkTexto;
    const linkUrlFinal = link_url || linkUrl;
    const tipoSpotFinal = tipo_spot || tipoSpot;

    console.log('📝 Atualizando spot:', id);
    console.log('🔗 Link texto recebido:', { link_texto, linkTexto, final: linkTextoFinal });
    console.log('🔗 Link URL recebido:', { link_url, linkUrl, final: linkUrlFinal });

    // Se a ordem foi alterada, verificar se não conflita
    if (ordem !== undefined) {
      const ordemExistente = await pool.query(
        'SELECT id FROM spots WHERE ordem = $1 AND id != $2',
        [ordem, id]
      );

      if (ordemExistente.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um spot com esta ordem'
        });
      }
    }

    const query = `
      UPDATE spots SET
        titulo = $1,
        subtitulo = $2,
        descricao = $3,
        icone = $4,
        imagem = $5,
        link_texto = $6,
        link_url = $7,
        ativo = $8,
        ordem = $9,
        tipo_spot = $10,
        configuracoes = $11,
        data_inicio = $12,
        data_fim = $13
      WHERE id = $14
      RETURNING *
    `;

    // Buscar dados atuais do spot para manter valores não enviados
    const spotAtual = await pool.query('SELECT * FROM spots WHERE id = $1', [id]);
    if (spotAtual.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Spot não encontrado'
      });
    }
    
    const spot = spotAtual.rows[0];

    const values = [
      titulo !== undefined ? titulo : spot.titulo,
      subtitulo !== undefined ? subtitulo : spot.subtitulo,
      descricao !== undefined ? descricao : spot.descricao,
      icone !== undefined ? icone : spot.icone,
      imagem !== undefined ? imagem : spot.imagem,
      linkTextoFinal !== undefined ? linkTextoFinal : spot.link_texto,
      linkUrlFinal !== undefined ? linkUrlFinal : spot.link_url,
      ativo !== undefined ? ativo : spot.ativo,
      ordem !== undefined ? ordem : spot.ordem,
      tipoSpotFinal !== undefined ? tipoSpotFinal : spot.tipo_spot,
      configuracoes !== undefined ? (configuracoes ? JSON.stringify(configuracoes) : null) : spot.configuracoes,
      data_inicio !== undefined ? data_inicio : spot.data_inicio,
      data_fim !== undefined ? data_fim : spot.data_fim,
      id
    ];

    const result = await pool.query(query, values);
    const spotAtualizado = result.rows[0];

    console.log('✅ Spot atualizado:', id);
    console.log('✅ Valores finais:', { 
      link_texto: linkTextoFinal, 
      link_url: linkUrlFinal,
      tipo_spot: tipoSpotFinal 
    });

    res.json({
      success: true,
      data: spotAtualizado,
      message: 'Spot atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar spot:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Já existe um spot com esta ordem'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Excluir spot
const excluirSpot = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM spots WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Spot não encontrado'
      });
    }

    console.log('✅ Spot excluído:', id);

    res.json({
      success: true,
      message: 'Spot excluído com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao excluir spot:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Reordenar spots
const reordenarSpots = async (req, res) => {
  try {
    const { spots } = req.body; // Array de { id, ordem }

    if (!Array.isArray(spots)) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos. Esperado array de spots'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const spot of spots) {
        if (!spot.id || spot.ordem === undefined) {
          throw new Error('ID e ordem são obrigatórios para cada spot');
        }

        await client.query(
          'UPDATE spots SET ordem = $1 WHERE id = $2',
          [spot.ordem, spot.id]
        );
      }

      await client.query('COMMIT');
      
      console.log('✅ Spots reordenados com sucesso');

      res.json({
        success: true,
        message: 'Spots reordenados com sucesso'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erro ao reordenar spots:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
};

// Alternar status ativo/inativo
const alternarStatusSpot = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE spots SET ativo = NOT ativo WHERE id = $1 RETURNING id, ativo',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Spot não encontrado'
      });
    }

    const spot = result.rows[0];
    console.log(`✅ Status do spot ${id} alterado para: ${spot.ativo ? 'ativo' : 'inativo'}`);

    res.json({
      success: true,
      data: spot,
      message: `Spot ${spot.ativo ? 'ativado' : 'desativado'} com sucesso`
    });
  } catch (error) {
    console.error('❌ Erro ao alterar status do spot:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarSpotsPublicos,
  listarSpotsAtivos,
  listarSpotsAdmin,
  buscarSpotPorId,
  criarSpot,
  atualizarSpot,
  excluirSpot,
  reordenarSpots,
  alternarStatusSpot
};