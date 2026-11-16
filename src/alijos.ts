import { supabase } from './store';
import { L } from './i18n';
import type { Item } from './types';

/** Alijo de una partida: público, o privado con lista de acceso. El «suelo» es un alijo especial (uno por partida, lo ven todos). */
export interface Alijo { id: string; partida: string; creador: string; nombre: string; suelo: boolean; publico: boolean; acceso: string[]; items: Item[]; actualizado: string }

function sb() {
  if (!supabase) throw new Error(L('Los alijos y el suelo compartido necesitan una cuenta.', 'Для тайников и общего пола нужен аккаунт.'));
  return supabase;
}
function err(m: string): Error {
  if (/alijos|does not exist|could not find the table/i.test(m))
    return new Error(L('Falta preparar los alijos en Supabase: ejecuta alijos.sql en el SQL Editor.', 'Тайники ещё не настроены в Supabase: выполни alijos.sql в SQL Editor.'));
  return new Error(m);
}
export async function yo() { const { data } = await sb().auth.getSession(); return data.session?.user.id ?? ''; }

/** Partida en la que juega este personaje (la más reciente), o null. */
export async function partidaDe(pj: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('miembros').select('partida, unido').eq('personaje', pj).order('unido', { ascending: false }).limit(1);
  if (error) return null;
  return (data?.[0] as { partida: string } | undefined)?.partida ?? null;
}

export async function cargarAlijos(partida: string): Promise<Alijo[]> {
  const { data, error } = await sb().from('alijos').select('*').eq('partida', partida).order('actualizado');
  if (error) throw err(error.message);
  return (data ?? []) as Alijo[];
}

/** El suelo de la partida (se crea la primera vez). */
export async function sueloDe(partida: string): Promise<Alijo> {
  const c = sb();
  const r = await c.from('alijos').select('*').eq('partida', partida).eq('suelo', true).maybeSingle();
  if (r.error) throw err(r.error.message);
  if (r.data) return r.data as Alijo;
  const n = await c.from('alijos').insert({ partida, suelo: true, publico: true, nombre: 'Suelo' }).select('*').single();
  if (n.error) { // otro lo creó a la vez
    const r2 = await c.from('alijos').select('*').eq('partida', partida).eq('suelo', true).maybeSingle();
    if (r2.data) return r2.data as Alijo;
    throw err(n.error.message);
  }
  return n.data as Alijo;
}

export async function crearAlijo(partida: string, nombre: string, publico: boolean, acceso: string[]) {
  const { error } = await sb().from('alijos').insert({ partida, nombre, publico, acceso, creador: await yo() });
  if (error) throw err(error.message);
}

/** Cambia los objetos leyendo antes la última versión (por si otro jugador lo tocó). */
export async function cambiarItems(id: string, f: (items: Item[]) => Item[]) {
  const c = sb();
  const r = await c.from('alijos').select('items').eq('id', id).maybeSingle();
  if (r.error) throw err(r.error.message);
  if (!r.data) throw new Error(L('Ese alijo ya no existe o no tienes acceso.', 'Этого тайника больше нет или у тебя нет доступа.'));
  const items = f((r.data.items as Item[]) ?? []);
  const { error } = await c.from('alijos').update({ items, actualizado: new Date().toISOString() }).eq('id', id);
  if (error) throw err(error.message);
  return items;
}

export async function cambiarAlijo(id: string, cambios: Partial<Pick<Alijo, 'nombre' | 'publico' | 'acceso'>>) {
  const { error } = await sb().from('alijos').update(cambios).eq('id', id);
  if (error) throw err(error.message);
}

export async function borrarAlijo(id: string) {
  const { error } = await sb().from('alijos').delete().eq('id', id);
  if (error) throw err(error.message);
}
