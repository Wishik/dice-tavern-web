import type { Item, Personaje, RanuraEquipo } from './types';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from './types';

/**
 * Mejoras de los objetos equipados (un amuleto +1 a la CA, unas botas +2 a Sigilo…).
 * Solo cuentan mientras el objeto está puesto en algún hueco del equipo.
 * El ataque y el daño de un arma solo valen para esa arma (ver `bonoPropioArma`);
 * los de cualquier otro objeto valen para todas las armas.
 */
export interface BonoEquipo { donde: string; valor: number; origen: string }

/** Opciones del desplegable de mejoras, en orden. */
export function opcionesBono(habilidades: { id: string; nombre: string }[]): { id: string; es: string; ru: string; grupo: string }[] {
  return [
    { id: 'CA', es: 'Clase de armadura (CA)', ru: 'Класс доспеха (КД)', grupo: 'Combate' },
    { id: 'ataque', es: 'Ataque con armas', ru: 'Атака оружием', grupo: 'Combate' },
    { id: 'dano', es: 'Daño con armas', ru: 'Урон оружием', grupo: 'Combate' },
    { id: 'ataqueConjuro', es: 'Ataque de conjuros', ru: 'Атака заклинаниями', grupo: 'Combate' },
    { id: 'cdConjuro', es: 'CD de conjuros', ru: 'СЛ заклинаний', grupo: 'Combate' },
    { id: 'iniciativa', es: 'Iniciativa', ru: 'Инициатива', grupo: 'Combate' },
    { id: 'velocidad', es: 'Velocidad (pies)', ru: 'Скорость (фт)', grupo: 'Combate' },
    ...ATRIBUTOS.map((a) => ({ id: a, es: NOMBRE_ATRIBUTO[a], ru: a, grupo: 'Características' })),
    { id: 'salv:todas', es: 'Todas las salvaciones', ru: 'Все спасброски', grupo: 'Salvaciones' },
    ...ATRIBUTOS.map((a) => ({ id: `salv:${a}`, es: `Salvación de ${NOMBRE_ATRIBUTO[a]}`, ru: `Спасбросок ${a}`, grupo: 'Salvaciones' })),
    ...habilidades.map((h) => ({ id: `hab:${h.id}`, es: h.nombre, ru: h.nombre, grupo: 'Habilidades' })),
  ];
}

const RANURAS: RanuraEquipo[] = ['yelmo', 'amuleto', 'armadura', 'capa', 'brazalete', 'guantes', 'anillo1', 'anillo2', 'cinto', 'botas', 'manoHabil', 'manoTorpe'];

/** Todas las mejoras de lo que llevas puesto (sin el ataque/daño propio de las armas). */
export function bonosEquipo(p: Personaje): BonoEquipo[] {
  const out: BonoEquipo[] = [];
  for (const r of RANURAS) {
    const it = p.equipo?.[r];
    if (!it?.bonos?.length) continue;
    for (const b of it.bonos) {
      if (!b.valor) continue;
      if (it.tipo === 'arma' && (b.donde === 'ataque' || b.donde === 'dano')) continue;
      out.push({ donde: b.donde, valor: b.valor, origen: it.nombre });
    }
  }
  return out;
}

/** Mejoras de lo equipado que tocan a `donde` («salv:FUE» incluye las de «Todas las salvaciones»). */
export function bonosEquipoEn(p: Personaje, donde: string): BonoEquipo[] {
  return bonosEquipo(p).filter((b) => b.donde === donde || (donde.startsWith('salv:') && b.donde === 'salv:todas'));
}
export const sumaEquipo = (p: Personaje, donde: string) => bonosEquipoEn(p, donde).reduce((s, b) => s + b.valor, 0);

/** Ataque o daño que da el propio arma con sus mejoras (además de su +N mágico). */
export const bonoPropioArma = (it: Item, que: 'ataque' | 'dano') => (it.bonos ?? []).filter((b) => b.donde === que).reduce((s, b) => s + (b.valor || 0), 0);
