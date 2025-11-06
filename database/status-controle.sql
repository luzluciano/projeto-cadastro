-- Criar tabela de status de controle
CREATE TABLE IF NOT EXISTS status_controle (
    id SERIAL PRIMARY KEY,
    inscricao_id INTEGER NOT NULL REFERENCES inscricoes_crisma(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Em Andamento', 'Desistência', 'Concluído')),
    observacao TEXT,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(inscricao_id)
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_status_inscricao ON status_controle(inscricao_id);

-- Comentário explicativo
COMMENT ON TABLE status_controle IS 'Tabela para controle de status das inscrições de crisma';
COMMENT ON COLUMN status_controle.status IS 'Status atual: Em Andamento, Desistência ou Concluído';
COMMENT ON COLUMN status_controle.data_atualizacao IS 'Data da última atualização do status';