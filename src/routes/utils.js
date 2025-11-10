const express = require('express');
const router = express.Router();
const {
  testeConexao,
  debugTabelas,
  atualizarEstruturaBlob,
  corrigirComunhao,
  verificarTabela
} = require('../controllers/utilsController');

// Teste de conexão
router.get('/test', testeConexao);

// Rota temporária para verificar dados das tabelas
router.get('/debug/tables', debugTabelas);

// Endpoint para atualizar estrutura do banco para BLOB
router.post('/update-db-structure', atualizarEstruturaBlob);

// Rota para executar migração do campo comunhao
router.post('/fix-comunhao', corrigirComunhao);

// Rota para verificar se a tabela existe
router.get('/check-table', verificarTabela);

module.exports = router;