-- Adicionar campo tipo_inscricao à tabela se ele não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'inscricoes_crisma' 
                  AND column_name = 'tipo_inscricao') THEN
        ALTER TABLE inscricoes_crisma
        ADD COLUMN tipo_inscricao VARCHAR(20) NOT NULL DEFAULT 'crisma'
        CHECK (tipo_inscricao IN ('catequese', 'catecumenato', 'crisma'));

        -- Criar índice para o novo campo
        CREATE INDEX IF NOT EXISTS idx_inscricoes_tipo ON inscricoes_crisma(tipo_inscricao);

        -- Comentário explicativo
        COMMENT ON COLUMN inscricoes_crisma.tipo_inscricao IS 'Tipo de inscrição: catequese, catecumenato ou crisma';
    END IF;
END $$;