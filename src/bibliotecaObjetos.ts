import { supabase } from './store';
import { cambiarItems, type Alijo } from './alijos';
import { uid } from './rules';
import type { Item, Personaje } from './types';

/**
 * Biblioteca de objetos de la partida: los objetos que crea cualquier jugador (o el máster) se guardan aquí
 * y salen al añadir objetos. Se guarda como un alijo especial (público, con este nombre), así no hace falta otra tabla.
 * Se puede exportar entera con un código e importar en otra partida.
 */
export const NOMBRE_BIBLIOTECA = '__biblioteca__';
export const esBiblioteca = (a: Alijo) => !a.suelo && a.nombre === NOMBRE_BIBLIOTECA;

const clave = (n: string) => n.trim().toLocaleLowerCase('es');
/** Firma del contenido de un objeto (sin id): para saber si un objeto quitado ha vuelto igual o cambiado. */
export const firmaObjeto = (it: Item) => { const { id: _i, borrado: _b, ...r } = paraBiblioteca(it); return JSON.stringify(r); };
/** Lo que se ve de la biblioteca: sin las marcas de objetos quitados. */
export const visiblesBiblioteca = (items: Item[] | undefined) => (items ?? []).filter((x) => !x.borrado);

/** Objetos de un personaje que van a la biblioteca: los creados o editados por los jugadores. */
export function objetosPropios(p: Personaje): Item[] {
  const todos = [...p.mochila, ...p.cinturon.items, ...Object.values(p.equipo), ...(p.suelo ?? [])].filter(Boolean) as Item[];
  // Los objetos de antes de esta marca: los que tienen mejoras, +N o daño extra.
  return todos.filter((it) => !it.bolsa && (it.propio || it.bonos?.length || it.magico || it.danoExtra));
}

/** Copia limpia para la biblioteca: sin cantidades, munición ni a quién se robó. */
export function paraBiblioteca(it: Item): Item {
  const { robadoA: _r, municion: _m, ...resto } = structuredClone(it);
  return { ...resto, id: uid(), cantidad: 1 };
}

/** La biblioteca de la partida (se crea la primera vez que se guarda algo). */
export async function bibliotecaDe(partida: string): Promise<Alijo> {
  if (!supabase) throw new Error('Sin cuenta');
  const r = await supabase.from('alijos').select('*').eq('partida', partida).eq('suelo', false).eq('nombre', NOMBRE_BIBLIOTECA).order('actualizado').limit(1);
  if (r.error) throw new Error(r.error.message);
  if (r.data?.[0]) return r.data[0] as Alijo;
  const n = await supabase.from('alijos').insert({ partida, nombre: NOMBRE_BIBLIOTECA, publico: true }).select('*').single();
  if (n.error) throw new Error(n.error.message);
  return n.data as Alijo;
}

/** Añade objetos (o los reemplaza si ya hay uno con el mismo nombre). Devuelve cuántos eran nuevos. */
export async function guardarEnBiblioteca(partida: string, items: Item[]): Promise<number> {
  const b = await bibliotecaDe(partida);
  const mezclar = (l: Item[]) => {
    const out = [...l];
    let nuevos = 0;
    for (const it of items) {
      if (!it.nombre.trim()) continue;
      const limpio = paraBiblioteca(it);
      const i = out.findIndex((x) => clave(x.nombre) === clave(limpio.nombre));
      // Quitado a mano de la biblioteca: no vuelve mientras alguien lo tenga igual; si se cambia, vuelve.
      if (i >= 0 && out[i].borrado && out[i].borrado === firmaObjeto(it)) continue;
      if (i >= 0) out[i] = { ...limpio, id: out[i].id }; else { out.push(limpio); nuevos++; }
    }
    return { out: out.sort((a, c) => a.nombre.localeCompare(c.nombre, 'es')), nuevos };
  };
  // Si ya está todo igual, no se escribe nada.
  if (JSON.stringify(mezclar(b.items).out) === JSON.stringify(b.items)) return 0;
  let nuevos = 0;
  await cambiarItems(b.id, (l) => { const r = mezclar(l); nuevos = r.nuevos; return r.out; });
  window.dispatchEvent(new Event('alijos-cambio'));
  return nuevos;
}

export async function quitarDeBiblioteca(partida: string, id: string) {
  const b = await bibliotecaDe(partida);
  // Se deja una marca (nombre + firma) para que los personajes que aún lo llevan no lo vuelvan a subir solos.
  await cambiarItems(b.id, (l) => l.map((x) => x.id === id ? { id: x.id, nombre: x.nombre, descripcion: '', precio: '', cantidad: 1, tipo: x.tipo, borrado: firmaObjeto(x) } : x));
  window.dispatchEvent(new Event('alijos-cambio'));
}
