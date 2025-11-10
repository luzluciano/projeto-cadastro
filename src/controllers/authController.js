const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { getUserPermissions, JWT_SECRET } = require('../middleware/auth');

// Login
const login = async (req, res) => {
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
};

// Verificar token
const verifyToken = async (req, res) => {
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
};

module.exports = {
  login,
  verifyToken
};