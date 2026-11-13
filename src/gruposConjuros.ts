import type { Atributo, ConjuroPersonaje, Personaje } from './types';
import type { Razas } from './data';
import { CARACTERISTICA_CONJUROS, bonoCompetencia, car, modificador } from './rules';
import { nivelTotal } from './multiclase';
import { FUENTES, type Fuente } from './conjurosRasgos';
import { claseDeConjuro } from './avisos';
import { bonoAtaqueConjuro, bonoCdConjuro } from './bonos';

/**
 * Los conjuros se agrupan por su origen: uno por clase (los que cuentan para su límite) y, en «Otros conjuros»,
 * los raciales, los de cada dote, las invocaciones de brujo y los adicionales de la lista de una clase.
 * Cada grupo tiene su característica de conjuros (automática, se puede cambiar), su ataque y su CD.
 */
export type TipoGrupo = 'clase' | 'raza' | 'dote' | 'invocacion' | 'lista' | 'otros';
export interface GrupoConjuros { id: string; tipo: TipoGrupo; clase?: string; rasgo?: string }

const MENTALES: Atributo[] = ['INT', 'SAB', 'CAR'];
const ATR_TEXTO: Record<string, Atributo> = { inteligencia: 'INT', sabiduría: 'SAB', sabiduria: 'SAB', carisma: 'CAR' };

const fuenteDe = (origen: string): Fuente | undefined => FUENTES.find((f) => f.concesiones.some((c) => c.id === origen));

/** Grupo al que pertenece un conjuro del personaje. */
export function grupoDe(p: Personaje, c: ConjuroPersonaje): GrupoConjuros {
  if (!c.adicional) { const clase = claseDeConjuro(p, c); return { id: `clase:${clase}`, tipo: 'clase', clase }; }
  if (c.origen) {
    const f = fuenteDe(c.origen);
    if (f?.invocacion) return { id: 'invocacion', tipo: 'invocacion', clase: 'Brujo' };
    if (f?.dote) return { id: `dote:${f.rasgo}`, tipo: 'dote', rasgo: f.rasgo };
    if (f) return { id: `raza:${f.rasgo}`, tipo: 'raza', rasgo: f.rasgo };
  }
  if (c.lista === 'raza') return { id: 'raza:', tipo: 'raza' };
  if (c.lista) return { id: `lista:${c.lista}`, tipo: 'lista', clase: c.lista };
  return { id: 'otros', tipo: 'otros' };
}

/** Texto del rasgo de raza (para leer «Si no eres lanzador de conjuros, X es tu característica…»). */
function textoRasgo(p: Personaje, razas: Razas | null, rasgo: string): string {
  if (!razas) return '';
  const r = razas.razas.find((x) => x.nombre === p.raza);
  const todos = [...(r?.rasgosFijos ?? []), ...(r?.rasgosUnicos ?? []), ...razas.rasgosGenericos.excluyentes, ...razas.rasgosGenericos.noExcluyentes];
  return todos.find((x) => x.nombre === rasgo)?.texto ?? '';
}
export function atributoDeRasgo(texto: string): Atributo | '' {
  const m = texto.match(/si no eres lanzador de conjuros[^.]*?\b(inteligencia|sabidur[ií]a|carisma)\b/i);
  return m ? ATR_TEXTO[m[1].toLowerCase()] : '';
}

/**
 * La de tu clase principal si lanza conjuros; si no, la mejor de tus otras clases lanzadoras.
 * `lanzadoras` = clases del personaje que lanzan conjuros.
 */
export function atributoLanzador(p: Personaje, lanzadoras: string[]): Atributo | '' {
  if (lanzadoras.includes(p.clase)) return atributoGrupo(p, { id: `clase:${p.clase}`, tipo: 'clase', clase: p.clase }, lanzadoras, null);
  const opciones = lanzadoras.map((k) => atributoGrupo(p, { id: `clase:${k}`, tipo: 'clase', clase: k }, lanzadoras, null)).filter(Boolean) as Atributo[];
  return opciones.sort((a, b) => car(p, b) - car(p, a))[0] ?? '';
}
const mejorMental = (p: Personaje): Atributo => [...MENTALES].sort((a, b) => car(p, b) - car(p, a))[0];

/** Característica automática del grupo (sin lo que el jugador haya cambiado a mano). */
export function atributoAuto(p: Personaje, g: GrupoConjuros, lanzadoras: string[], razas: Razas | null): Atributo | '' {
  switch (g.tipo) {
    case 'clase': case 'lista': case 'invocacion': return CARACTERISTICA_CONJUROS[g.clase ?? ''] ?? '';
    case 'raza': return atributoLanzador(p, lanzadoras) || atributoDeRasgo(textoRasgo(p, razas, g.rasgo ?? '')) || mejorMental(p);
    default: return atributoLanzador(p, lanzadoras) || mejorMental(p);
  }
}

/** Característica del grupo: la elegida a mano o la automática. La de la clase principal se guarda en `conjuroCaracteristica` (como antes). */
export function atributoGrupo(p: Personaje, g: GrupoConjuros, lanzadoras: string[], razas: Razas | null): Atributo | '' {
  const mano = g.tipo === 'clase' && g.clase === p.clase ? p.conjuroCaracteristica : p.caracteristicaGrupos?.[g.id];
  return mano || atributoAuto(p, g, lanzadoras, razas);
}
export function fijarAtributoGrupo(x: Personaje, g: GrupoConjuros, a: Atributo | '') {
  if (g.tipo === 'clase' && g.clase === x.clase) { x.conjuroCaracteristica = a; return; }
  const m = { ...(x.caracteristicaGrupos ?? {}) };
  if (a) m[g.id] = a; else delete m[g.id];
  x.caracteristicaGrupos = m;
}

export const cdCon = (p: Personaje, a: Atributo | '') => (a ? 8 + bonoCompetencia(nivelTotal(p)) + modificador(car(p, a)) + bonoCdConjuro(p) : null);
export const ataqueCon = (p: Personaje, a: Atributo | '') => (a ? bonoCompetencia(nivelTotal(p)) + modificador(car(p, a)) + bonoAtaqueConjuro(p) : null);

const ORDEN: TipoGrupo[] = ['raza', 'dote', 'invocacion', 'lista', 'otros'];
/** Grupos de «Otros conjuros» que tienen algún conjuro, en orden: raciales, dotes, invocaciones, listas de clase, sin grupo. */
export function gruposOtros(p: Personaje): { g: GrupoConjuros; idx: number[] }[] {
  const mapa = new Map<string, { g: GrupoConjuros; idx: number[] }>();
  p.conjuros.forEach((c, i) => {
    if (!c.adicional) return;
    const g = grupoDe(p, c);
    if (!mapa.has(g.id)) mapa.set(g.id, { g, idx: [] });
    mapa.get(g.id)!.idx.push(i);
  });
  return [...mapa.values()].sort((a, b) => ORDEN.indexOf(a.g.tipo) - ORDEN.indexOf(b.g.tipo) || a.g.id.localeCompare(b.g.id));
}
