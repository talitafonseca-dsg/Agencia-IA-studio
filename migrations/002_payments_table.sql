-- =============================================
-- MERCADO PAGO PAYMENTS - SUPABASE MIGRATION
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================

-- 1. TABELA DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mercadopago_payment_id TEXT UNIQUE,
  mercadopago_preference_id TEXT,
  payer_email TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('semestral', 'anual')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- approved, pending, rejected, cancelled
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_created BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_payments_email ON public.payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON public.payments(mercadopago_payment_id);

-- 3. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política: Service role pode tudo (para Edge Functions)
CREATE POLICY "Service role full access"
  ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Política: Usuários podem ver apenas seus próprios pagamentos
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. FUNÇÃO PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER PARA ATUALIZAR updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.payments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
