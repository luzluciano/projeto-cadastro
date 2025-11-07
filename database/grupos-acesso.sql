-- Script para criar sistema de grupos/perfis de acesso

-- Tabela de grupos/perfis
CREATE TABLE grupos_acesso (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    permissoes TEXT[], -- Array de strings com as permissões
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relacionamento usuário-grupo (um usuário pode ter múltiplos grupos)
CREATE TABLE usuario_grupos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, grupo_id)
);

-- Inserir grupos padrão
INSERT INTO grupos_acesso (nome, descricao, permissoes) VALUES 
('admin', 'Administrador do Sistema', 
 ARRAY['usuarios.criar', 'usuarios.listar', 'usuarios.editar', 'usuarios.deletar', 
       'inscricoes.criar', 'inscricoes.listar', 'inscricoes.editar', 'inscricoes.deletar',
       'grupos.criar', 'grupos.listar', 'grupos.editar', 'grupos.deletar',
       'sistema.configurar']),

('operador', 'Operador do Sistema', 
 ARRAY['inscricoes.criar', 'inscricoes.listar', 'inscricoes.editar', 
       'usuarios.listar']),

('consulta', 'Apenas Consulta', 
 ARRAY['inscricoes.listar', 'usuarios.listar']);

-- Associar usuário admin ao grupo admin
INSERT INTO usuario_grupos (usuario_id, grupo_id) 
SELECT u.id, g.id 
FROM usuarios u, grupos_acesso g 
WHERE u.usuario = 'admin' AND g.nome = 'admin';

-- Criar índices para melhor performance
CREATE INDEX idx_usuario_grupos_usuario ON usuario_grupos(usuario_id);
CREATE INDEX idx_usuario_grupos_grupo ON usuario_grupos(grupo_id);
CREATE INDEX idx_grupos_acesso_nome ON grupos_acesso(nome);
CREATE INDEX idx_grupos_acesso_ativo ON grupos_acesso(ativo);