-- ============================================================
-- BASELINE: Initial schema for BeerBook
-- Captures the complete database state as of 2026-07-03.
-- Do NOT run this manually — it reflects the already-deployed DB.
-- ============================================================


-- ------------------------------------------------------------
-- FUNCTIONS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
      AND cmd.schema_name IN ('public')
      AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
      AND cmd.schema_name NOT LIKE 'pg_toast%'
      AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

-- Only postgres and service_role may call this function
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;


-- ------------------------------------------------------------
-- EVENT TRIGGERS
-- ------------------------------------------------------------

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  EXECUTE FUNCTION public.rls_auto_enable();


-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE public.beers_new (
  id             bigint  NOT NULL,
  nombre         text,
  pais           text,
  estilo         text,
  alcohol        numeric,
  comercializada text,
  foto_url       text,
  "región"       text,
  descripcion    text    DEFAULT 'Si'::text,
  beer_uuid      uuid    DEFAULT gen_random_uuid(),
  CONSTRAINT "beers new_pkey" PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  nombre     text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_beers (
  user_id        uuid                     NOT NULL,
  beer_id        bigint                   NOT NULL,
  times          integer                  NOT NULL,
  comment        text                     DEFAULT ''::text,
  commercialized boolean                  DEFAULT true,
  user_photo_url text,
  "XP"           bigint,
  "Rating"       numeric,
  created_at     timestamp with time zone DEFAULT now(),
  CONSTRAINT user_beers_pkey PRIMARY KEY (user_id, beer_id),
  CONSTRAINT user_beers_beer_id_fkey
    FOREIGN KEY (beer_id) REFERENCES public.beers_new (id) ON UPDATE CASCADE
);


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.beers_new  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_beers  ENABLE ROW LEVEL SECURITY;

-- beers_new
CREATE POLICY allow_anon_read ON public.beers_new
  FOR SELECT TO anon USING (true);

CREATE POLICY allow_authenticated_read ON public.beers_new
  FOR SELECT TO authenticated USING (true);

-- profiles
CREATE POLICY allow_read_own_profile ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY allow_insert_own_profile ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY allow_update_own_profile ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_beers
CREATE POLICY "Users can read their own beers" ON public.user_beers
  FOR SELECT TO public USING (user_id = auth.uid());

CREATE POLICY delete_own_beers ON public.user_beers
  FOR DELETE TO public USING (user_id = auth.uid());

CREATE POLICY insert_own_beers ON public.user_beers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY select_own_beers ON public.user_beers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY update_own_beers ON public.user_beers
  FOR UPDATE TO public USING (user_id = auth.uid());
