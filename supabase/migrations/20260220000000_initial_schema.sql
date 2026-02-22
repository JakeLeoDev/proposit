-- =============================================================================
-- Initial Schema Baseline
-- Generated from production database on 2026-02-20
-- =============================================================================
--
-- NOTE: The embedding trigger functions use net.http_post to call an Edge
-- Function. For new deployments, configure these settings once via the
-- Supabase SQL editor:
--
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.supabase_anon_key = '<your-anon-key>';
--
-- =============================================================================


-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;


-- =============================================================================
-- Enum Types
-- =============================================================================

CREATE TYPE "Module types" AS ENUM (
  'qualifications_relation',
  'certificates_relation',
  'product_custom',
  'product_collection'
);

CREATE TYPE "Proposal Status Types" AS ENUM (
  'Draft',
  'Sent',
  'Read',
  'Accepted',
  'Rejected'
);


-- =============================================================================
-- Tables (in FK dependency order)
-- =============================================================================

CREATE TABLE public.organisations (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                     text        NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  street_and_number        text        NOT NULL,
  city                     text        NOT NULL,
  postal_code              text        NOT NULL,
  country                  text        NOT NULL,
  logo                     text        NOT NULL,
  footer                   text                 DEFAULT ''::text,
  proposal_number_template text,
  proposal_number_start    integer     NOT NULL DEFAULT 0,
  ai_feature               boolean     NOT NULL DEFAULT false,
  online_signature         boolean     NOT NULL DEFAULT false,
  ai_api_key               text,
  color                    text,
  ai_system_prompt         text,
  ai_api_key_hint          text,
  smtp_enabled             boolean     NOT NULL DEFAULT false,
  smtp_host                text,
  smtp_port                integer,
  smtp_user                text,
  smtp_pass                text,
  smtp_pass_hint           text,
  smtp_from                text,
  smtp_secure              boolean     NOT NULL DEFAULT false,
  CONSTRAINT organisations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id           uuid        NOT NULL,
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_name    text,
  first_name   text,
  CONSTRAINT users_pkey    PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE TABLE public.organisation_users (
  organisation_id uuid NOT NULL,
  user_id         uuid NOT NULL,
  role            text        DEFAULT 'member'::text,
  joined_at       timestamptz DEFAULT now(),
  CONSTRAINT organisation_users_pkey                PRIMARY KEY (organisation_id, user_id),
  CONSTRAINT organisation_users_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations (id) ON DELETE CASCADE,
  CONSTRAINT organisation_users_user_id_fkey         FOREIGN KEY (user_id)         REFERENCES public.users (id)         ON DELETE CASCADE
);

CREATE TABLE public.organisation_invitations (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL,
  email           text        NOT NULL,
  invited_by      uuid        NOT NULL,
  token           text        NOT NULL,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_invitations_pkey                         PRIMARY KEY (id),
  CONSTRAINT organisation_invitations_organisation_id_email_key    UNIQUE (organisation_id, email),
  CONSTRAINT organisation_invitations_token_key                    UNIQUE (token),
  CONSTRAINT organisation_invitations_organisation_id_fkey         FOREIGN KEY (organisation_id) REFERENCES public.organisations (id) ON DELETE CASCADE,
  CONSTRAINT organisation_invitations_invited_by_fkey              FOREIGN KEY (invited_by)      REFERENCES public.users (id)         ON DELETE CASCADE
);

CREATE TABLE public.categories (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL,
  name            text        NOT NULL,
  created_at      timestamptz          DEFAULT now(),
  description     text,
  CONSTRAINT categories_pkey                  PRIMARY KEY (id),
  CONSTRAINT categories_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id) ON DELETE CASCADE
);

CREATE TABLE public.companies (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  description         text                 DEFAULT ''::text,
  legal_name          text        NOT NULL,
  legal_form          text                 DEFAULT 'N/A'::text,
  industry            text                 DEFAULT 'Other'::text,
  email               text,
  number              text,
  website             text,
  fax                 text,
  tax_number          text,
  vat_id              text,
  commercial_register text,
  ceo                 text,
  organisation_id     uuid        NOT NULL,
  created_at          timestamptz          DEFAULT now(),
  street_and_number   text                 DEFAULT ''::text,
  city                text                 DEFAULT ''::text,
  postal_code         text                 DEFAULT ''::text,
  country             text                 DEFAULT ''::text,
  CONSTRAINT companies_pkey                  PRIMARY KEY (id),
  CONSTRAINT companies_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.persons (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  first_name      text        NOT NULL,
  last_name       text        NOT NULL,
  position        text,
  email           text,
  number          text,
  mobile_number   text,
  organisation_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  company_id      uuid        NOT NULL,
  title           text,
  CONSTRAINT persons_pkey                  PRIMARY KEY (id),
  CONSTRAINT persons_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id),
  CONSTRAINT persons_company_id_fkey       FOREIGN KEY (company_id)      REFERENCES public.companies (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.qualifications (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text        NOT NULL,
  content         jsonb       NOT NULL,
  category        uuid        NOT NULL,
  organisation_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qualifications_pkey                  PRIMARY KEY (id),
  CONSTRAINT qualifications_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id),
  CONSTRAINT qualifications_category_fkey         FOREIGN KEY (category)        REFERENCES public.categories (id)
);

CREATE TABLE public.certificates (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text        NOT NULL,
  content         jsonb       NOT NULL,
  category        uuid        NOT NULL,
  organisation_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_pkey          PRIMARY KEY (id),
  CONSTRAINT certificates_category_fkey FOREIGN KEY (category) REFERENCES public.categories (id)
);

CREATE TABLE public.attachments (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text        NOT NULL,
  content         jsonb       NOT NULL,
  organisation_id uuid        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_pkey                  PRIMARY KEY (id),
  CONSTRAINT attachments_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.proposals (
  id              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  name            text                     NOT NULL,
  internal_name   text,
  content         json                     NOT NULL,
  attachment      uuid,
  expiry_date     date                     NOT NULL,
  status          "Proposal Status Types"  NOT NULL,
  proposal_number text,
  organisation_id uuid                     NOT NULL,
  created_at      timestamptz              NOT NULL DEFAULT now(),
  company         uuid                     NOT NULL,
  qualification   uuid,
  certificate     uuid,
  recipient       uuid                     NOT NULL,
  preparator      uuid,
  CONSTRAINT proposals_pkey                 PRIMARY KEY (id),
  CONSTRAINT proposals_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations (id),
  CONSTRAINT proposals_company_fkey         FOREIGN KEY (company)         REFERENCES public.companies (id),
  CONSTRAINT proposals_qualification_fkey   FOREIGN KEY (qualification)   REFERENCES public.qualifications (id),
  CONSTRAINT proposals_certificate_fkey     FOREIGN KEY (certificate)     REFERENCES public.certificates (id),
  CONSTRAINT proposals_recipient_fkey       FOREIGN KEY (recipient)       REFERENCES public.persons (id),
  CONSTRAINT proposals_preparator_fkey      FOREIGN KEY (preparator)      REFERENCES public.users (id),
  CONSTRAINT proposals_attachment_fkey      FOREIGN KEY (attachment)      REFERENCES public.attachments (id)
);

CREATE TABLE public.product_collections_templates (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  iternal_name    text,
  internal_notes  text,
  name            text        NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  organisation_id uuid        NOT NULL,
  category        uuid        NOT NULL,
  show_prices     boolean     NOT NULL DEFAULT true,
  CONSTRAINT template_product_collections_pkey                        PRIMARY KEY (id),
  CONSTRAINT product_collections_templates_organisation_id_fkey       FOREIGN KEY (organisation_id) REFERENCES public.organisations (id),
  CONSTRAINT product_collections_templates_category_fkey              FOREIGN KEY (category)        REFERENCES public.categories (id)
);

CREATE TABLE public.product_items_templates (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  collection_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
  iternal_name    text,
  internal_notes  text,
  name            text        NOT NULL,
  description     text,
  unit_price      numeric     NOT NULL,
  unit_type       text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  organisation_id uuid        NOT NULL,
  position        numeric              DEFAULT 0,
  CONSTRAINT product_items_templates_pkey                PRIMARY KEY (id),
  CONSTRAINT product_items_templates_collection_id_fkey  FOREIGN KEY (collection_id)   REFERENCES public.product_collections_templates (id) ON DELETE CASCADE,
  CONSTRAINT product_items_templates_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.product_collections (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  proposal_id          uuid        NOT NULL,
  collection_reference uuid,
  name                 text        NOT NULL,
  description          text,
  organisation_id      uuid        NOT NULL,
  discount_type        text,
  discount             smallint,
  show_prices          boolean     NOT NULL DEFAULT true,
  CONSTRAINT product_collections_pkey                        PRIMARY KEY (id),
  CONSTRAINT product_collections_proposal_id_fkey            FOREIGN KEY (proposal_id)          REFERENCES public.proposals (id)                      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT product_collections_organisation_id_fkey        FOREIGN KEY (organisation_id)      REFERENCES public.organisations (id),
  CONSTRAINT product_collections_collection_reference_fkey   FOREIGN KEY (collection_reference) REFERENCES public.product_collections_templates (id)
);

CREATE TABLE public.product_items (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  product_collection_id uuid        NOT NULL,
  name                  text        NOT NULL,
  description           text,
  unit_price            numeric     NOT NULL,
  unit_type             text        NOT NULL,
  unit_amount           numeric     NOT NULL,
  organisation_id       uuid        NOT NULL,
  position              numeric              DEFAULT 0,
  CONSTRAINT product_items_pkey                        PRIMARY KEY (id),
  CONSTRAINT product_items_product_collection_id_fkey  FOREIGN KEY (product_collection_id) REFERENCES public.product_collections (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT product_items_organisation_id_fkey        FOREIGN KEY (organisation_id)       REFERENCES public.organisations (id)
);

CREATE TABLE public.links (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  proposal_id     uuid        NOT NULL,
  token           text        NOT NULL,
  exp_date        date        NOT NULL,
  organisation_id uuid        NOT NULL,
  CONSTRAINT links_pkey                 PRIMARY KEY (id),
  CONSTRAINT links_proposal_id_fkey     FOREIGN KEY (proposal_id)     REFERENCES public.proposals (id),
  CONSTRAINT links_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.embeddings (
  id              uuid      NOT NULL DEFAULT gen_random_uuid(),
  organisation_id uuid      NOT NULL,
  source_id       uuid      NOT NULL,
  source_table    text      NOT NULL,
  chunk_index     integer            DEFAULT 0,
  content_chunk   text      NOT NULL,
  embedding       vector,
  created_at      timestamp          DEFAULT now(),
  CONSTRAINT embeddings_pkey                  PRIMARY KEY (id),
  CONSTRAINT embeddings_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.proposal_images (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  proposal_id     uuid        NOT NULL,
  organisation_id uuid        NOT NULL,
  storage_path    text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_images_pkey                            PRIMARY KEY (id),
  CONSTRAINT proposal_images_proposal_id_storage_path_key    UNIQUE (proposal_id, storage_path),
  CONSTRAINT proposal_images_proposal_id_fkey                FOREIGN KEY (proposal_id)     REFERENCES public.proposals (id)      ON DELETE CASCADE,
  CONSTRAINT proposal_images_organisation_id_fkey            FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)
);

CREATE TABLE public.proposal_versions (
  id               uuid                    NOT NULL DEFAULT gen_random_uuid(),
  proposal_id      uuid                    NOT NULL,
  version_number   integer                 NOT NULL,
  name             text                    NOT NULL,
  internal_name    text,
  content          json                    NOT NULL,
  attachment       uuid,
  expiry_date      date                    NOT NULL,
  status           "Proposal Status Types" NOT NULL,
  proposal_number  text,
  organisation_id  uuid                    NOT NULL,
  company          uuid                    NOT NULL,
  qualification    uuid,
  certificate      uuid,
  recipient        uuid                    NOT NULL,
  preparator       uuid,
  online_signature boolean                          DEFAULT false,
  created_at       timestamptz             NOT NULL DEFAULT now(),
  CONSTRAINT proposal_versions_pkey                  PRIMARY KEY (id),
  CONSTRAINT proposal_versions_proposal_id_fkey      FOREIGN KEY (proposal_id)     REFERENCES public.proposals (id)      ON DELETE CASCADE,
  CONSTRAINT proposal_versions_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id)  ON DELETE CASCADE,
  CONSTRAINT proposal_versions_company_fkey          FOREIGN KEY (company)         REFERENCES public.companies (id),
  CONSTRAINT proposal_versions_qualification_fkey    FOREIGN KEY (qualification)   REFERENCES public.qualifications (id),
  CONSTRAINT proposal_versions_certificate_fkey      FOREIGN KEY (certificate)     REFERENCES public.certificates (id),
  CONSTRAINT proposal_versions_recipient_fkey        FOREIGN KEY (recipient)       REFERENCES public.persons (id),
  CONSTRAINT proposal_versions_preparator_fkey       FOREIGN KEY (preparator)      REFERENCES public.users (id),
  CONSTRAINT proposal_versions_attachment_fkey       FOREIGN KEY (attachment)      REFERENCES public.attachments (id)
);

CREATE TABLE public.api_tokens (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,
  organisation_id uuid        NOT NULL,
  name            text        NOT NULL,
  token_hash      text        NOT NULL,
  token_prefix    text        NOT NULL,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_tokens_pkey                  PRIMARY KEY (id),
  CONSTRAINT api_tokens_user_id_fkey          FOREIGN KEY (user_id)         REFERENCES public.users (id)         ON DELETE CASCADE,
  CONSTRAINT api_tokens_organisation_id_fkey  FOREIGN KEY (organisation_id) REFERENCES public.organisations (id) ON DELETE CASCADE
);

CREATE TABLE public.user_prompt_templates (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  name       text        NOT NULL,
  text       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_prompt_templates_pkey          PRIMARY KEY (id),
  CONSTRAINT user_prompt_templates_user_id_fkey  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);


-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_api_tokens_token_hash                          ON public.api_tokens        USING btree (token_hash);
CREATE INDEX idx_api_tokens_user_id                             ON public.api_tokens        USING btree (user_id);
CREATE INDEX categories_organisation_id_idx                     ON public.categories        USING btree (organisation_id);
CREATE INDEX idx_proposal_images_proposal_id                    ON public.proposal_images   USING btree (proposal_id);
CREATE INDEX idx_proposal_versions_created_at                   ON public.proposal_versions USING btree (created_at DESC);
CREATE INDEX idx_proposal_versions_organisation_id              ON public.proposal_versions USING btree (organisation_id);
CREATE INDEX idx_proposal_versions_proposal_id                  ON public.proposal_versions USING btree (proposal_id);
CREATE INDEX idx_proposal_versions_proposal_id_version_number   ON public.proposal_versions USING btree (proposal_id, version_number);
CREATE INDEX idx_user_prompt_templates_user_id                  ON public.user_prompt_templates USING btree (user_id);


-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.api_tokens                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_items_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_images             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompt_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                       ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- Functions
-- =============================================================================

-- Returns all organisation IDs for the authenticated user.
-- Used in RLS policies across all tables.
CREATE OR REPLACE FUNCTION public.user_organisations()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE SECURITY DEFINER
AS $$
  SELECT organisation_id
  FROM public.organisation_users
  WHERE user_id = auth.uid();
$$;

-- Creates a public.users row when a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Deletes embeddings for a deleted row (generic, uses TG_TABLE_NAME).
CREATE OR REPLACE FUNCTION public.trigger_delete_embed_generic()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.embeddings
  WHERE source_id = OLD.id AND source_table = TG_TABLE_NAME;
  RETURN OLD;
END;
$$;

-- Deletes embeddings for a deleted category.
CREATE OR REPLACE FUNCTION public.delete_category_embeddings()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.embeddings WHERE source_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Triggers an embedding via the embed-content Edge Function (INSERT).
-- Reads the Supabase URL and anon key from database settings.
CREATE OR REPLACE FUNCTION public.trigger_embed_generic()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  table_column_map JSONB := jsonb_build_object(
    'categories',     jsonb_build_array('name', 'description'),
    'qualifications', jsonb_build_array('name', 'description', 'content'),
    'certificates',   jsonb_build_array('name', 'description', 'content'),
    'companies',      jsonb_build_array('name', 'description', 'legal_name', 'legal_form', 'industry', 'email')
  );
  columns        JSONB;
  col            TEXT;
  val            TEXT;
  combined_content TEXT := '';
BEGIN
  columns := table_column_map -> TG_TABLE_NAME;

  IF columns IS NULL THEN
    RAISE NOTICE 'No embedding configuration found for table %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  FOR col IN SELECT jsonb_array_elements_text(columns) LOOP
    EXECUTE format('SELECT ($1).%I::text', col) INTO val USING NEW;
    IF val IS NOT NULL AND length(trim(val)) > 0 THEN
      combined_content := combined_content || val || E'\n\n';
    END IF;
  END LOOP;

  combined_content := trim(trailing E'\n\n' FROM combined_content);

  PERFORM net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/embed-content',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'source_id',      NEW.id,
      'source_table',   TG_TABLE_NAME,
      'organisation_id', NEW.organisation_id,
      'content',        combined_content
    )
  );
  RETURN NEW;
END;
$$;

-- Triggers an embedding update via the embed-content Edge Function (UPDATE).
CREATE OR REPLACE FUNCTION public.trigger_update_embed_generic()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  table_column_map JSONB := jsonb_build_object(
    'categories',     jsonb_build_array('name', 'description'),
    'qualifications', jsonb_build_array('name', 'description', 'content'),
    'certificates',   jsonb_build_array('name', 'description', 'content'),
    'companies',      jsonb_build_array('name', 'description', 'legal_name', 'legal_form', 'industry', 'email')
  );
  columns        JSONB;
  col            TEXT;
  val            TEXT;
  combined_content TEXT := '';
BEGIN
  DELETE FROM public.embeddings
  WHERE source_id = NEW.id AND source_table = TG_TABLE_NAME;

  columns := table_column_map -> TG_TABLE_NAME;

  IF columns IS NULL THEN
    RAISE NOTICE 'No embedding configuration found for table %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  FOR col IN SELECT jsonb_array_elements_text(columns) LOOP
    EXECUTE format('SELECT ($1).%I::text', col) INTO val USING NEW;
    IF val IS NOT NULL AND length(trim(val)) > 0 THEN
      combined_content := combined_content || val || E'\n\n';
    END IF;
  END LOOP;

  combined_content := trim(trailing E'\n\n' FROM combined_content);

  PERFORM net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/embed-content',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'source_id',       NEW.id,
      'source_table',    TG_TABLE_NAME,
      'organisation_id', NEW.organisation_id,
      'content',         combined_content
    )
  );
  RETURN NEW;
END;
$$;

-- Category-specific embed trigger (INSERT).
CREATE OR REPLACE FUNCTION public.trigger_embed_category()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/embed-content',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'source_id',       NEW.id,
      'source_table',    'categories',
      'organisation_id', NEW.organisation_id,
      'content',         NEW.name
    )
  );
  RETURN NEW;
END;
$$;

-- Category-specific embed trigger (UPDATE).
CREATE OR REPLACE FUNCTION public.trigger_update_embed_category()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.embeddings
  WHERE source_id = NEW.id AND source_table = 'categories';

  PERFORM net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/embed-content',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'source_id',       NEW.id,
      'source_table',    'categories',
      'organisation_id', NEW.organisation_id,
      'content',         NEW.name
    )
  );
  RETURN NEW;
END;
$$;

-- Semantic vector search across embeddings.
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding  vector,
  target_table     text,
  target_org_id    uuid,
  top_k            integer DEFAULT 5
)
  RETURNS TABLE (
    source_id     uuid,
    source_table  text,
    chunk_index   integer,
    content_chunk text,
    distance      double precision,
    similarity    double precision
  )
  LANGUAGE sql
AS $$
  SELECT
    e.source_id,
    e.source_table,
    e.chunk_index,
    e.content_chunk,
    e.embedding <=> query_embedding AS distance,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE
    e.organisation_id = target_org_id
    AND (target_table = 'all' OR e.source_table = target_table)
  ORDER BY e.embedding <=> query_embedding
  LIMIT top_k;
$$;

-- Advanced semantic search with category and proposal filtering.
CREATE OR REPLACE FUNCTION public.advanced_search_embeddings(
  query_embedding      vector,
  target_table         text,
  target_org_id        uuid,
  top_k                integer          DEFAULT 10,
  similarity_threshold double precision DEFAULT 0.7,
  category_filter      uuid             DEFAULT NULL::uuid,
  proposal_filter      uuid             DEFAULT NULL::uuid
)
  RETURNS TABLE (
    source_id     uuid,
    source_table  text,
    chunk_index   integer,
    content_chunk text,
    distance      double precision,
    similarity    double precision,
    category_id   uuid,
    category_name text,
    proposal_id   uuid,
    proposal_name text
  )
  LANGUAGE sql
AS $$
  SELECT
    e.source_id,
    e.source_table,
    e.chunk_index,
    e.content_chunk,
    e.embedding <=> query_embedding AS distance,
    1 - (e.embedding <=> query_embedding) AS similarity,
    CASE
      WHEN e.source_table = 'categories'    THEN cat.id
      WHEN e.source_table = 'qualifications' THEN q.category
      WHEN e.source_table = 'certificates'  THEN cert.category
      ELSE NULL
    END AS category_id,
    CASE
      WHEN e.source_table = 'categories'    THEN cat.name
      WHEN e.source_table = 'qualifications' THEN qcat.name
      WHEN e.source_table = 'certificates'  THEN certcat.name
      ELSE NULL
    END AS category_name,
    NULL::uuid AS proposal_id,
    NULL::text AS proposal_name
  FROM public.embeddings e
  LEFT JOIN public.categories   cat      ON (e.source_table = 'categories'    AND e.source_id = cat.id)
  LEFT JOIN public.qualifications q       ON (e.source_table = 'qualifications' AND e.source_id = q.id)
  LEFT JOIN public.certificates  cert     ON (e.source_table = 'certificates'  AND e.source_id = cert.id)
  LEFT JOIN public.categories    qcat     ON (e.source_table = 'qualifications' AND q.category = qcat.id)
  LEFT JOIN public.categories    certcat  ON (e.source_table = 'certificates'  AND cert.category = certcat.id)
  WHERE
    e.organisation_id = target_org_id
    AND (target_table = 'all' OR e.source_table = target_table)
    AND (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
    AND (
      category_filter IS NULL
      OR (e.source_table = 'categories'    AND cat.id = category_filter)
      OR (e.source_table = 'qualifications' AND q.category = category_filter)
      OR (e.source_table = 'certificates'  AND cert.category = category_filter)
    )
  ORDER BY e.embedding <=> query_embedding
  LIMIT top_k;
$$;


-- =============================================================================
-- Triggers
-- =============================================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- RLS Policies
-- =============================================================================

-- api_tokens
CREATE POLICY "Users can view own tokens"   ON public.api_tokens FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tokens" ON public.api_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own tokens" ON public.api_tokens FOR DELETE USING (user_id = auth.uid());

-- attachments
CREATE POLICY "Users can view attachments in their organisations"   ON public.attachments FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert attachments in their organisations" ON public.attachments FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update attachments in their organisations" ON public.attachments FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete attachments in their organisations" ON public.attachments FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- categories
CREATE POLICY "Users can view categories in their organisations"   ON public.categories FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert categories in their organisations" ON public.categories FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update categories in their organisations" ON public.categories FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete categories in their organisations" ON public.categories FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- certificates
CREATE POLICY "Users can view certificates in their organisations"   ON public.certificates FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert certificates in their organisations" ON public.certificates FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update certificates in their organisations" ON public.certificates FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete certificates in their organisations" ON public.certificates FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- companies
CREATE POLICY "Users can view companies in their organisations"   ON public.companies FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert companies in their organisations" ON public.companies FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update companies in their organisations" ON public.companies FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete companies in their organisations" ON public.companies FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- embeddings
CREATE POLICY "Users can view embeddings in their organisations"   ON public.embeddings FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert embeddings in their organisations" ON public.embeddings FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update embeddings in their organisations" ON public.embeddings FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete embeddings in their organisations" ON public.embeddings FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- links
CREATE POLICY "Users can view links in their organisations"   ON public.links FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert links in their organisations" ON public.links FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update links in their organisations" ON public.links FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete links in their organisations" ON public.links FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- organisation_invitations
CREATE POLICY "Allow public read invitations by token"             ON public.organisation_invitations FOR SELECT USING (accepted_at IS NULL AND expires_at > now());
CREATE POLICY "Authenticated users can view invitations by token"  ON public.organisation_invitations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view invitations for their organisations"  ON public.organisation_invitations FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can create invitations for their organisations" ON public.organisation_invitations FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update invitations for their organisations" ON public.organisation_invitations FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete invitations for their organisations" ON public.organisation_invitations FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- organisation_users
CREATE POLICY "Users can view members of their organisations"    ON public.organisation_users FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can add members to their organisations"     ON public.organisation_users FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update members of their organisations"  ON public.organisation_users FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can remove members from their organisations" ON public.organisation_users FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- organisations
CREATE POLICY "Users can view their own organisations"   ON public.organisations FOR SELECT USING (id IN (SELECT organisation_id FROM public.organisation_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert organisations"           ON public.organisations FOR INSERT WITH CHECK (id IN (SELECT user_organisations()));
CREATE POLICY "Users can update their own organisations" ON public.organisations FOR UPDATE USING (id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete their own organisations" ON public.organisations FOR DELETE USING (id IN (SELECT user_organisations()));

-- persons
CREATE POLICY "Users can view persons in their organisations"   ON public.persons FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert persons in their organisations" ON public.persons FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update persons in their organisations" ON public.persons FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete persons in their organisations" ON public.persons FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- product_collections
CREATE POLICY "Users can view product collections in their organisations"   ON public.product_collections FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert product collections in their organisations" ON public.product_collections FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update product collections in their organisations" ON public.product_collections FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete product collections in their organisations" ON public.product_collections FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- product_collections_templates
CREATE POLICY "Users can view product collection templates in their organisati"   ON public.product_collections_templates FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert product collection templates in their organisa"   ON public.product_collections_templates FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update product collection templates in their organisa"   ON public.product_collections_templates FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete product collection templates in their organisa"   ON public.product_collections_templates FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- product_items
CREATE POLICY "Users can view product items in their organisations"   ON public.product_items FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert product items in their organisations" ON public.product_items FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update product items in their organisations" ON public.product_items FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete product items in their organisations" ON public.product_items FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- product_items_templates
CREATE POLICY "Users can view product item templates in their organisations"   ON public.product_items_templates FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert product item templates in their organisations" ON public.product_items_templates FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update product item templates in their organisations" ON public.product_items_templates FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete product item templates in their organisations" ON public.product_items_templates FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- proposal_images
CREATE POLICY "Users can view proposal_images in their organisations"   ON public.proposal_images FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert proposal_images in their organisations" ON public.proposal_images FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update proposal_images in their organisations" ON public.proposal_images FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete proposal_images in their organisations" ON public.proposal_images FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- proposal_versions
CREATE POLICY "Users can view proposal versions in their organisation"   ON public.proposal_versions FOR SELECT USING (EXISTS (SELECT 1 FROM public.organisation_users WHERE organisation_id = proposal_versions.organisation_id AND user_id = auth.uid()));
CREATE POLICY "Users can create proposal versions in their organisation" ON public.proposal_versions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.organisation_users WHERE organisation_id = proposal_versions.organisation_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete proposal versions in their organisation" ON public.proposal_versions FOR DELETE USING (EXISTS (SELECT 1 FROM public.organisation_users WHERE organisation_id = proposal_versions.organisation_id AND user_id = auth.uid()));

-- proposals
CREATE POLICY "Users can view proposals in their organisations"   ON public.proposals FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert proposals in their organisations" ON public.proposals FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update proposals in their organisations" ON public.proposals FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete proposals in their organisations" ON public.proposals FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- qualifications
CREATE POLICY "Users can view qualifications in their organisations"   ON public.qualifications FOR SELECT USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can insert qualifications in their organisations" ON public.qualifications FOR INSERT WITH CHECK (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can update qualifications in their organisations" ON public.qualifications FOR UPDATE USING (organisation_id IN (SELECT user_organisations()));
CREATE POLICY "Users can delete qualifications in their organisations" ON public.qualifications FOR DELETE USING (organisation_id IN (SELECT user_organisations()));

-- user_prompt_templates
CREATE POLICY "Users can view their own prompt templates"   ON public.user_prompt_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own prompt templates" ON public.user_prompt_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prompt templates" ON public.user_prompt_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prompt templates" ON public.user_prompt_templates FOR DELETE USING (auth.uid() = user_id);

-- users
CREATE POLICY "Users can view profiles of org members" ON public.users FOR SELECT USING (id IN (SELECT organisation_users.user_id FROM public.organisation_users WHERE organisation_id IN (SELECT user_organisations())));
CREATE POLICY "Users can insert their own profile"     ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile"     ON public.users FOR UPDATE USING (id = auth.uid());
