# Estrutura do Projeto - Backend Refatorado

## 📁 Nova Organização de Arquivos

O backend foi completamente refatorado para uma estrutura modular e organizada:

```
projeto-cadastro/
├── backend-server.js           # Arquivo principal do servidor
├── package.json               # Dependências e scripts
├── .env                       # Variáveis de ambiente
├── uploads/                   # Arquivos estáticos (uploads)
├── database/                  # Scripts SQL do banco
└── src/                       # Código fonte organizado
    ├── config/               # Configurações
    │   ├── database.js       # Configuração do PostgreSQL
    │   └── upload.js         # Configuração do Multer
    ├── controllers/          # Lógica de negócio
    │   ├── authController.js
    │   ├── inscricoesController.js
    │   ├── statusController.js
    │   ├── usuariosController.js
    │   └── utilsController.js
    ├── middleware/           # Middlewares
    │   └── auth.js          # Autenticação JWT
    ├── routes/              # Definição de rotas
    │   ├── auth.js
    │   ├── inscricoes.js
    │   ├── usuarios.js
    │   └── utils.js
    └── utils/               # Utilitários
        └── helpers.js       # Funções auxiliares
```

## 🔧 Arquivos Principais

### `backend-server.js`
- **Função**: Arquivo principal do servidor
- **Responsabilidade**: Inicialização do Express, configuração de middlewares e rotas
- **Tamanho**: Reduzido de ~1658 linhas para ~45 linhas

### `src/config/`
- **`database.js`**: Configuração do pool de conexões PostgreSQL e funções de atualização do banco
- **`upload.js`**: Configuração do Multer para upload de arquivos

### `src/controllers/`
- **`authController.js`**: Login e verificação de token
- **`inscricoesController.js`**: CRUD de inscrições e upload de arquivos
- **`statusController.js`**: Controle de status das inscrições
- **`usuariosController.js`**: CRUD de usuários
- **`utilsController.js`**: Utilitários do sistema (testes, debug, migrações)

### `src/middleware/`
- **`auth.js`**: Middleware de autenticação JWT e funções auxiliares

### `src/routes/`
- **`auth.js`**: Rotas de autenticação
- **`inscricoes.js`**: Rotas de inscrições e status
- **`usuarios.js`**: Rotas de usuários
- **`utils.js`**: Rotas utilitárias

### `src/utils/`
- **`helpers.js`**: Funções auxiliares (conversão de dados, formatação, etc.)

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📋 Principais Melhorias

### ✅ Organização
- **Separação de responsabilidades**: Cada arquivo tem uma função específica
- **Modularização**: Código dividido em módulos reutilizáveis
- **Estrutura padrão**: Segue padrões da comunidade Node.js

### ✅ Manutenibilidade
- **Código mais limpo**: Arquivos menores e focados
- **Fácil localização**: Estrutura intuitiva para encontrar funcionalidades
- **Facilita testes**: Cada módulo pode ser testado independentemente

### ✅ Escalabilidade
- **Adição de funcionalidades**: Novos controllers/rotas podem ser adicionados facilmente
- **Reutilização**: Middlewares e utilitários podem ser reutilizados
- **Performance**: Melhor organização dos imports

## 🔄 Rotas da API

### Autenticação
- `POST /api/login` - Login do usuário
- `GET /api/verify-token` - Verificar token JWT

### Usuários
- `POST /api/usuarios` - Criar usuário
- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Obter usuário por ID
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Deletar usuário

### Inscrições
- `POST /api/inscricoes` - Criar inscrição
- `GET /api/inscricoes` - Buscar inscrições (com filtros)
- `GET /api/inscricoes/:id` - Obter inscrição por ID
- `PUT /api/inscricoes/:id` - Atualizar inscrição
- `DELETE /api/inscricoes/:id` - Deletar inscrição
- `POST /api/inscricoes/com-arquivos` - Criar inscrição com arquivos

### Status
- `POST /api/inscricoes/:id/status` - Atualizar status
- `GET /api/inscricoes/:id/status/historico` - Histórico de status
- `GET /api/inscricoes/:id/status` - Status atual

### Arquivos
- `GET /api/inscricoes/arquivo/documento-identidade/:id` - Download documento
- `GET /api/inscricoes/arquivo/certidao-batismo/:id` - Download certidão

### Utilitários
- `GET /api/test` - Teste de conexão
- `GET /api/check-table` - Verificar tabelas
- `GET /api/debug/tables` - Debug do banco
- `POST /api/update-db-structure` - Atualizar estrutura do banco
- `POST /api/fix-comunhao` - Corrigir campo comunhão

## 🛠️ Como Contribuir

### Adicionando nova funcionalidade:

1. **Controller**: Criar lógica em `src/controllers/`
2. **Rotas**: Definir endpoints em `src/routes/`
3. **Middleware**: Adicionar validações em `src/middleware/` se necessário
4. **Utilitários**: Criar funções auxiliares em `src/utils/` se necessário

### Exemplo - Adicionando funcionalidade de relatórios:

```javascript
// 1. src/controllers/relatoriosController.js
const gerarRelatorio = async (req, res) => {
  // Lógica do relatório
};

// 2. src/routes/relatorios.js
const router = express.Router();
router.get('/mensal', gerarRelatorio);

// 3. backend-server.js
const relatoriosRoutes = require('./src/routes/relatorios');
app.use('/api/relatorios', relatoriosRoutes);
```

## 🔒 Segurança

- **JWT**: Autenticação baseada em tokens
- **Bcrypt**: Hash de senhas
- **Middleware**: Proteção de rotas
- **Validação**: Entrada de dados validada
- **CORS**: Configurado para desenvolvimento

## 📊 Logs e Debug

- **Console logs**: Estruturados com emojis para fácil identificação
- **Erro handling**: Tratamento centralizado de erros
- **Debug routes**: Rotas específicas para debugging

## 🗄️ Banco de Dados

- **PostgreSQL**: Banco principal
- **Pool de conexões**: Configurado para performance
- **Migrations**: Automáticas na inicialização
- **BLOB storage**: Arquivos armazenados no banco

Esta estrutura modular facilita muito a manutenção e evolução do projeto!