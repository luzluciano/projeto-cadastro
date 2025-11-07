require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Configuração do Multer para upload de arquivos
const uploadDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.memoryStorage();
////#
//const storage = multer.diskStorage({
//  destination: (req, file, cb) => {
//    cb(null, uploadDir);
//  },
//  filename: (req, file, cb) => {
    // Gerar nome único: timestamp_originalname
////    const uniqueName = Date.now() + '_' + file.originalname;
//    cb(null, uniqueName);
 // }
//});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas PDF, JPG, PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas PDF, JPG ou PNG.'));
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(uploadDir));

// Testar conexão inicial
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err);
});

// ===== FUNÇÕES AUXILIARES =====

// Função para converter linha do banco para objeto frontend
function convertRowToInscricao(row) {
  return {
    tipoInscricao: row.tipo_inscricao,
    id: row.id,
    email: row.email,
    status: {
      atual: row.ultimo_status || 'Não definido',
      observacao: row.ultimo_status_obs || '',
      dataAtualizacao: row.ultimo_status_data || null
    },
    nomeCompleto: row.nome_completo,
    dataNascimento: row.data_nascimento,
    naturalidade: row.naturalidade,
    sexo: row.sexo,
    endereco: row.endereco,
    batizado: row.batizado,
    paroquiaBatismo: row.paroquia_batismo,
    dioceseBatismo: row.diocese_batismo,
    comunhao: row.comunhao === true ? 'Sim' : (row.comunhao === false ? 'Não' : null),
    paroquiaComunhao: row.paroquia_comunhao,
    dioceseComunhao: row.diocese_comunhao,
    telefoneWhatsApp: row.telefone_whatsapp,
    emailContato: row.email_contato,
    nomePai: row.nome_pai,
    estadoCivilPai: row.estado_civil_pai,
    naturalidadePai: row.naturalidade_pai,
    nomeMae: row.nome_mae,
    estadoCivilMae: row.estado_civil_mae,
    naturalidadeMae: row.naturalidade_mae,
    paisCasadosIgreja: row.pais_casados_igreja,
    paroquiaCasamentoPais: row.paroquia_casamento_pais,
    dioceseCasamentoPais: row.diocese_casamento_pais,
    nomePadrinhoMadrinha: row.nome_padrinho_madrinha,
    padrinhoCrismado: row.padrinho_crismado,
    dataInicioCurso: row.data_inicio_curso,
    comunidadeCurso: row.comunidade_curso,
    nomeCatequista: row.nome_catequista,
    horarioCurso: row.horario_curso,
    // Metadados dos arquivos BLOB
    documentoIdentidadeNome: row.documento_identidade_nome,
    documentoIdentidadeTipo: row.documento_identidade_tipo,
    documentoIdentidadeTamanho: row.documento_identidade_tamanho,
    certidaoBatismoNome: row.certidao_batismo_nome,
    certidaoBatismoTipo: row.certidao_batismo_tipo,
    certidaoBatismoTamanho: row.certidao_batismo_tamanho,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ===== ROTAS DA API =====

// ===== AUTENTICAÇÃO E USUÁRIOS =====

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_muito_forte';

// Função para buscar permissões do usuário
const getUserPermissions = async (userId) => {
  try {
    console.log(`🔍 Buscando permissões para usuário ID: ${userId}`);
    
    const result = await pool.query(`
      SELECT DISTINCT unnest(ga.permissoes) as permissao
      FROM usuarios u
      JOIN usuario_grupos ug ON u.id = ug.usuario_id
      JOIN grupos_acesso ga ON ug.grupo_id = ga.id
      WHERE u.id = $1 AND u.ativo = true AND ga.ativo = true
      ORDER BY permissao
    `, [userId]);

    console.log(`📋 Permissões encontradas para usuário ${userId}:`, result.rows.map(row => row.permissao));
    
    return result.rows.map(row => row.permissao);
  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error);
    return [];
  }
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Verificar se é o primeiro usuário (permite cadastro sem token)
const isFirstUser = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM usuarios');
    const count = parseInt(result.rows[0].count);
    
    // Permite cadastro sem token se não há usuários ou há apenas o admin padrão
    if (count === 0) return true;
    if (count === 1) {
      const adminCheck = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE usuario = $1', ['admin']);
      return parseInt(adminCheck.rows[0].count) === 1;
    }
    return false;
  } catch (error) {
    console.error('Erro ao verificar primeiro usuário:', error);
    return false;
  }
};

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário e senha são obrigatórios' 
      });
    }

    // Buscar usuário
    const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1 AND ativo = true', [usuario]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    const user = result.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        usuario: user.usuario,
        nome: user.nome 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Buscar permissões do usuário
    const permissions = await getUserPermissions(user.id);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        usuario: {
          id: user.id,
          usuario: user.usuario,
          nome: user.nome,
          permissions: permissions
        }
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Verificar token
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    // Buscar dados atualizados do usuário
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1 AND ativo = true', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    const user = result.rows[0];

    // Buscar permissões do usuário
    const permissions = await getUserPermissions(user.id);

    res.json({
      success: true,
      message: 'Token válido',
      data: {
        usuario: {
          id: user.id,
          usuario: user.usuario,
          nome: user.nome,
          permissions: permissions
        }
      }
    });

  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Criar usuário
app.post('/api/usuarios', async (req, res) => {
  try {
    const { usuario, senha, nome, email } = req.body;

    // Validações
    if (!usuario || !senha || !nome) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário, senha e nome são obrigatórios' 
      });
    }

    // PERMITIR CADASTRO SEM TOKEN (CADASTRO PÚBLICO)
    // Não verificar autenticação para permitir novos cadastros

    // Verificar se usuário já existe
    const existingUser = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário já existe' 
      });
    }

    // Hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);

    // Inserir usuário
    const result = await pool.query(
      'INSERT INTO usuarios (usuario, senha, nome, email) VALUES ($1, $2, $3, $4) RETURNING id, usuario, nome, email, created_at, ativo',
      [usuario, hashedPassword, nome, email || null]
    );

    const newUser = result.rows[0];

    // Atribuir grupo padrão "consulta" para novos usuários
    await pool.query(`
      INSERT INTO usuario_grupos (usuario_id, grupo_id) 
      SELECT $1, g.id 
      FROM grupos_acesso g 
      WHERE g.nome = 'consulta'
    `, [newUser.id]);

    res.json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        id: newUser.id,
        usuario: newUser.usuario,
        nome: newUser.nome,
        email: newUser.email,
        created_at: newUser.created_at,
        ativo: newUser.ativo
      }
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Listar usuários
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    // Buscar todos os usuários com email
    const result = await pool.query(
      'SELECT id, usuario, nome, email, created_at, updated_at, ativo FROM usuarios ORDER BY id'
    );

    // Buscar permissões de cada usuário
    const usuarios = await Promise.all(result.rows.map(async (user) => {
      // Buscar permissões do usuário usando a função getUserPermissions
      const permissions = await getUserPermissions(user.id);
      
      return {
        id: user.id,
        usuario: user.usuario,
        nome: user.nome,
        email: user.email || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        ativo: user.ativo,
        permissions
      };
    }));

    res.json({
      success: true,
      data: usuarios
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Obter usuário por ID
app.get('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, usuario, nome, created_at, updated_at, ativo FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Atualizar usuário
app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario, senha, nome, ativo } = req.body;

    // Buscar usuário atual
    const currentUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Preparar dados para atualização
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (usuario !== undefined) {
      // Verificar se novo nome de usuário já existe (em outro usuário)
      const existingUser = await pool.query('SELECT id FROM usuarios WHERE usuario = $1 AND id != $2', [usuario, id]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nome de usuário já está em uso' 
        });
      }
      updates.push(`usuario = $${paramIndex}`);
      values.push(usuario);
      paramIndex++;
    }

    if (senha !== undefined && senha !== null && senha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(senha, 10);
      updates.push(`senha = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (nome !== undefined) {
      updates.push(`nome = $${paramIndex}`);
      values.push(nome);
      paramIndex++;
    }

    if (ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`);
      values.push(ativo);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum campo para atualizar' 
      });
    }

    // Adicionar updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE usuarios 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, usuario, nome, created_at, updated_at, ativo
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Deletar usuário
app.delete('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se não está tentando deletar a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Não é possível deletar o próprio usuário' 
      });
    }

    // Buscar usuário antes de deletar
    const userToDelete = await pool.query(
      'SELECT id, usuario, nome FROM usuarios WHERE id = $1',
      [id]
    );

    if (userToDelete.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Deletar usuário
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso',
      data: userToDelete.rows[0]
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Teste de conexão
app.get('/api/test', async (req, res) => {
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
});

// Rota temporária para verificar dados das tabelas
app.get('/api/debug/tables', async (req, res) => {
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
});

// Endpoint para atualizar estrutura do banco para BLOB
app.post('/api/update-db-structure', async (req, res) => {
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
});

// Criar nova inscrição
app.post('/api/inscricoes', async (req, res) => {
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
});

// Buscar inscrições com filtros
app.get('/api/inscricoes', async (req, res) => {
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
});

// Buscar inscrição por ID
app.get('/api/inscricoes/:id', async (req, res) => {
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
});

// Rota para executar migração do campo comunhao
app.post('/api/fix-comunhao', async (req, res) => {
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
});

// Rota para verificar se a tabela existe
app.get('/api/check-table', async (req, res) => {
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
});

// ===== ENDPOINTS PARA EDIÇÃO E EXCLUSÃO =====

// Rota para atualizar uma inscrição específica (PUT)
app.put('/api/inscricoes/:id', async (req, res) => {
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
});

// Rota para excluir uma inscrição específica (DELETE)
app.delete('/api/inscricoes/:id', async (req, res) => {
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
});

// ===== ENDPOINT PARA UPLOAD DE ARQUIVOS =====

// Endpoint para upload de arquivos com dados da inscrição (salvando como BLOB)
app.post('/api/inscricoes-com-arquivos', upload.fields([
  { name: 'documentoIdentidade', maxCount: 1 },
  { name: 'certidaoBatismo', maxCount: 1 }
]), async (req, res) => {
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
      // Remover arquivo temporário
      //fs.unlinkSync(file.path);
    }

    if (req.files['certidaoBatismo']) {
      const file = req.files['certidaoBatismo'][0];
      certidaoBatismoData = file.buffer;
      certBatNome = file.originalname;
      certBatTipo = file.mimetype;
      certBatTamanho = file.size;
      // Remover arquivo temporário
      //fs.unlinkSync(file.path);
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
});

// ===== ENDPOINT PARA DOWNLOAD DE ARQUIVOS DO BANCO =====

// Endpoint para baixar documento de identidade
app.get('/api/arquivo/documento-identidade/:id', async (req, res) => {
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
});

// Endpoint para salvar status de controle
app.post('/api/inscricoes/:id/status', async (req, res) => {
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
});

// Endpoint para buscar histórico de status
app.get('/api/inscricoes/:id/status/historico', async (req, res) => {
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
});

// Endpoint para buscar status de controle
app.get('/api/inscricoes/:id/status', async (req, res) => {
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
});

// Endpoint para baixar certidão de batismo
app.get('/api/arquivo/certidao-batismo/:id', async (req, res) => {
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
       ARRAY['usuarios.criar', 'usuarios.listar', 'usuarios.editar', 'usuarios.deletar', 
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

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
  console.log(`🔗 Teste: http://localhost:${PORT}/api/test`);
  console.log(`📋 Verificar tabela: http://localhost:${PORT}/api/check-table`);
  console.log(`📎 Upload de arquivos: ${uploadDir}`);
  
  // Atualizar estrutura do banco automaticamente
  await atualizarEstruturaBanco();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  await pool.end();
  process.exit(0);
});