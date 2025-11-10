const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

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

module.exports = {
  getUserPermissions,
  authenticateToken,
  isFirstUser,
  JWT_SECRET
};