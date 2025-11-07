-- Script para corrigir o campo comunhao na tabela existente
-- Execute este script no PostgreSQL se a tabela já foi criada

-- Conectar ao banco crisma_db primeiro
\c crisma_db;

-- Remover a restrição atual do campo comunhao
ALTER TABLE inscricoes_crisma DROP CONSTRAINT IF EXISTS inscricoes_crisma_comunhao_check;

-- Alterar o tipo do campo para BOOLEAN
ALTER TABLE inscricoes_crisma ALTER COLUMN comunhao TYPE BOOLEAN USING 
  CASE 
    WHEN comunhao = 'Sim' THEN TRUE
    WHEN comunhao = 'Não' THEN FALSE
    ELSE NULL
  END;

-- Definir valor padrão como NULL
ALTER TABLE inscricoes_crisma ALTER COLUMN comunhao SET DEFAULT NULL;

-- Verificar a estrutura atualizada
\d inscricoes_crisma;