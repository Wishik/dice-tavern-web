import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Personaje } from './types';
import { normalizar } from './personaje';
import { L } from './i18n';

export interface Usuario { id: string; email: string; alias: string }
export interface Resumen { id: string; nombre: string; raza: string; clase: string; nivel: number; foto: string; actualizado: string; bloqueado?: boolean }

export interface Backend {
  modo: 'local' | 'nube';
  usuario(): Promise<Usuario | null>;
  entrar(email: string, clave: string): Promise<void>;
  registrar(email: string, clave: string, alias: string): Promise<'ok' | 'confirmar'>;
  /** true si nadie usa ese alias (sin distinguir mayúsculas). */
  aliasLibre(alias: string): Promise<boolean>;
  ponerAlias(alias: string): Promise<void>;
  /** Envía el correo para cambiar la contraseña. */
  recuperar(email: string): Promise<void>;
  nuevaClave(clave: string): Promise<void>;
  salir(): Promise<void>;
  listar(): Promise<Resumen[]>;
  cargar(id: string): Promise<Personaje | null>;
  guardar(p: Personaje): Promise<void>;
  /** El máster guarda la hoja de un jugador: solo se copian vida, estados, iniciativa e inventario. */
  guardarMaster(p: Personaje): Promise<void>;
  borrar(id: string): Promise<void>;
}

const resumen = (p: Personaje): Resumen => ({ id: p.id, nombre: p.nombre, raza: p.raza, clase: p.clase, nivel: p.nivel, foto: p.foto, actualizado: p.actualizado, bloqueado: !!p.bloqueado });

/** Campos de la hoja que el máster puede cambiar (igual que la lista de la función master_guardar en schema.sql). */
export const CAMPOS_MASTER = ['pg', 'equipo', 'mochila', 'cinturon', 'viaje', 'monedas', 'estados', 'estadosDetalle', 'agotamiento', 'iniciativaActual', 'efectosCar', 'actualizado'] as const;

// ------------------------------------------------------------ Local (sin cuenta)
const CLAVE = 'dicetavern.personajes.v1';
function leerLocal(): Record<string, Personaje> {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; }
}
function escribirLocal(d: Record<string, Personaje>) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error(L('No se pudo guardar en este dispositivo (¿memoria llena?).', 'Не удалось сохранить на этом устройстве (память заполнена?).')); }
}
export const backendLocal: Backend = {
  modo: 'local',
  async usuario() { let alias = ''; try { alias = localStorage.getItem('dicetavern.alias') ?? ''; } catch { /* nada */ } return { id: 'local', email: L('Este dispositivo', 'Это устройство'), alias }; },
  async entrar() {}, async registrar() { return 'ok'; }, async salir() {},
  async aliasLibre() { return true; }, async ponerAlias(a) { try { localStorage.setItem('dicetavern.alias', a); } catch { /* nada */ } },
  async recuperar() {}, async nuevaClave() {},
  async listar() { return Object.values(leerLocal()).map(resumen).sort((a, b) => b.actualizado.localeCompare(a.actualizado)); },
  async cargar(id) { const p = leerLocal()[id]; return p ? normalizar(p) : null; },
  async guardar(p) { const d = leerLocal(); d[p.id] = p; escribirLocal(d); },
  async borrar(id) { const d = leerLocal(); delete d[id]; escribirLocal(d); },
  async guardarMaster(p) { await this.guardar(p); },
};

// ------------------------------------------------------------ Supabase (con cuenta)
function backendNube(sb: SupabaseClient): Backend {
  return {
    modo: 'nube',
    // getSession lee la sesión guardada en el navegador (sin red); getUser podía quedarse colgado.
    async usuario() { const { data } = await sb.auth.getSession(); const u = data.session?.user; return u ? { id: u.id, email: u.email ?? '', alias: (u.user_metadata?.alias as string) ?? '' } : null; },
    async entrar(email, clave) { const { error } = await sb.auth.signInWithPassword({ email, password: clave }); if (error) throw new Error(traducir(error.message)); },
    async registrar(email, clave, alias) {
      if (!(await this.aliasLibre(alias))) throw new Error(L('Ese alias ya lo usa otro jugador. Elige otro.', 'Этот ник уже занят другим игроком. Выбери другой.'));
      const { data, error } = await sb.auth.signUp({ email, password: clave, options: { emailRedirectTo: location.origin, data: { alias: alias.trim() } } });
      if (error) throw new Error(traducir(error.message));
      return data.session ? 'ok' : 'confirmar';
    },
    async salir() { await sb.auth.signOut(); },
    async aliasLibre(alias) {
      const { data, error } = await sb.rpc('alias_libre', { a: alias.trim() });
      if (error) throw new Error(L('No se pudo comprobar el alias. ¿Has ejecutado el SQL de perfiles en Supabase?', 'Не удалось проверить ник. Выполнен ли SQL с профилями в Supabase?'));
      return !!data;
    },
    async ponerAlias(alias) {
      if (!(await this.aliasLibre(alias))) throw new Error(L('Ese alias ya lo usa otro jugador. Elige otro.', 'Этот ник уже занят другим игроком. Выбери другой.'));
      const { data: s } = await sb.auth.getSession();
      const { error } = await sb.from('perfiles').insert({ id: s.session?.user.id, alias: alias.trim() });
      if (error) throw new Error(/duplicate|unique/i.test(error.message) ? L('Ese alias ya lo usa otro jugador. Elige otro.', 'Этот ник уже занят другим игроком. Выбери другой.') : error.message);
      await sb.auth.updateUser({ data: { alias: alias.trim() } });
    },
    async recuperar(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
      if (error) throw new Error(traducir(error.message));
    },
    async nuevaClave(clave) { const { error } = await sb.auth.updateUser({ password: clave }); if (error) throw new Error(traducir(error.message)); },
    async listar() {
      // Solo los míos: con las partidas también se ven los personajes de los compañeros.
      const { data: s } = await sb.auth.getSession();
      const { data, error } = await sb.from('personajes').select('id, datos->nombre, datos->raza, datos->clase, datos->nivel, datos->foto, datos->bloqueado, actualizado').eq('propietario', s.session?.user.id ?? '').order('actualizado', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, nombre: (r.nombre as string) ?? '', raza: (r.raza as string) ?? '', clase: (r.clase as string) ?? '', nivel: (r.nivel as number) ?? 1, foto: (r.foto as string) ?? '', actualizado: r.actualizado as string, bloqueado: !!r.bloqueado }));
    },
    async cargar(id) {
      const { data, error } = await sb.from('personajes').select('datos').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? normalizar(data.datos as Personaje) : null;
    },
    async guardar(p) {
      // Primero se intenta actualizar (así el máster puede guardar el personaje de un jugador sin cambiar su dueño);
      // si no existía, se crea. propietario lo rellena la base de datos (default auth.uid()).
      const { data, error } = await sb.from('personajes').update({ datos: p, actualizado: p.actualizado }).eq('id', p.id).select('id');
      if (error) throw new Error(error.message);
      if (data && data.length) return;
      const r = await sb.from('personajes').insert({ id: p.id, datos: p, actualizado: p.actualizado });
      if (r.error) throw new Error(r.error.message);
    },
    async borrar(id) { const { error } = await sb.from('personajes').delete().eq('id', id); if (error) throw new Error(error.message); },
    async guardarMaster(p) {
      const cambios = Object.fromEntries(CAMPOS_MASTER.map((k) => [k, p[k]]));
      const { error } = await sb.rpc('master_guardar', { pj: p.id, cambios });
      if (error) throw new Error(error.message);
    },
  };
}

function traducir(m: string) {
  if (/invalid login/i.test(m)) return L('Correo o contraseña incorrectos.', 'Неверная почта или пароль.');
  if (/already registered/i.test(m)) return L('Ese correo ya tiene cuenta. Inicia sesión.', 'На эту почту уже есть аккаунт. Войди.');
  if (/password should be/i.test(m)) return L('La contraseña debe tener al menos 6 caracteres.', 'Пароль должен быть не короче 6 символов.');
  if (/email not confirmed/i.test(m)) return L('Confirma tu correo antes de entrar (revisa tu bandeja de entrada).', 'Сначала подтверди почту (проверь входящие).');
  if (/database error saving new user/i.test(m)) return L('Ese alias ya lo usa otro jugador. Elige otro.', 'Этот ник уже занят другим игроком. Выбери другой.');
  if (/same.*password|different from the old/i.test(m)) return L('La nueva contraseña debe ser distinta de la anterior.', 'Новый пароль должен отличаться от старого.');
  if (/rate limit|security purposes/i.test(m)) return L('Demasiados intentos. Espera un minuto y prueba otra vez.', 'Слишком много попыток. Подожди минуту и попробуй снова.');
  return m;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key) : null;
export const backend: Backend = supabase ? backendNube(supabase) : backendLocal;
