const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const {
  criarInscricao,
  buscarInscricoes,
  obterInscricao,
  atualizarInscricao,
  excluirInscricao,
  criarInscricaoComArquivos,
  downloadDocumentoIdentidade,
  downloadCertidaoBatismo
} = require('../controllers/inscricoesController');
const {
  salvarStatus,
  obterHistoricoStatus,
  obterStatus
} = require('../controllers/statusController');

// Criar nova inscrição
router.post('/', criarInscricao);

// Buscar inscrições com filtros
router.get('/', buscarInscricoes);

// Buscar inscrição por ID
router.get('/:id', obterInscricao);

// Atualizar inscrição
router.put('/:id', atualizarInscricao);

// Excluir inscrição
router.delete('/:id', excluirInscricao);

// Criar inscrição com arquivos
router.post('/com-arquivos', upload.fields([
  { name: 'documentoIdentidade', maxCount: 1 },
  { name: 'certidaoBatismo', maxCount: 1 }
]), criarInscricaoComArquivos);

// Status routes
router.post('/:id/status', salvarStatus);
router.get('/:id/status/historico', obterHistoricoStatus);
router.get('/:id/status', obterStatus);

// Download de arquivos
router.get('/arquivo/documento-identidade/:id', downloadDocumentoIdentidade);
router.get('/arquivo/certidao-batismo/:id', downloadCertidaoBatismo);

module.exports = router;