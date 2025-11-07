-- Criar tabela de histórico de status
CREATE TABLE IF NOT EXISTS status_historico (
    id SERIAL PRIMARY KEY,
    inscricao_id INTEGER NOT NULL REFERENCES inscricoes_crisma(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Em Andamento', 'Desistência', 'Concluído')),
    observacao TEXT,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_status_historico_inscricao ON status_historico(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_status_historico_data ON status_historico(data_atualizacao);

-- Comentário explicativo
COMMENT ON TABLE status_historico IS 'Tabela para histórico de mudanças de status das inscrições';