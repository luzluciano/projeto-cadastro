-- Script para criar a tabela de inscrições de Crisma
CREATE DATABASE crisma_db;

-- Conectar ao banco de dados crisma_db antes de executar os comandos abaixo

CREATE TABLE inscricoes_crisma (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Informações do Crismando
    email VARCHAR(255) NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    naturalidade VARCHAR(255) NOT NULL,
    sexo VARCHAR(20) NOT NULL CHECK (sexo IN ('Masculino', 'Feminino')),
    endereco TEXT NOT NULL,
    
    -- Informações Sacramentais
    batizado BOOLEAN DEFAULT FALSE,
    paroquia_batismo VARCHAR(255),
    diocese_batismo VARCHAR(255),
    comunhao BOOLEAN DEFAULT NULL,
    paroquia_comunhao VARCHAR(255),
    diocese_comunhao VARCHAR(255),
    
    -- Documentos (armazenaremos os caminhos dos arquivos)
    documento_identidade_path VARCHAR(500),
    certidao_batismo_path VARCHAR(500),
    
    -- Dados para Contato
    telefone_whatsapp VARCHAR(20) NOT NULL,
    email_contato VARCHAR(255) NOT NULL,
    
    -- Dados dos Pais
    nome_pai VARCHAR(255),
    estado_civil_pai VARCHAR(50),
    naturalidade_pai VARCHAR(255),
    nome_mae VARCHAR(255),
    estado_civil_mae VARCHAR(50),
    naturalidade_mae VARCHAR(255),
    pais_casados_igreja BOOLEAN,
    paroquia_casamento_pais VARCHAR(255),
    diocese_casamento_pais VARCHAR(255),
    
    -- Dados do Padrinho/Madrinha
    nome_padrinho_madrinha VARCHAR(255),
    padrinho_crismado BOOLEAN DEFAULT FALSE,
    documento_padrinho_path VARCHAR(500),
    
    -- Curso Preparatório
    data_inicio_curso DATE NOT NULL,
    comunidade_curso VARCHAR(255) NOT NULL,
    nome_catequista VARCHAR(255) NOT NULL,
    horario_curso VARCHAR(255) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX idx_inscricoes_email ON inscricoes_crisma(email);
CREATE INDEX idx_inscricoes_nome ON inscricoes_crisma(nome_completo);
CREATE INDEX idx_inscricoes_created_at ON inscricoes_crisma(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_inscricoes_updated_at 
    BEFORE UPDATE ON inscricoes_crisma 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();