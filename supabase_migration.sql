-- =============================================
-- GALERIA DE PROJETOS - SUPABASE MIGRATION
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================

-- 1. TABELA DE PROJETOS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Projeto sem título',
  thumbnail_url TEXT,
  background_url TEXT NOT NULL,
  original_background_url TEXT, -- Imagem limpa sem textos
  aspect_ratio TEXT DEFAULT '3:4',
  config JSONB, -- Configurações do projeto (estilo, cores, etc)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CAMADAS (LAYERS)
CREATE TABLE IF NOT EXISTS public.project_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image')),
  content JSONB NOT NULL,
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_layers_project_id ON public.project_layers(project_id);

-- 4. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_layers ENABLE ROW LEVEL SECURITY;

-- Políticas para projects
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas para project_layers
CREATE POLICY "Users can view own project layers" 
  ON public.project_layers FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_layers.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project layers" 
  ON public.project_layers FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_layers.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project layers" 
  ON public.project_layers FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_layers.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project layers" 
  ON public.project_layers FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_layers.project_id 
      AND user_id = auth.uid()
    )
  );

-- 5. FUNÇÃO PARA CONTAR PROJETOS DO USUÁRIO
CREATE OR REPLACE FUNCTION public.get_user_project_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.projects WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA VERIFICAR LIMITE (50 projetos)
CREATE OR REPLACE FUNCTION public.check_project_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.projects WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'Limite de 50 projetos atingido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER PARA VERIFICAR LIMITE ANTES DE INSERIR
DROP TRIGGER IF EXISTS check_project_limit_trigger ON public.projects;
CREATE TRIGGER check_project_limit_trigger
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_limit();

-- 8. STORAGE BUCKET PARA IMAGENS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9. POLÍTICAS DE STORAGE
CREATE POLICY "Users can upload project images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'project-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view project images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'project-images');

CREATE POLICY "Users can delete own project images" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
