import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Personaje } from './types';
import { normalizar } from './personaje';

export interface Usuario { id: string; email: string }
export interface Resumen { id: string; nombre: string; raza: string; clase: string; nivel: number; foto: string; actualizado: string }

export interface Backend {
  modo: 'local' | 'nube';
  usuario(): Promise<Usuario | null>;
  entrar(email: string, clave: string): Promise<void>;
  registrar(email: string, clave: string): Promise<'ok' | 'confirmar'>;
  salir(): Promise<void>;
  listar(): Promise<Resumen[]>;
  cargar(id: string): Promise<Personaje | null>;
  guardar(p: Personaje): Promise<void>;
  borrar(id: string): Promise<void>;
}

const resumen = (p: Personaje): Resumen => ({ id: p.id, nombre: p.nombre, raza: p.raza, clase: p.clase, nivel: p.nivel, foto: p.foto, actualizado: p.actualizado });

// ------------------------------------------------------------ Local (sin cuenta)
const CLAVE = 'dicetavern.personajes.v1';
function leerLocal(): Record<string, Personaje> {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; }
}
function escribirLocal(d: Record<string, Personaje>) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { throw new Error('No se pudo guardar en este dispositivo (¿memoria llena?).'); }
}
export const backendLocal: Backend = {
  modo: 'local',
  async usuario() { return { id: 'local', email: 'Este dispositivo' }; },
  async entrar() {}, async registrar() { return 'ok'; }, async salir() {},
  async listar() { return Object.values(leerLocal()).map(resumen).sort((a, b) => b.actualizado.localeCompare(a.actualizado)); },
  async cargar(id) { const p = leerLocal()[id]; return p ? normalizar(p) : null; },
  async guardar(p) { const d = leerLocal(); d[p.id] = p; escribirLocal(d); },
  async borrar(id) { const d = leerLocal(); delete d[id]; escribirLocal(d); },
};

// ------------------------------------------------------------ Supabase (con cuenta)
function backendNube(sb: SupabaseClient): Backend {
  return {
    modo: 'nube',
    // getSession lee la sesión guardada en el navegador (sin red); getUser podía quedarse colgado.
    async usuario() { const { data } = await sb.auth.getSession(); const u = data.session?.user; return u ? { id: u.id, email: u.email ?? '' } : null; },
    async entrar(email, clave) { const { error } = await sb.auth.signInWithPassword({ email, password: clave }); if (error) throw new Error(traducir(error.message)); },
    async registrar(email, clave) {
      const { data, error } = await sb.auth.signUp({ email, password: clave, options: { emailRedirectTo: location.origin } });
      if (error) throw new Error(traducir(error.message));
      return data.session ? 'ok' : 'confirmar';
    },
    async salir() { await sb.auth.signOut(); },
    async listar() {
      const { data, error } = await sb.from('personajes').select('id, datos->nombre, datos->raza, datos->clase, datos->nivel, datos->foto, actualizado').order('actualizado', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, nombre: (r.nombre as string) ?? '', raza: (r.raza as string) ?? '', clase: (r.clase as string) ?? '', nivel: (r.nivel as number) ?? 1, foto: (r.foto as string) ?? '', actualizado: r.actualizado as string }));
    },
    async cargar(id) {
      const { data, error } = await sb.from('personajes').select('datos').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? normalizar(data.datos as Personaje) : null;
    },
    async guardar(p) {
      // propietario lo rellena la base de datos (default auth.uid()).
      const { error } = await sb.from('personajes').upsert({ id: p.id, datos: p, actualizado: p.actualizado });
      if (error) throw new Error(error.message);
    },
    async borrar(id) { const { error } = await sb.from('personajes').delete().eq('id', id); if (error) throw new Error(error.message); },
  };
}

function traducir(m: string) {
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (/password should be/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu correo antes de entrar (revisa tu bandeja de entrada).';
  return m;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key) : null;
export const backend: Backend = supabase ? backendNube(supabase) : backendLocal;
