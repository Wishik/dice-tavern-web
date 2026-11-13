import { textoClasesBreve } from './multiclase';
import { supabase } from './store';
import { L } from './i18n';
import type { Personaje } from './types';
import { normalizar } from './personaje';
import { calcularCA, iniciativa } from './rules';

export interface Partida { id: string; nombre: string; codigo: string; master: string; creada: string; combate?: Combate | null }

/** Enemigo en el combate. Los de un mismo grupo comparten iniciativa. */
export interface Enemigo { id: string; monstruo: string | null; nombre: string; grupo: string | null; /** Bando: 'aliado' o una letra de grupo enemigo ('A', 'B'…). Sin bando = 'A'. */ bando?: string; ini: number | null; bonoIni: number; pg: number; pgMax: number; temp?: number; ca: number; estados: string[]; agotamiento?: number; estadosDetalle?: Personaje['estadosDetalle'] }
/** Tirada del máster en el combate (enemigos), para el historial. */
export interface TiradaMaster { id: string; combate?: string; quien: string; etiqueta: string; formula: string; total: number; detalle: string; modo: string; critico: string | null; creada: string }
/** Un combate. Los jugadores van al primero salvo que estén en `pjs` de otro. */
export interface CombateUno { id: string; nombre?: string; ronda: number; turno: string | null; enemigos: Enemigo[]; pjs?: string[]; /** El historial de tiradas empieza aquí (se pone al terminar el combate). */ desde?: string }
/** Lo guardado en la partida: el primer combate en la raíz (como antes) y los demás en `otros`. */
export interface Combate { ronda: number; turno: string | null; enemigos: Enemigo[]; nombre?: string; desde?: string; pjs?: string[]; tiradas?: TiradaMaster[]; otros?: CombateUno[] }
export interface Miembro {
  usuario: string;
  alias: string;
  personaje: string | null;
  /** Resumen del personaje elegido (null si aún no ha elegido o no se puede ver). */
  pj: (Pick<Personaje, 'nombre' | 'raza' | 'clase' | 'nivel' | 'foto' | 'pg' | 'pm' | 'estados' | 'estadosDetalle' | 'agotamiento' | 'iniciativaActual'> & { ca: number; bonoIni: number }) | null;
}

// Sin 0/O ni 1/I/L para que el código se pueda dictar sin errores.
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function nuevoCodigo(n = 6) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return Array.from(a, (x) => LETRAS[x % LETRAS.length]).join('');
}

function sb() {
  if (!supabase) throw new Error(L('Las partidas necesitan una cuenta (no funcionan en modo local).', 'Для партий нужен аккаунт (в локальном режиме они не работают).'));
  return supabase;
}
function err(m: string): Error {
  if (/relation .*(partidas|miembros)|does not exist|could not find the (table|function)/i.test(m))
    return new Error(L('Falta preparar las partidas en Supabase: ejecuta de nuevo supabase/schema.sql en el SQL Editor.', 'Партии ещё не настроены в Supabase: выполни заново supabase/schema.sql в SQL Editor.'));
  if (/codigo no encontrado/i.test(m)) return new Error(L('No hay ninguna partida con ese código.', 'Партии с таким кодом нет.'));
  return new Error(m);
}
async function yo() { const { data } = await sb().auth.getSession(); return data.session?.user.id ?? ''; }

export async function misPartidas(): Promise<Partida[]> {
  const { data, error } = await sb().from('partidas').select('*').order('creada', { ascending: false });
  if (error) throw err(error.message);
  return data as Partida[];
}

export async function crearPartida(nombre: string): Promise<Partida> {
  const c = sb(); const uid = await yo();
  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await c.from('partidas').insert({ nombre: nombre.trim(), codigo: nuevoCodigo(), master: uid }).select('*').single();
    if (error) { if (/duplicate|unique/i.test(error.message)) continue; throw err(error.message); }
    const m = await c.from('miembros').insert({ partida: data.id, usuario: uid });
    if (m.error) throw err(m.error.message);
    return data as Partida;
  }
  throw new Error(L('No se pudo crear el código. Prueba otra vez.', 'Не удалось создать код. Попробуй ещё раз.'));
}

export async function unirse(codigo: string): Promise<string> {
  const { data, error } = await sb().rpc('unirse', { cod: codigo.trim().toUpperCase() });
  if (error) throw err(error.message);
  return data as string;
}

export async function cargarPartida(id: string): Promise<{ partida: Partida; miembros: Miembro[] }> {
  const c = sb();
  const p = await c.from('partidas').select('*').eq('id', id).maybeSingle();
  if (p.error) throw err(p.error.message);
  if (!p.data) throw new Error(L('Esta partida no existe o ya no estás en ella.', 'Этой партии нет, или ты в ней больше не состоишь.'));
  const m = await c.from('miembros').select('usuario, personaje, unido').eq('partida', id).order('unido');
  if (m.error) throw err(m.error.message);
  const filas = m.data as { usuario: string; personaje: string | null }[];
  const ids = filas.map((f) => f.usuario);
  const pjs = filas.map((f) => f.personaje).filter(Boolean) as string[];
  const [al, pj] = await Promise.all([
    ids.length ? c.from('perfiles').select('id, alias').in('id', ids) : Promise.resolve({ data: [], error: null }),
    pjs.length ? c.from('personajes').select('id, datos').in('id', pjs) : Promise.resolve({ data: [], error: null }),
  ]);
  const alias = new Map(((al.data ?? []) as { id: string; alias: string }[]).map((x) => [x.id, x.alias]));
  const res = new Map(((pj.data ?? []) as { id: string; datos: Personaje }[]).map((x) => {
    const p = normalizar(x.datos);
    let ca = 10; try { ca = calcularCA(p).total; } catch { /* datos antiguos */ }
    return [x.id, { nombre: p.nombre, raza: p.raza, clase: textoClasesBreve(p), nivel: p.nivel, foto: p.foto, pg: p.pg, pm: p.pm, ca, estados: p.estados ?? [], estadosDetalle: p.estadosDetalle ?? {}, agotamiento: p.agotamiento ?? 0, iniciativaActual: p.iniciativaActual ?? null, bonoIni: iniciativa(p) }];
  }));
  return {
    partida: p.data as Partida,
    miembros: filas.map((f) => ({ usuario: f.usuario, personaje: f.personaje, alias: alias.get(f.usuario) ?? '?', pj: f.personaje ? res.get(f.personaje) ?? null : null })),
  };
}

export async function elegirPersonaje(partida: string, personaje: string | null) {
  const { error } = await sb().from('miembros').update({ personaje }).eq('partida', partida).eq('usuario', await yo());
  if (error) throw err(error.message);
}
export async function quitarMiembro(partida: string, usuario: string) {
  const { error } = await sb().from('miembros').delete().eq('partida', partida).eq('usuario', usuario);
  if (error) throw err(error.message);
}
export async function borrarPartida(id: string) {
  const { error } = await sb().from('partidas').delete().eq('id', id);
  if (error) throw err(error.message);
}
export const enlaceInvitacion = (codigo: string) => `${location.origin}/?unirse=${codigo}`;

/** Guarda el estado del combate (solo el máster puede cambiar su partida). */
export async function guardarCombate(partida: string, combate: Combate | null) {
  const { error } = await sb().from('partidas').update({ combate }).eq('id', partida);
  if (error) throw err(error.message);
}
/** El máster cambia campos permitidos de un jugador (vida, estados, iniciativa…) sin cargar toda la hoja. */
export async function cambiarJugador(pj: string, cambios: Record<string, unknown>) {
  const { error } = await sb().rpc('master_guardar', { pj, cambios: { ...cambios, actualizado: new Date().toISOString() } });
  if (error) throw err(error.message);
}
