-- Esquema SQL para criar as tabelas no Supabase
-- Você pode copiar e colar este script no SQL Editor do seu projeto Supabase.

-- 1. Tabela de Condôminos
CREATE TABLE IF NOT EXISTS public.condominos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(255) NOT NULL,
    nome_comercial VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj_cpf VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AGUARDANDO_ASSINATURA', -- AGUARDANDO_ASSINATURA, ATIVO_PENDENTE_PAGAMENTO, ATIVO_ADIMPLENTE, SUSPENSO_INADIMPLENCIA, BLOQUEADO_ASSIDUIDADE
    asaas_id VARCHAR(255),
    zapsign_doc_id VARCHAR(255),
    zapsign_sign_url VARCHAR(512),
    youtube_id VARCHAR(255),
    chave_pix VARCHAR(255),
    contrato_path VARCHAR(512),
    genero VARCHAR(50),
    estado_civil VARCHAR(50),
    cep VARCHAR(20),
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    uf VARCHAR(10),
    pais VARCHAR(100) DEFAULT 'Brasil',
    data_onboarding TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_condominos_cnpj_cpf ON public.condominos(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_condominos_email ON public.condominos(email);

-- 2. Tabela de Entregas de Vídeos
CREATE TABLE IF NOT EXISTS public.entregas_video (
    id BIGSERIAL PRIMARY KEY,
    condomino_id UUID NOT NULL REFERENCES public.condominos(id) ON DELETE CASCADE,
    semana_codigo VARCHAR(20) NOT NULL, -- Ex: "2026-W23"
    qtd_entregue INTEGER DEFAULT 0 NOT NULL,
    status_valido BOOLEAN DEFAULT TRUE NOT NULL
);

-- 3. Tabela de Fechamentos Financeiros
CREATE TABLE IF NOT EXISTS public.fechamentos_financeiros (
    id BIGSERIAL PRIMARY KEY,
    mes_referencia VARCHAR(7) NOT NULL, -- Ex: "2026-06"
    receita_bruta_adsense DOUBLE PRECISION NOT NULL,
    retencao_adm_30 DOUBLE PRECISION NOT NULL,
    fundo_partilha_70 DOUBLE PRECISION NOT NULL,
    valor_por_condomino DOUBLE PRECISION NOT NULL,
    qtd_condominos_ativos INTEGER NOT NULL,
    data_fechamento TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar acesso a todas as tabelas (você pode ajustar as políticas de RLS posteriormente)
ALTER TABLE public.condominos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Políticas temporárias de acesso completo para simplificação (recomenda-se ajustar em produção)
CREATE POLICY "Allow all public read" ON public.condominos FOR SELECT USING (true);
CREATE POLICY "Allow all public insert" ON public.condominos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public update" ON public.condominos FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON public.condominos FOR DELETE USING (true);

CREATE POLICY "Allow all public read" ON public.entregas_video FOR SELECT USING (true);
CREATE POLICY "Allow all public insert" ON public.entregas_video FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public update" ON public.entregas_video FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON public.entregas_video FOR DELETE USING (true);

CREATE POLICY "Allow all public read" ON public.fechamentos_financeiros FOR SELECT USING (true);
CREATE POLICY "Allow all public insert" ON public.fechamentos_financeiros FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all public update" ON public.fechamentos_financeiros FOR UPDATE USING (true);
CREATE POLICY "Allow all public delete" ON public.fechamentos_financeiros FOR DELETE USING (true);
