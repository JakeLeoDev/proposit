create table public.allowed_registrations (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  note       text not null,
  created_at timestamptz not null default now()
);

create unique index allowed_registrations_email_lower_key
  on public.allowed_registrations (lower(email));

alter table public.allowed_registrations enable row level security;

comment on table public.allowed_registrations is
  'Allowlist for self-registration in multi-invite tenant mode. Populate manually via Supabase Studio.';
