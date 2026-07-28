-- Índices de performance — rode no SQL editor do Supabase.
-- A listagem do admin filtra/ordena por status, data e cliente; as abas de
-- visualizações e histórico buscam por proposal_id. Sem índice, cada consulta
-- faz full scan (fica lento conforme a base cresce).

CREATE INDEX IF NOT EXISTS idx_proposals_status            ON proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at        ON proposals (created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id         ON proposals (client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status_lastviewed ON proposals (status, last_viewed_at);

CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal_id  ON proposal_views (proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id ON proposal_events (proposal_id);
