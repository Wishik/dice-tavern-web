-- Ejecutar en Supabase → SQL Editor
create table if not exists public.personajes (
  id text primary key,
  propietario uuid not null references auth.users(id) on delete cascade default auth.uid(),
  datos jsonb not null,
  actualizado timestamptz not null default now()
);
alter table public.personajes enable row level security;
grant select, insert, update, delete on public.personajes to authenticated;
drop policy if exists "ver los míos" on public.personajes;
drop policy if exists "crear los míos" on public.personajes;
drop policy if exists "editar los míos" on public.personajes;
drop policy if exists "borrar los míos" on public.personajes;
create policy "ver los míos" on public.personajes for select using (auth.uid() = propietario);
create policy "crear los míos" on public.personajes for insert with check (auth.uid() = propietario);
create policy "editar los míos" on public.personajes for update using (auth.uid() = propietario);
create policy "borrar los míos" on public.personajes for delete using (auth.uid() = propietario);

-- ---------------------------------------------------------------- Perfiles: alias único de cada jugador
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null check (char_length(trim(alias)) between 2 and 24)
);
create unique index if not exists perfiles_alias_unico on public.perfiles (lower(trim(alias)));
alter table public.perfiles enable row level security;
grant select, insert on public.perfiles to authenticated;
drop policy if exists "ver alias" on public.perfiles;
drop policy if exists "crear mi alias" on public.perfiles;
create policy "ver alias" on public.perfiles for select to authenticated using (true);
create policy "crear mi alias" on public.perfiles for insert to authenticated with check (auth.uid() = id);

-- ¿Está libre un alias? (se puede preguntar sin haber entrado, al registrarse)
create or replace function public.alias_libre(a text) returns boolean
language sql security definer set search_path = public as $$
  select not exists (select 1 from public.perfiles where lower(trim(alias)) = lower(trim(a)));
$$;
grant execute on function public.alias_libre(text) to anon, authenticated;

-- Al registrarse, el alias que viene en los datos del usuario se guarda en perfiles (si está repetido, falla el registro).
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new.raw_user_meta_data->>'alias'), '') <> '' then
    insert into public.perfiles (id, alias) values (new.id, trim(new.raw_user_meta_data->>'alias'));
  end if;
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil();
