const express = require('express');
const router = express.Router();
const spotsController = require('../controllers/spotsController');
const { verificarToken, verificarPermissao } = require('../middleware/auth');

// === ROTAS PÚBLICAS ===

// GET /api/spots/publicos - Listar spots públicos (ativos e dentro da vigência)
router.get('/publicos', spotsController.listarSpotsPublicos);

// GET /api/spots/ativos - Listar spots ativos (mesma lógica que públicos)
router.get('/ativos', spotsController.listarSpotsAtivos);

// === ROTAS ADMIN (requerem autenticação e permissão de admin) ===

// GET /api/spots/admin - Listar todos os spots (admin)
router.get('/admin', 
  verificarToken, 
  verificarPermissao(['spots.listar', 'sistema.configurar']), 
  spotsController.listarSpotsAdmin
);

// GET /api/spots/admin/:id - Buscar spot por ID (admin)
router.get('/admin/:id', 
  verificarToken, 
  verificarPermissao(['spots.listar', 'sistema.configurar']), 
  spotsController.buscarSpotPorId
);

// POST /api/spots/admin - Criar novo spot
router.post('/admin', 
  verificarToken, 
  verificarPermissao(['spots.criar', 'sistema.configurar']), 
  spotsController.criarSpot
);

// PUT /api/spots/admin/:id - Atualizar spot
router.put('/admin/:id', 
  verificarToken, 
  verificarPermissao(['spots.editar', 'sistema.configurar']), 
  spotsController.atualizarSpot
);

// DELETE /api/spots/admin/:id - Excluir spot
router.delete('/admin/:id', 
  verificarToken, 
  verificarPermissao(['spots.deletar', 'sistema.configurar']), 
  spotsController.excluirSpot
);

// PATCH /api/spots/admin/:id/status - Alternar status ativo/inativo
router.patch('/admin/:id/status', 
  verificarToken, 
  verificarPermissao(['spots.editar', 'sistema.configurar']), 
  spotsController.alternarStatusSpot
);

// POST /api/spots/admin/reordenar - Reordenar spots
router.post('/admin/reordenar', 
  verificarToken, 
  verificarPermissao(['spots.editar', 'sistema.configurar']), 
  spotsController.reordenarSpots
);

module.exports = router;