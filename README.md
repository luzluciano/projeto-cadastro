# Sistema de Inscrições para Catequese - Backend

Este é o servidor backend para o sistema de inscrições de catequese, desenvolvido em Node.js com Express e PostgreSQL.

## Funcionalidades

- API REST para gerenciamento de inscrições de catequese
- Upload de documentos (PDF, JPG, PNG)
- Integração com banco de dados PostgreSQL
- Controle de status das inscrições
- Gerenciamento de inscrições para diferentes tipos (Crisma, Primeira Comunhão, etc.)

## Tecnologias

- Node.js
- Express.js
- PostgreSQL
- Multer (upload de arquivos)
- CORS
- dotenv

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente no arquivo `.env`:
   ```
   DATABASE_URL=sua_string_de_conexao_postgresql
   PORT=3000
   ```

## Desenvolvimento

Para executar o servidor em modo de desenvolvimento:

```bash
npm run dev
```

Para executar em modo de produção:

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Estrutura do Banco de Dados

Os scripts SQL estão disponíveis na pasta `database/`:
- `schema.sql` - Estrutura principal das tabelas
- `add-tipo-inscricao.sql` - Configuração de tipos de inscrição
- `status-controle.sql` - Sistema de controle de status
- `status-historico.sql` - Histórico de mudanças de status

## API Endpoints

O servidor fornece endpoints para:
- Criação de inscrições
- Consulta de inscrições
- Upload de documentos
- Atualização de status
- Geração de relatórios

## Upload de Arquivos

Os arquivos enviados são armazenados na pasta `uploads/` e ficam acessíveis via `/uploads/nome_do_arquivo`.

## Contribuição

Para contribuir com o projeto, faça um fork e envie um pull request com suas alterações.
