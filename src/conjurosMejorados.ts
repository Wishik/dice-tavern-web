import type { Personaje } from './types';

/**
 * Regla de la casa: aprender un conjuro que ya tienes (por otra clase, rasgo o dote) no lo duplica.
 * Se convierte en «Nombre +», «Nombre ++»…: se ve una sola vez, en el grupo con mejor ataque/CD,
 * y su texto es editable (cada partida mejora distinto). Al quitar uno se vuelve al estado anterior.
 * De momento solo Bola de fuego (prueba).
 */
export const CONJUROS_MEJORABLES = ['Bola de fuego'];
const clave = (n: string) => n.toLocaleLowerCase('es');
export const esMejorable = (nombre: string) => CONJUROS_MEJORABLES.some((m) => clave(m) === clave(nombre));

export const nombreMejorado = (nombre: string, plus: number) => (plus > 0 ? `${nombre} ${'+'.repeat(plus)}` : nombre);

/** Índices de p.conjuros con el mismo conjuro (mejorable). */
export const copias = (p: Personaje, nombre: string) => p.conjuros.map((c, i) => (clave(c.nombre) === clave(nombre) ? i : -1)).filter((i) => i >= 0);

/**
 * Qué copia se ve de cada conjuro repetido y cuántos «+» lleva.
 * `potencia(i)` = [ataque, CD] del grupo de la copia i: gana la mayor (a igualdad, la primera).
 */
export function resolverMejorados(p: Personaje, potencia: (i: number) => [number, number]): { ocultos: Set<number>; plus: Map<number, number> } {
  const ocultos = new Set<number>(), plus = new Map<number, number>();
  const vistos = new Set<string>();
  p.conjuros.forEach((c) => {
    const k = clave(c.nombre);
    if (vistos.has(k) || !esMejorable(c.nombre)) return;
    vistos.add(k);
    const idx = copias(p, c.nombre);
    if (idx.length < 2) return;
    let mejor = idx[0];
    for (const i of idx.slice(1)) {
      const [a, d] = potencia(i), [ma, md] = potencia(mejor);
      if (a > ma || (a === ma && d > md)) mejor = i;
    }
    idx.forEach((i) => { if (i !== mejor) ocultos.add(i); });
    plus.set(mejor, idx.length - 1);
  });
  return { ocultos, plus };
}

/** Texto de la versión mejorada (nivel de «+»): el guardado o, si no hay, el del conjuro base. */
export const textoMejorado = (p: Personaje, nombre: string, plus: number, base: string) => p.mejorasConjuro?.[clave(nombre)]?.[plus - 1] ?? base;
export function fijarTextoMejorado(x: Personaje, nombre: string, plus: number, texto: string) {
  const m = { ...(x.mejorasConjuro ?? {}) };
  const l = [...(m[clave(nombre)] ?? [])];
  while (l.length < plus - 1) l.push(l[l.length - 1] ?? '');
  l[plus - 1] = texto;
  m[clave(nombre)] = l;
  x.mejorasConjuro = m;
}

/** Quita la última copia que se puede quitar (la añadida a mano más reciente) y recorta los textos guardados. */
export function quitarCopia(x: Personaje, nombre: string): boolean {
  const idx = copias(x, nombre).filter((i) => !x.conjuros[i].origen);
  if (!idx.length) return false;
  x.conjuros.splice(idx[idx.length - 1], 1);
  const quedan = copias(x, nombre).length - 1;
  const k = clave(nombre);
  if (x.mejorasConjuro?.[k]) {
    const m = { ...x.mejorasConjuro };
    if (quedan > 0) m[k] = m[k].slice(0, quedan); else delete m[k];
    x.mejorasConjuro = m;
  }
  return true;
}
