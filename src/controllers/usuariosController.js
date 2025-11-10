const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { getUserPermissions } = require('../middleware/auth');

// Criar usuário
const criarUsuario = async (req, res) => {
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
};

// Listar usuários
const listarUsuarios = async (req, res) => {
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
};

// Obter usuário por ID
const obterUsuario = async (req, res) => {
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
};

// Atualizar usuário
const atualizarUsuario = async (req, res) => {
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
};

// Deletar usuário
const deletarUsuario = async (req, res) => {
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
};

module.exports = {
  criarUsuario,
  listarUsuarios,
  obterUsuario,
  atualizarUsuario,
  deletarUsuario
};