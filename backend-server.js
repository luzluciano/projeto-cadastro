require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { atualizarEstruturaBanco, pool } = require('./src/config/database');
const { uploadDir } = require('./src/config/upload');

// Rotas
const authRoutes = require('./src/routes/auth');
const usuariosRoutes = require('./src/routes/usuarios');
const inscricoesRoutes = require('./src/routes/inscricoes');
const utilsRoutes = require('./src/routes/utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(uploadDir));

// Configurar rotas da API
app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/inscricoes', inscricoesRoutes);
app.use('/api', utilsRoutes);

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