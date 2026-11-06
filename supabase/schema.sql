-- Ejecutar en Supabase → SQL Editor
create table if not exists public.personajes (
  id text primary key,
  propietario uuid not null references auth.users(id) on delete cascade default auth.uid(),
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
alter table public.personajes enable row level security;
create policy "ver los míos" on public.personajes for select using (auth.uid() = propietario);
create policy "crear los míos" on public.personajes for insert with check (auth.uid() = propietario);
create policy "editar los míos" on public.personajes for update using (auth.uid() = propietario);
create policy "borrar los míos" on public.personajes for delete using (auth.uid() = propietario);
