const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do banco PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/crisma_db',
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: true
  } : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
};

const pool = new Pool(dbConfig);

// Event handlers do pool
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err);
});

// Função para atualizar estrutura do banco
async function atualizarEstruturaBanco() {
  try {
    console.log('🔄 Verificando/atualizando estrutura do banco...');

    // Criar tabela de usuários se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT true
      )
    `);

    // Criar índices para a tabela usuarios
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
      CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
    `);

    // Adicionar coluna email se não existir
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'usuarios' 
          AND column_name = 'email'
        ) THEN
          ALTER TABLE usuarios ADD COLUMN email VARCHAR(255);
        END IF;
      END $$;
    `);

    // Criar tabela de grupos/perfis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupos_acesso (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) UNIQUE NOT NULL,
        descricao TEXT,
        permissoes TEXT[],
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de relacionamento usuário-grupo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario_grupos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        grupo_id INTEGER NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, grupo_id)
      )
    `);

    // Criar índices para as tabelas de grupos
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuario_grupos_usuario ON usuario_grupos(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_usuario_grupos_grupo ON usuario_grupos(grupo_id);
      CREATE INDEX IF NOT EXISTS idx_grupos_acesso_nome ON grupos_acesso(nome);
      CREATE INDEX IF NOT EXISTS idx_grupos_acesso_ativo ON grupos_acesso(ativo);
    `);

    // Inserir grupos padrão (forçar criação sempre)
    await pool.query(`
      INSERT INTO grupos_acesso (nome, descricao, permissoes) VALUES 
      ('admin', 'Administrador do Sistema', 
       ARRAY['admin','usuarios.criar', 'usuarios.listar', 'usuarios.editar', 'usuarios.deletar', 
             'inscricoes.criar', 'inscricoes.listar', 'inscricoes.editar', 'inscricoes.deletar',
             'grupos.criar', 'grupos.listar', 'grupos.editar', 'grupos.deletar',
             'sistema.configurar']),
      ('operador', 'Operador do Sistema', 
       ARRAY['inscricoes.criar', 'inscricoes.listar', 'inscricoes.editar', 
             'usuarios.listar']),
      ('consulta', 'Apenas Consulta', 
       ARRAY['inscricoes.listar', 'usuarios.listar'])
      ON CONFLICT (nome) DO UPDATE SET
      permissoes = EXCLUDED.permissoes,
      descricao = EXCLUDED.descricao,
      updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✅ Grupos de acesso verificados/criados');

    // Inserir usuário admin padrão se não existir nenhum usuário
    const userCount = await pool.query('SELECT COUNT(*) as count FROM usuarios');
    if (parseInt(userCount.rows[0].count) === 0) {
      // Hash da senha 'admin123'
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await pool.query(
        'INSERT INTO usuarios (usuario, senha, nome) VALUES ($1, $2, $3) RETURNING id',
        ['admin', hashedPassword, 'Administrador']
      );
      
      // Associar usuário admin ao grupo admin
      await pool.query(`
        INSERT INTO usuario_grupos (usuario_id, grupo_id) 
        SELECT $1, g.id 
        FROM grupos_acesso g 
        WHERE g.nome = 'admin'
      `, [adminUser.rows[0].id]);
      
      console.log('✅ Usuário admin padrão criado e associado ao grupo admin');
    }

    // Garantir que usuário admin existente tenha grupo admin (forçar sempre)
    const adminUser = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', ['admin']);
    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;
      await pool.query(`
        INSERT INTO usuario_grupos (usuario_id, grupo_id) 
        SELECT $1, g.id 
        FROM grupos_acesso g 
        WHERE g.nome = 'admin'
        ON CONFLICT (usuario_id, grupo_id) DO NOTHING
      `, [adminId]);
      console.log('✅ Usuário admin verificado/associado ao grupo admin');
    }

    // Verificar e adicionar coluna tipo_inscricao
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'inscricoes_crisma' 
          AND column_name = 'tipo_inscricao'
        ) THEN
          ALTER TABLE inscricoes_crisma
          ADD COLUMN tipo_inscricao VARCHAR(20) NOT NULL DEFAULT 'crisma';

          ALTER TABLE inscricoes_crisma
          ADD CONSTRAINT inscricoes_tipo_check 
          CHECK (tipo_inscricao IN ('catequese', 'catecumenato', 'crisma'));

          CREATE INDEX IF NOT EXISTS idx_inscricoes_tipo ON inscricoes_crisma(tipo_inscricao);
        END IF;
      EXCEPTION
        WHEN undefined_table THEN
          RAISE NOTICE 'Table inscricoes_crisma does not exist yet';
      END $$;
    `);

    // Criar tabela de status_controle e histórico se não existirem
    await pool.query(`
      DO $$ 
      BEGIN
        -- Criar a tabela de controle se não existir
        CREATE TABLE IF NOT EXISTS status_controle (
          id SERIAL PRIMARY KEY,
          inscricao_id INTEGER NOT NULL REFERENCES inscricoes_crisma(id),
          status VARCHAR(20) NOT NULL CHECK (status IN ('Em Andamento', 'Desistência', 'Concluído', '')),
          observacao TEXT,
          data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(inscricao_id)
        );

        -- Criar a tabela de histórico se não existir
        CREATE TABLE IF NOT EXISTS status_historico (
          id SERIAL PRIMARY KEY,
          inscricao_id INTEGER NOT NULL REFERENCES inscricoes_crisma(id),
          status VARCHAR(20) NOT NULL CHECK (status IN ('Em Andamento', 'Desistência', 'Concluído', '')),
          observacao TEXT,
          data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Criar índice se não existir
        CREATE INDEX IF NOT EXISTS idx_status_inscricao ON status_controle(inscricao_id);
      EXCEPTION
        WHEN duplicate_table THEN
          NULL;
      END $$;
    `);

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

    console.log('✅ Estrutura do banco atualizada para BLOB!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar estrutura do banco:', error);
    return false;
  }
}

module.exports = {
  pool,
  atualizarEstruturaBanco
};