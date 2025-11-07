-- Alterar a estrutura da tabela para armazenar arquivos como BLOB
-- Remover colunas de path e adicionar colunas BLOB

-- Remover colunas antigas de path se existirem
ALTER TABLE inscricoes_crisma 
DROP COLUMN IF EXISTS documento_identidade_path,
DROP COLUMN IF EXISTS certidao_batismo_path;

-- Adicionar colunas para armazenar arquivos como BLOB
ALTER TABLE inscricoes_crisma 
ADD COLUMN documento_identidade_data BYTEA,
ADD COLUMN documento_identidade_nome VARCHAR(255),
ADD COLUMN documento_identidade_tipo VARCHAR(100),
ADD COLUMN documento_identidade_tamanho INTEGER,
ADD COLUMN certidao_batismo_data BYTEA,
ADD COLUMN certidao_batismo_nome VARCHAR(255),
ADD COLUMN certidao_batismo_tipo VARCHAR(100),
ADD COLUMN certidao_batismo_tamanho INTEGER;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'inscricoes_crisma' 
AND column_name LIKE '%documento%' OR column_name LIKE '%certidao%'
ORDER BY column_name;