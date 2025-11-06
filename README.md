# InscricaoCatequese Server

Backend API server para o sistema de inscrições de catequese.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Linguagem tipada
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação via tokens
- **bcryptjs** - Hash de senhas
- **Express Validator** - Validação de dados
- **CORS** - Controle de acesso
- **Helmet** - Segurança

## 📁 Estrutura do Projeto

```
src/
├── config/         # Configurações (banco de dados, etc.)
├── controllers/    # Controladores das rotas
├── middleware/     # Middlewares personalizados
├── models/         # Modelos do banco de dados
├── routes/         # Definição das rotas
├── utils/          # Funções utilitárias
└── server.ts       # Arquivo principal do servidor
```

## 🔧 Configuração

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd inscricaoCatequese-server
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/inscricaocatequese
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=your-super-secure-jwt-secret
   JWT_EXPIRE=30d
   ```

4. **Inicie o MongoDB**
   ```bash
   # Se usando Docker
   docker run -d -p 27017:27017 --name mongodb mongo
   
   # Ou inicie o serviço local
   mongod
   ```

## 🎯 Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o TypeScript
- `npm start` - Inicia o servidor compilado
- `npm test` - Executa os testes
- `npm run lint` - Verifica o código com ESLint
- `npm run lint:fix` - Corrige automaticamente problemas do ESLint

## 📊 API Endpoints

### Health Check
- `GET /health` - Verifica status do servidor

### Autenticação
- `POST /api/auth/login` - Login de usuário (a implementar)
- `POST /api/auth/register` - Registro de usuário (a implementar)

### Inscrições
- `POST /api/registrations` - Criar nova inscrição
- `GET /api/registrations` - Listar inscrições (com filtros)
- `GET /api/registrations/:id` - Buscar inscrição por ID
- `PUT /api/registrations/:id` - Atualizar inscrição
- `DELETE /api/registrations/:id` - Deletar inscrição
- `PATCH /api/registrations/:id/status` - Atualizar status da inscrição

### Exemplo de Payload - Inscrição

```json
{
  "nomeCompleto": "João Silva Santos",
  "dataNascimento": "2010-05-15",
  "endereco": {
    "rua": "Rua das Flores",
    "numero": "123",
    "complemento": "Apt 201",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "cep": "01234-567"
  },
  "telefone": "(11) 99999-9999",
  "email": "joao@email.com",
  "nomeResponsavel": "Maria Silva Santos",
  "telefoneResponsavel": "(11) 88888-8888",
  "serie": "1ª Série",
  "turma": "A",
  "anoLetivo": 2024,
  "observacoes": "Criança muito ativa e participativa"
}
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **CORS** - Controle de origem cruzada
- **bcryptjs** - Hash de senhas
- **JWT** - Tokens seguros
- **Express Validator** - Validação de entrada

## 🐛 Debug

Para debug no VS Code, use a configuração de launch já criada ou execute:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

## 📝 Desenvolvimento

1. **Desenvolvimento**: `npm run dev`
2. **Build**: `npm run build`  
3. **Produção**: `npm start`

## 🔄 Status da Inscrição

- `pendente` - Aguardando aprovação
- `aprovada` - Inscrição aprovada
- `rejeitada` - Inscrição rejeitada

## 📋 TODO

- [ ] Implementar autenticação completa
- [ ] Adicionar middleware de autorização
- [ ] Implementar upload de documentos
- [ ] Adicionar testes unitários
- [ ] Configurar CI/CD
- [ ] Documentação da API com Swagger

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.