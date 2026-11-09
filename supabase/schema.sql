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

-- ---------------------------------------------------------------- Partidas: el máster crea una sala con un código e invita a sus amigos
create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 1 and 60),
  codigo text not null unique,
  master uuid not null references auth.users(id) on delete cascade default auth.uid(),
  creada timestamptz not null default now()
);
alter table if exists public.partidas add column if not exists combate jsonb;
create table if not exists public.miembros (
  partida uuid not null references public.partidas(id) on delete cascade,
  usuario uuid not null references auth.users(id) on delete cascade default auth.uid(),
  personaje text references public.personajes(id) on delete set null,
  unido timestamptz not null default now(),
  primary key (partida, usuario)
);
alter table public.partidas enable row level security;
alter table public.miembros enable row level security;
grant select, insert, update, delete on public.partidas, public.miembros to authenticated;

-- Funciones auxiliares (security definer para no entrar en bucle con las políticas)
create or replace function public.es_master(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partidas where id = pid and master = auth.uid());
$$;
create or replace function public.es_miembro(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where partida = pid and usuario = auth.uid());
$$;
-- ¿Este personaje está en alguna partida mía? ('master' = soy su máster; 'ver' = jugamos juntos)
create or replace function public.personaje_en_mi_partida(pj text, solo_master boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros m join public.partidas p on p.id = m.partida
    where m.personaje = pj and (p.master = auth.uid() or (not solo_master and exists (
      select 1 from public.miembros yo where yo.partida = m.partida and yo.usuario = auth.uid()))));
$$;

drop policy if exists "ver mis partidas" on public.partidas;
drop policy if exists "crear partida" on public.partidas;
drop policy if exists "editar mi partida" on public.partidas;
drop policy if exists "borrar mi partida" on public.partidas;
create policy "ver mis partidas" on public.partidas for select to authenticated using (master = auth.uid() or public.es_miembro(id));
create policy "crear partida" on public.partidas for insert to authenticated with check (master = auth.uid());
create policy "editar mi partida" on public.partidas for update to authenticated using (master = auth.uid());
create policy "borrar mi partida" on public.partidas for delete to authenticated using (master = auth.uid());

drop policy if exists "ver miembros" on public.miembros;
drop policy if exists "entrar como máster" on public.miembros;
drop policy if exists "elegir mi personaje" on public.miembros;
drop policy if exists "salir o expulsar" on public.miembros;
create policy "ver miembros" on public.miembros for select to authenticated using (public.es_miembro(partida) or public.es_master(partida));
-- Los jugadores entran con la función unirse(); el máster se añade a sí mismo al crear la partida.
create policy "entrar como máster" on public.miembros for insert to authenticated with check (usuario = auth.uid() and public.es_master(partida));
create policy "elegir mi personaje" on public.miembros for update to authenticated
  using (usuario = auth.uid())
  with check (usuario = auth.uid() and (personaje is null or exists (select 1 from public.personajes where id = personaje and propietario = auth.uid())));
create policy "salir o expulsar" on public.miembros for delete to authenticated using (usuario = auth.uid() or public.es_master(partida));

-- Unirse con el código de invitación. Devuelve el id de la partida.
create or replace function public.unirse(cod text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  select id into pid from public.partidas where codigo = upper(trim(cod));
  if pid is null then raise exception 'codigo no encontrado'; end if;
  insert into public.miembros (partida, usuario) values (pid, auth.uid()) on conflict do nothing;
  return pid;
end $$;
grant execute on function public.unirse(text) to authenticated;

-- Personajes: los compañeros de partida pueden verlos; el máster también puede editarlos.
drop policy if exists "ver los de mi partida" on public.personajes;
drop policy if exists "máster edita" on public.personajes;
create policy "ver los de mi partida" on public.personajes for select to authenticated using (public.personaje_en_mi_partida(id, false));

-- El máster solo puede cambiar vida, estados, iniciativa e inventario de sus jugadores (no raza, clase, características…).
create or replace function public.master_guardar(pj text, cambios jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.personaje_en_mi_partida(pj, true) then raise exception 'no eres el máster de este personaje'; end if;
  update public.personajes
     set datos = datos || coalesce((select jsonb_object_agg(key, value) from jsonb_each(cambios)
                                    where key in ('pg','equipo','mochila','cinturon','viaje','monedas','estados','estadosDetalle','agotamiento','iniciativaActual','actualizado')), '{}'::jsonb),
         actualizado = now()
   where id = pj;
end $$;
grant execute on function public.master_guardar(text, jsonb) to authenticated;
