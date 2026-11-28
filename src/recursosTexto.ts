import type { Clase, Razas } from './data';
import type { Atributo, Personaje } from './types';
import { bonoCompetencia, car, modificador } from './rules';
import { clasesDe, datosClase, nivelTotal } from './multiclase';

/**
 * Recursos con usos sacados del texto de los rasgos (raza, dotes, clase y subclase):
 * «1 vez/descanso largo», «una cantidad de veces por descanso largo igual a tu Modificador de Carisma»,
 * «no podrás volver a hacerlo hasta que finalices un descanso corto o largo»… Los conjuros gratis no entran (van en Conjuros).
 */
let RAZAS: Razas | null = null;
export const fijarRazas = (r: Razas | null) => { if (r) RAZAS = r; };
export const razasFijadas = () => RAZAS;

const ATR: [RegExp, Atributo][] = [[/fuerza|fue\b/i, 'FUE'], [/destreza|des\b/i, 'DES'], [/constituci[oó]n|con\b/i, 'CON'], [/inteligencia|int\b/i, 'INT'], [/sabidur[ií]a|sab\b/i, 'SAB'], [/carisma|car\b/i, 'CAR']];
const NUM: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };

export interface UsosTexto { max: (p: Personaje) => number; corto?: 'todos' }

/** Lee del texto cuántos usos tiene y si vuelven con el descanso corto. null si no es un rasgo con usos. */
export function usosDeTexto(texto: string): UsosTexto | null {
  const frases = texto.replace(/\n/g, ' ').split(/(?<=[.;])\s+/);
  for (const f of frases) {
    if (!/descanso/i.test(f)) continue;
    // Conjuros gratis («puedes lanzarlo 1 vez/descanso largo sin consumir recursos»): no son un recurso.
    if (/conjuro|lanzar|lanzarlo|lanzarla/i.test(f)) continue;
    const corto = /descanso corto/i.test(f) ? 'todos' as const : undefined;
    const igual = f.match(/igual a(?:l| tu)?\s+([^,;()]{0,60})/i)?.[1] ?? '';
    const usos = /(\d+|una?|dos|tres)\s*(vez|veces)\s*(\/|por|cada|entre)\s*(cada\s+)?descanso/i.exec(f)
      || /veces por descanso[^.]*igual a/i.exec(f)
      || /no (podr[aá]s|puedes|podr[aá]) (volver a )?(hacerlo|usarlo|usarla|usar este rasgo|utilizarlo)[^.]*hasta que[^.]*descanso/i.exec(f)
      || /(puntos|usos|cargas)[^.]*igual a[^.]*descanso/i.exec(f);
    if (!usos) continue;
    if (/veces[^.]*igual a/i.test(f) || (/(puntos|usos|cargas)/i.test(f) && igual)) {
      if (/competencia|bonif\.?\s*comp|\bBC\b/i.test(igual)) return { max: (p) => bonoCompetencia(nivelTotal(p)), corto };
      const a = ATR.find(([re]) => re.test(igual))?.[1];
      if (a) return { max: (p) => Math.max(1, modificador(car(p, a))), corto };
    }
    const n = usos[1] ? (parseInt(usos[1], 10) || NUM[usos[1].toLowerCase()] || 1) : 1;
    return { max: () => n, corto };
  }
  return null;
}

export interface RecursoTexto { id: string; es: string; ru: string; max: number; corto?: 'todos'; de: string }
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Rasgos del personaje con su texto: raza (fijos y elegidos), dotes, clase y subclase hasta su nivel. */
export function rasgosConTexto(p: Personaje, clase?: Clase | null): { nombre: string; texto: string; de: string }[] {
  const out: { nombre: string; texto: string; de: string }[] = [];
  const raza = RAZAS?.razas.find((r) => r.nombre === p.raza);
  for (const r of raza?.rasgosFijos ?? []) out.push({ ...r, de: p.raza });
  const elegibles = [...(raza?.rasgosUnicos ?? []), ...(RAZAS?.rasgosGenericos.noExcluyentes ?? []), ...(RAZAS?.rasgosGenericos.excluyentes ?? [])];
  for (const n of p.rasgosRaza ?? []) { const r = elegibles.find((x) => x.nombre === n); if (r) out.push({ ...r, de: p.raza }); }
  for (const d of p.dotes ?? []) if (d.texto) out.push({ nombre: d.nombre, texto: d.texto, de: 'Dote' });
  for (const c of clasesDe(p)) {
    const datos = datosClase(c.clase, clase);
    const sub = datos?.subclases?.find((s) => s.nombre === c.subclase);
    for (const r of [...(datos?.rasgos ?? []), ...(sub?.rasgos ?? [])]) if (r.nivel <= c.nivel) out.push({ nombre: r.nombre, texto: r.texto, de: c.clase });
  }
  return out;
}

/** Recursos sacados del texto que aún no están en la hoja (`ya`: nombres de los recursos que ya hay). */
export function recursosTexto(p: Personaje, clase: Clase | null | undefined, ya: string[]): RecursoTexto[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*\)$/, '').trim();
  const tiene = new Set(ya.map(norm));
  const out: RecursoTexto[] = [];
  for (const r of rasgosConTexto(p, clase)) {
    const n = norm(r.nombre);
    if (tiene.has(n) || [...tiene].some((t) => t.length > 4 && (n.startsWith(t) || t.startsWith(n)))) continue;
    const u = usosDeTexto(r.texto);
    if (!u) continue;
    tiene.add(n);
    out.push({ id: `t:${slug(r.nombre)}`, es: r.nombre, ru: r.nombre, max: u.max(p), corto: u.corto, de: r.de });
  }
  return out;
}
