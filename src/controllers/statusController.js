const { pool } = require('../config/database');

// Salvar status de controle
const salvarStatus = async (req, res) => {
  try {
    const inscricaoId = req.params.id;
    const { status, observacao } = req.body;
    
    // Primeiro verificar se a inscrição existe
    const checkInscricao = await pool.query('SELECT id FROM inscricoes_crisma WHERE id = $1', [inscricaoId]);
    if (checkInscricao.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inscrição não encontrada'
      });
    }

    // Iniciar uma transação
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Salvar novo status no histórico
      const timestamp = new Date().toISOString();
      
      const query = `
        INSERT INTO status_historico (
          inscricao_id, 
          status, 
          observacao, 
          data_atualizacao,
          created_at
        )
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *;
      `;
      const result = await client.query(query, [inscricaoId, status, observacao, timestamp]);

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message
    });
  }
};

// Buscar histórico de status
const obterHistoricoStatus = async (req, res) => {
  try {
    const inscricaoId = req.params.id;
    console.log('🔍 Buscando histórico para inscrição:', inscricaoId);
    
    const query = `
      SELECT 
        id, 
        inscricao_id, 
        status, 
        observacao, 
        data_atualizacao, 
        created_at
      FROM status_historico 
      WHERE inscricao_id = $1 
      ORDER BY created_at DESC, id DESC
    `;
    const result = await pool.query(query, [inscricaoId]);
    
    console.log('📊 Registros encontrados:', result.rows.length);
    
    // Converter snake_case para camelCase antes de enviar
    const historico = result.rows.map(row => {
      const item = {
        id: row.id,
        inscricaoId: row.inscricao_id,
        status: row.status,
        observacao: row.observacao,
        dataAtualizacao: row.data_atualizacao,
        createdAt: row.created_at
      };
      console.log('🔄 Item do histórico:', item);
      return item;
    });

    res.json(historico);
    
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de status',
      error: error.message
    });
  }
};

// Buscar status de controle
const obterStatus = async (req, res) => {
  try {
    const inscricaoId = req.params.id;
    
    const query = 'SELECT * FROM status_controle WHERE inscricao_id = $1';
    const result = await pool.query(query, [inscricaoId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Status não encontrado'
      });
    }

    // Converter snake_case para camelCase antes de enviar
    const row = result.rows[0];
    const status = {
      id: row.id,
      inscricaoId: row.inscricao_id,
      status: row.status,
      observacao: row.observacao,
      dataAtualizacao: row.data_atualizacao
    };
    
    res.json(status);
    
  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar status',
      error: error.message
    });
  }
};

module.exports = {
  salvarStatus,
  obterHistoricoStatus,
  obterStatus
};