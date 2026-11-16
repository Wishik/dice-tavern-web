import type { Dote } from './data';
import { ATRIBUTOS, type Atributo, type EntradaTexto, type Personaje } from './types';
import { nivelTotal } from './multiclase';

/**
 * +1 a características que dan las dotes («Aumenta tu puntuación de Fuerza o Destreza en 1, hasta un máximo de 20»)
 * y la Mejora de Característica (+2 a una o +1 a dos). Lo elegido se guarda en la dote (`mejora`).
 */
export const DOTE_MEJORA = 'Mejora de Característica';
const NOMBRES: Record<string, Atributo> = { fuerza: 'FUE', destreza: 'DES', constitución: 'CON', constitucion: 'CON', inteligencia: 'INT', sabiduría: 'SAB', sabiduria: 'SAB', carisma: 'CAR' };

export interface OpcionesMejora { atrs: Atributo[]; cantidad: number; max: number }
/** Qué características puede subir esta dote, cuántos +1 da y hasta qué máximo (null si no sube ninguna). */
export function opcionesMejora(d: { nombre: string; texto?: string; descripcion?: string }): OpcionesMejora | null {
  const t = d.texto ?? d.descripcion ?? '';
  if (d.nombre === DOTE_MEJORA) return { atrs: [...ATRIBUTOS], cantidad: 2, max: 20 };
  const m = t.match(/Aumenta ([^.]*?) en 1\b[^.]*/i);
  if (!m) return null;
  const max = parseInt(m[0].match(/m[aá]ximo de (\d+)/i)?.[1] ?? '20', 10);
  if (/de tu elecci[oó]n|una de tus puntuaciones/i.test(m[1])) return { atrs: [...ATRIBUTOS], cantidad: 1, max };
  const atrs = [...new Set((m[1].toLowerCase().match(/[a-záéíóú]+/g) ?? []).map((w) => NOMBRES[w]).filter(Boolean))] as Atributo[];
  return atrs.length ? { atrs, cantidad: 1, max } : null;
}
/** Lo elegido (si solo hay una opción, se elige sola). */
export function mejoraDe(d: EntradaTexto): Atributo[] {
  const o = opcionesMejora(d); if (!o) return [];
  if (d.mejora?.length) return d.mejora.filter((a) => o.atrs.includes(a)).slice(0, o.cantidad);
  return o.atrs.length === 1 ? Array(o.cantidad).fill(o.atrs[0]) : [];
}
export const mejoraPendiente = (d: EntradaTexto) => { const o = opcionesMejora(d); return !!o && mejoraDe(d).length < o.cantidad; };

/** Cuánto suben las dotes a una característica, dote a dote, sin pasar del máximo de cada una. */
export function aumentosDotes(p: Personaje, a: Atributo): { texto: string; valor: number }[] {
  let v = p.caracteristicas[a] ?? 10;
  const out: { texto: string; valor: number }[] = [];
  for (const d of p.dotes ?? []) {
    const n = mejoraDe(d).filter((x) => x === a).length; if (!n) continue;
    const max = opcionesMejora(d)!.max;
    const sube = Math.max(0, Math.min(n, max - v));
    if (sube) { out.push({ texto: d.nombre, valor: sube }); v += sube; }
  }
  return out;
}

/** Requisitos numéricos de una dote (nivel y características 13+). Lo demás (competencias, ser lanzador) solo se muestra. */
export function requisitoDote(p: Personaje, d: Dote, valor: (a: Atributo) => number): { ok: boolean; texto: string } {
  const r = d.descripcion.match(/^Requisitos?:\s*(.*?)(?=\s+[A-ZÁÉÍÓÚ][a-záéíóú]+ tu |\s+Aumenta|\s+Elige|\s+Ganas|\s+Tienes|$)/)?.[1] ?? '';
  if (!r) return { ok: true, texto: '' };
  const nv = parseInt(r.match(/Nivel (\d+)/i)?.[1] ?? '0', 10);
  if (nv && nivelTotal(p) < nv) return { ok: false, texto: r };
  // «Fuerza 13+ o Destreza 13+», «Fuerza o Destreza 13+», «Inteligencia o Sabiduría o Carisma 13+»: basta con una.
  const trozo = r.replace(/Nivel \d+\+\s*(y|e)?\s*/i, '');
  if (/13\+/.test(trozo)) {
    const atrs = (trozo.toLowerCase().match(/[a-záéíóú]+/g) ?? []).map((w) => NOMBRES[w]).filter(Boolean) as Atributo[];
    if (atrs.length && !atrs.some((a) => valor(a) >= 13)) return { ok: false, texto: r };
  }
  return { ok: true, texto: r };
}
