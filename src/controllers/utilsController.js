const { pool } = require('../config/database');

// Teste de conexão
const testeConexao = async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Teste de conexão bem-sucedido:', result.rows[0]);
    
    res.json({ 
      success: true, 
      message: 'Backend funcionando!',
      database: 'Conectado',
      timestamp: new Date().toISOString(),
      db_time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    res.status(500).json({ success: false, message: 'Erro de conexão' });
  }
};

// Verificar tabelas
const debugTabelas = async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT id, usuario, nome FROM usuarios');
    const grupos = await pool.query('SELECT id, nome, permissoes FROM grupos_acesso');
    const userGroups = await pool.query(`
      SELECT ug.usuario_id, ug.grupo_id, u.usuario, ga.nome as grupo_nome 
      FROM usuario_grupos ug 
      JOIN usuarios u ON ug.usuario_id = u.id 
      JOIN grupos_acesso ga ON ug.grupo_id = ga.id
    `);
    
    res.json({
      success: true,
      data: {
        usuarios: usuarios.rows,
        grupos: grupos.rows,
        usuario_grupos: userGroups.rows
      }
    });
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Atualizar estrutura do banco para BLOB
const atualizarEstruturaBlob = async (req, res) => {
  try {
    console.log('🔄 Atualizando estrutura do banco para armazenar arquivos como BLOB...');

    // Remover colunas antigas de path se existirem
    await pool.query(`
      ALTER TABLE inscricoes_crisma 
      DROP COLUMN IF EXISTS documento_identidade_path,
      DROP COLUMN IF EXISTS certidao_batismo_path
    `);

    // Adicionar colunas para armazenar arquivos como BLOB
    await pool.query(`
      ALTER TABLE inscricoes_crisma 
      ADD COLUMN IF NOT EXISTS documento_identidade_data BYTEA,
      ADD COLUMN IF NOT EXISTS documento_identidade_nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS documento_identidade_tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS documento_identidade_tamanho INTEGER,
      ADD COLUMN IF NOT EXISTS certidao_batismo_data BYTEA,
      ADD COLUMN IF NOT EXISTS certidao_batismo_nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS certidao_batismo_tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS certidao_batismo_tamanho INTEGER
    `);

    console.log('✅ Estrutura do banco atualizada com sucesso!');

    res.json({
      success: true,
      message: 'Estrutura do banco atualizada para armazenar arquivos como BLOB'
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar estrutura do banco:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estrutura do banco',
      error: error.message
    });
  }
};

// Corrigir campo comunhão
const corrigirComunhao = async (req, res) => {
  try {
    console.log('🔧 Executando correção do campo comunhao...');
    
    // Verificar se a restrição existe
    const checkConstraint = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'inscricoes_crisma' 
      AND constraint_name = 'inscricoes_crisma_comunhao_check'
    `);
    
    if (checkConstraint.rows.length > 0) {
      // Remover a restrição
      await pool.query('ALTER TABLE inscricoes_crisma DROP CONSTRAINT inscricoes_crisma_comunhao_check');
      console.log('✅ Restrição comunhao_check removida');
    }
    
    // Alterar o tipo do campo para BOOLEAN
    await pool.query(`
      ALTER TABLE inscricoes_crisma ALTER COLUMN comunhao TYPE BOOLEAN USING 
        CASE 
          WHEN comunhao = 'Sim' THEN TRUE
          WHEN comunhao = 'Não' THEN FALSE
          ELSE NULL
        END
    `);
    console.log('✅ Campo comunhao alterado para BOOLEAN');
    
    // Definir valor padrão como NULL
    await pool.query('ALTER TABLE inscricoes_crisma ALTER COLUMN comunhao SET DEFAULT NULL');
    console.log('✅ Valor padrão definido como NULL');
    
    res.json({
      success: true,
      message: 'Campo comunhao corrigido com sucesso!',
      details: 'Agora aceita valores boolean (true/false/null)'
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao corrigir campo comunhao',
      error: error.message
    });
  }
};

// Verificar se tabela existe
const verificarTabela = async (req, res) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inscricoes_crisma'
      );
    `;
    
    const result = await pool.query(query);
    const tableExists = result.rows[0].exists;
    
    if (tableExists) {
      // Contar registros existentes
      const countResult = await pool.query('SELECT COUNT(*) FROM inscricoes_crisma');
      const count = parseInt(countResult.rows[0].count);
      
      res.json({
        success: true,
        tableExists: true,
        message: `Tabela 'inscricoes_crisma' existe com ${count} registros`,
        count: count
      });
    } else {
      res.json({
        success: false,
        tableExists: false,
        message: 'Tabela inscricoes_crisma não existe. Execute o script database/schema.sql'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar tabela',
      error: error.message
    });
  }
};

module.exports = {
  testeConexao,
  debugTabelas,
  atualizarEstruturaBlob,
  corrigirComunhao,
  verificarTabela
};