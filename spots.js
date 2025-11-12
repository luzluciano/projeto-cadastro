const express = require('express');
const router = express.Router();
const spotsController = require('../controllers/spotsController');
const { authenticateToken } = require('../middleware/auth');

// === ROTAS PÚBLICAS ===

// GET /api/spots/publicos - Listar spots públicos (ativos e dentro da vigência)
router.get('/publicos', spotsController.listarSpotsPublicos);

// GET /api/spots/ativos - Listar spots ativos (mesma lógica que públicos)
router.get('/ativos', spotsController.listarSpotsAtivos);

// === ROTAS ADMIN (requerem autenticação e permissão de admin) ===

// GET /api/spots/admin - Listar todos os spots (admin)
router.get('/admin', 
  authenticateToken, 
  spotsController.listarSpotsAdmin
);

// GET /api/spots/admin/:id - Buscar spot por ID (admin)
router.get('/admin/:id', 
  authenticateToken, 
  spotsController.buscarSpotPorId
);

// POST /api/spots/admin - Criar novo spot
router.post('/admin', 
  authenticateToken, 
  spotsController.criarSpot
);

// PUT /api/spots/admin/:id - Atualizar spot
router.put('/admin/:id', 
  authenticateToken, 
  spotsController.atualizarSpot
);

// DELETE /api/spots/admin/:id - Excluir spot
router.delete('/admin/:id', 
  authenticateToken, 
  spotsController.excluirSpot
);

// PATCH /api/spots/admin/:id/status - Alternar status ativo/inativo
router.patch('/admin/:id/status', 
  authenticateToken, 
  spotsController.alternarStatusSpot
);

// POST /api/spots/admin/reordenar - Reordenar spots
router.post('/admin/reordenar', 
  authenticateToken, 
  spotsController.reordenarSpots
);

module.exports = router;