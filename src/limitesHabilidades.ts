import type { Clase, Trasfondo } from './data';
import type { Personaje } from './types';
import { HABILIDADES, idHabilidad } from './rules';
import { RASGOS_FIJOS } from './fijos';

/** Una fuente que da competencias o pericias en habilidades «a elegir» (las fijas de raza ya se suman solas en bonos.ts). */
export interface FuenteHabilidad { es: string; ru: string; comp: number; pericia: number; /** Vale como competencia o, si ya la tienes, como pericia. */ flexible?: boolean }

export interface Limites { comp: number; pericia: number; fuentes: FuenteHabilidad[] }

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;

/** Dotes que tocan habilidades. */
const DOTES: Record<string, Omit<FuenteHabilidad, 'es' | 'ru'>> = {
  'Habilidoso': { comp: 3, pericia: 0 },
  'Experto en habilidades': { comp: 1, pericia: 1 },
  'Mente aguda': { comp: 1, pericia: 0, flexible: true },
  'Observador': { comp: 1, pericia: 0, flexible: true },
  'Don de la habilidad': { comp: HABILIDADES.length, pericia: 1 },
};

/** Rasgos de raza con habilidades a elegir. */
const RASGOS: Record<string, Omit<FuenteHabilidad, 'es' | 'ru'>> = {
  'Hábil': { comp: 2, pericia: 0 },
  'Saber del Cazador': { comp: 2, pericia: 0 },
  'Instinto ancestral': { comp: 1, pericia: 0, flexible: true },
  'Conocimiento Astral': { comp: 1, pericia: 0 },
};

/** Subclases que dan competencias en habilidades (nivel 3). */
const SUBCLASES: Record<string, number> = {
  'Colegio del conocimiento': 3,
  'Errante feérico': 1,
  'Maestro del combate': 1,
  'Arquero arcano': 2,
  'Monje de la misericordia': 2,
};

/** Pericias por nivel de clase: [nivel, cantidad]. */
const PERICIAS: Record<string, [number, number, string][]> = {
  'Bardo': [[2, 2, 'Pericia'], [9, 2, 'Pericia']],
  'Explorador': [[2, 1, 'Explorador hábil'], [9, 2, 'Pericia']],
  'Mago': [[2, 1, 'Académico']],
  'Pícaro': [[1, 2, 'Pericia'], [6, 2, 'Pericia']],
};

export function habilidadesTrasfondo(p: Personaje, trasfondos: Trasfondo[] | null): string[] {
  return (trasfondos?.find((t) => t.nombre === p.trasfondoEstilo)?.habilidades ?? []).map((h) => idHabilidad(h)).filter(Boolean) as string[];
}

/** Cuántas competencias y pericias en habilidades le tocan al personaje, y de dónde salen. */
export function limitesHabilidades(p: Personaje, clase: Clase | null | undefined, trasfondos: Trasfondo[] | null): Limites {
  const f: FuenteHabilidad[] = [];
  if (clase) f.push({ es: p.clase, ru: p.clase, comp: clase.atributos.habilidadesN, pericia: 0 });
  const tras = habilidadesTrasfondo(p, trasfondos);
  if (tras.length) f.push({ es: 'Trasfondo', ru: 'Предыстория', comp: tras.length, pericia: 0 });
  if (p.clase === 'Bárbaro' && p.nivel >= 3) f.push({ es: 'Conocimiento primigenio', ru: 'Conocimiento primigenio', comp: 1, pericia: 0 });
  if (clase && p.nivel >= 3) for (const [s, n] of Object.entries(SUBCLASES)) if (igual(s, p.subclase ?? '')) f.push({ es: s, ru: s, comp: n, pericia: 0 });
  for (const [nivel, n, nombre] of PERICIAS[p.clase] ?? []) if (p.nivel >= nivel) f.push({ es: `${nombre} (niv. ${nivel})`, ru: `${nombre} (ур. ${nivel})`, comp: 0, pericia: n });

  const rasgos = new Set([...(RASGOS_FIJOS[p.raza] ?? []), ...(p.rasgosRaza ?? [])]);
  // El humano elige entre una dote extra o dos habilidades: si ya tiene más dotes de las que le tocan, eligió la dote.
  const dotesNormales = (p.trasfondoEstilo ? 1 : 0) + (clase?.tabla.filter((r) => r.nivel <= p.nivel && /Mejora de característica|Don épico/.test(r.rasgos)).length ?? 0);
  const humanoConDote = p.raza === 'Humano' && (p.dotes ?? []).length > dotesNormales;
  for (const [r, v] of Object.entries(RASGOS)) if (rasgos.has(r) && !(r === 'Hábil' && humanoConDote)) f.push({ es: r, ru: r, ...v });
  for (const d of p.dotes ?? []) { const k = Object.keys(DOTES).find((x) => igual(x, d.nombre)); if (k) f.push({ es: k, ru: k, ...DOTES[k] }); }

  const comp = Math.min(HABILIDADES.length, f.reduce((s, x) => s + x.comp, 0));
  const pericia = f.reduce((s, x) => s + x.pericia + (x.flexible ? x.comp : 0), 0);
  return { comp, pericia, fuentes: f };
}

/**
 * Qué casillas marcadas pasan del límite (se pintan en rojo). Cuentan como «de más» las últimas que se marcaron;
 * las que no tienen orden (fichas antiguas) se consideran antes: trasfondo, luego las de la clase, luego el resto.
 */
export function sobrantes(marcadas: string[], limite: number, orden: string[] | undefined, prioridad: string[]): Set<string> {
  if (marcadas.length <= limite) return new Set();
  const pos = (h: string) => { const i = (orden ?? []).indexOf(h); return i < 0 ? -1000 + (prioridad.includes(h) ? prioridad.indexOf(h) : prioridad.length + HABILIDADES.findIndex((x) => x.id === h)) : i; };
  const lista = [...marcadas].sort((a, b) => pos(a) - pos(b));
  return new Set(lista.slice(limite));
}

/** Apunta el orden en que se marcan las casillas (para saber cuáles son las de más). */
export function anotarOrden(orden: string[] | undefined, id: string, marcada: boolean): string[] {
  const o = (orden ?? []).filter((x) => x !== id);
  return marcada ? [...o, id] : o;
}
