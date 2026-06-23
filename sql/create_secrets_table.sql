-- Crear la tabla de Secretos / Claves API
CREATE TABLE IF NOT EXISTS public."Secrets" (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public."Secrets" ENABLE ROW LEVEL SECURITY;

-- Politica para permitir lectura a administradores
CREATE POLICY "Permitir lectura a administradores" ON public."Secrets"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users."IDUser" = auth.uid()
            AND users."isAdmin" = true
        )
    );

-- Politica para permitir insercion a administradores
CREATE POLICY "Permitir insercion a administradores" ON public."Secrets"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users."IDUser" = auth.uid()
            AND users."isAdmin" = true
        )
    );

-- Politica para permitir actualizacion a administradores
CREATE POLICY "Permitir actualizacion a administradores" ON public."Secrets"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users."IDUser" = auth.uid()
            AND users."isAdmin" = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users."IDUser" = auth.uid()
            AND users."isAdmin" = true
        )
    );

-- Politica para permitir eliminacion a administradores
CREATE POLICY "Permitir eliminacion a administradores" ON public."Secrets"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users."IDUser" = auth.uid()
            AND users."isAdmin" = true
        )
    );
