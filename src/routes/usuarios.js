const express = require('express');
const router = express.Router();
const {
  criarUsuario,
  listarUsuarios,
  obterUsuario,
  atualizarUsuario,
  deletarUsuario
} = require('../controllers/usuariosController');
const { authenticateToken } = require('../middleware/auth');

// Criar usuário (público - sem autenticação)
router.post('/', criarUsuario);

// Listar usuários (autenticado)
router.get('/', authenticateToken, listarUsuarios);

// Obter usuário por ID (autenticado)
router.get('/:id', authenticateToken, obterUsuario);

// Atualizar usuário (autenticado)
router.put('/:id', authenticateToken, atualizarUsuario);

// Deletar usuário (autenticado)
router.delete('/:id', authenticateToken, deletarUsuario);

module.exports = router;