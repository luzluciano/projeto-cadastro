-- Script para criar a tabela de usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Hash da senha será armazenado
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT true
);

-- Inserir usuário administrador padrão (senha: admin123)
-- Hash gerado para a senha 'admin123'
INSERT INTO usuarios (usuario, senha, nome) VALUES 
('admin', '$2b$10$zbTzMIFrqM.kgjfrDQqnFeHBTtu9fn6w/HM7wyWTQhB6bpMjVx5Iy', 'Administrador');

-- Criar índices para melhor performance
CREATE INDEX idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);