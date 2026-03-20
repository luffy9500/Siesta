-- Siesta – Schema Supabase
-- Esegui questo SQL nel SQL Editor di Supabase

-- Abilita RLS su tutte le tabelle

-- 1. Impostazioni utente
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  ore_giornaliere numeric(4,2) not null default 8,
  giorni_lavorativi integer[] not null default '{1,2,3,4,5}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Utente vede solo le proprie impostazioni"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Saldi da busta paga
create table public.saldi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  anno integer not null,
  mese integer not null check (mese between 1 and 12),
  tipo text not null check (tipo in ('ferie','permessi','rol','malattia')),
  ore numeric(6,2) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, anno, mese, tipo)
);

alter table public.saldi enable row level security;

create policy "Utente vede solo i propri saldi"
  on public.saldi for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Assenze
create table public.assenze (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null check (tipo in ('ferie','permessi','rol','malattia')),
  data_inizio date not null,
  data_fine date not null,
  ore numeric(6,2) not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint data_fine_gte_data_inizio check (data_fine >= data_inizio)
);

alter table public.assenze enable row level security;

create policy "Utente vede solo le proprie assenze"
  on public.assenze for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
