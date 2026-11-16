import type { Item, Personaje, RanuraEquipo } from './types';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from './types';

/**
 * Mejoras de los objetos equipados (un amuleto +1 a la CA, unas botas +2 a Sigilo…).
 * Solo cuentan mientras el objeto está puesto en algún hueco del equipo.
 * El ataque y el daño de un arma solo valen para esa arma (ver `bonoPropioArma`);
 * los de cualquier otro objeto valen para todas las armas.
 */
export interface BonoEquipo { donde: string; valor: number; origen: string; dado?: string }

/** Opciones del desplegable de mejoras, en orden. */
export function opcionesBono(habilidades: { id: string; nombre: string }[]): { id: string; es: string; ru: string; grupo: string }[] {
  return [
    { id: 'CA', es: 'Clase de armadura (CA)', ru: 'Класс доспеха (КД)', grupo: 'Combate' },
    { id: 'ataque', es: 'Ataque con armas', ru: 'Атака оружием', grupo: 'Combate' },
    { id: 'dano', es: 'Daño con armas', ru: 'Урон оружием', grupo: 'Combate' },
    { id: 'ataqueConjuro', es: 'Ataque de conjuros', ru: 'Атака заклинаниями', grupo: 'Combate' },
    { id: 'cdConjuro', es: 'CD de conjuros', ru: 'СЛ заклинаний', grupo: 'Combate' },
    { id: 'iniciativa', es: 'Iniciativa', ru: 'Инициатива', grupo: 'Combate' },
    { id: 'velocidad', es: 'Velocidad andando (pies; corriendo ×2)', ru: 'Скорость шагом (фт; бегом ×2)', grupo: 'Velocidad' },
    { id: 'vel:corriendo', es: 'Velocidad corriendo (pies)', ru: 'Скорость бегом (фт)', grupo: 'Velocidad' },
    { id: 'vel:trepando', es: 'Velocidad trepando (pies)', ru: 'Скорость лазания (фт)', grupo: 'Velocidad' },
    { id: 'vel:nadando', es: 'Velocidad nadando (pies)', ru: 'Скорость плавания (фт)', grupo: 'Velocidad' },
    { id: 'vel:volando', es: 'Velocidad volando (pies)', ru: 'Скорость полёта (фт)', grupo: 'Velocidad' },
    ...ATRIBUTOS.map((a) => ({ id: a, es: NOMBRE_ATRIBUTO[a], ru: a, grupo: 'Características' })),
    { id: 'salv:todas', es: 'Todas las salvaciones', ru: 'Все спасброски', grupo: 'Salvaciones' },
    ...ATRIBUTOS.map((a) => ({ id: `salv:${a}`, es: `Salvación de ${NOMBRE_ATRIBUTO[a]}`, ru: `Спасбросок ${a}`, grupo: 'Salvaciones' })),
    ...habilidades.map((h) => ({ id: `hab:${h.id}`, es: h.nombre, ru: h.nombre, grupo: 'Habilidades' })),
  ];
}

const RANURAS: RanuraEquipo[] = ['yelmo', 'amuleto', 'armadura', 'capa', 'brazalete', 'guantes', 'anillo1', 'anillo2', 'cinto', 'botas', 'carcaj', 'manoHabil', 'manoTorpe'];

/** Todas las mejoras de lo que llevas puesto (sin el ataque/daño propio de las armas). */
export function bonosEquipo(p: Personaje): BonoEquipo[] {
  const out: BonoEquipo[] = [];
  for (const r of RANURAS) {
    const it = p.equipo?.[r];
    if (!it?.bonos?.length) continue;
    for (const b of it.bonos) {
      if (!b.valor && !b.dado) continue;
      if (it.tipo === 'arma' && (b.donde === 'ataque' || b.donde === 'dano')) continue;
      out.push(b.dado ? { donde: b.donde, valor: 0, dado: b.dado, origen: it.nombre } : { donde: b.donde, valor: b.valor, origen: it.nombre });
    }
  }
  return out;
}

/** Mejoras de lo equipado que tocan a `donde` («salv:FUE» incluye las de «Todas las salvaciones»). */
export function bonosEquipoEn(p: Personaje, donde: string): BonoEquipo[] {
  return todosEn(p, donde).filter((b) => !b.dado);
}
const todosEn = (p: Personaje, donde: string) => bonosEquipo(p).filter((b) => b.donde === donde || (donde.startsWith('salv:') && b.donde === 'salv:todas'));
/** Dados que suman los objetos equipados a una tirada (p. ej. ['1d4'] por un amuleto de +1d4 a las salvaciones). */
export const dadosEquipo = (p: Personaje, donde: string) => todosEn(p, donde).filter((b) => b.dado).map((b) => b.dado!);
/** Dados del propio arma para su ataque o su daño. */
export const dadosPropioArma = (it: Item, que: 'ataque' | 'dano') => (it.bonos ?? []).filter((b) => b.donde === que && b.dado).map((b) => b.dado!);
/** Mejoras que solo pueden ser un número (no se tiran): CA, CD, velocidad y características. */
export const soloFijo = (donde: string) => ['CA', 'cdConjuro', 'velocidad', ...ATRIBUTOS].includes(donde) || donde.startsWith('vel:');
export const DADOS_BONO = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d4', '2d6', '2d8', '1d20'];
export const sumaEquipo = (p: Personaje, donde: string) => bonosEquipoEn(p, donde).reduce((s, b) => s + b.valor, 0);

/** Ataque o daño que da el propio arma con sus mejoras (además de su +N mágico). */
export const bonoPropioArma = (it: Item, que: 'ataque' | 'dano') => (it.bonos ?? []).filter((b) => b.donde === que && !b.dado).reduce((s, b) => s + (b.valor || 0), 0);
