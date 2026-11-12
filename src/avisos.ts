import { nivelEn } from './multiclase';
import { eleccionesDe, eleccionesPendientes, esDoteDeEstilo, trucoExtraOrden } from './elecciones';
import { limitesHabilidades } from './limitesHabilidades';
import type { Clase, Raza, Razas, Trasfondo } from './data';
import type { Personaje } from './types';
import { HUECOS_IDIOMAS, HUECOS_OFICIOS, HUECOS_PROFESIONES, huecosVacios } from './rules';
import { PESO_LANZADOR, clasesDe, dotesDeClases, nivelLanzador } from './multiclase';

/** Avisos "puedes añadir": cuántas cosas te faltan según las reglas. Nunca bloquean añadir más. */
export interface Avisos {
  trucos: number;
  conjuros: number;
  dotes: number;
  rasgosRaza: number;
  habilidades: number;
  idiomas: number;
  oficios: number;
  profesiones: number;
  subclase: boolean;
  /** Cosas por elegir de raza, clase y dotes (instrumentos, Orden divina, maestría…). */
  elecciones: number;
  limiteTrucos: number | null;
  limiteConjuros: number | null;
  /** El libro (Mago «6+») puede tener más conjuros que el número de la tabla. */
  conjurosAbierto: boolean;
  limitePreparados: number | null;
  nivelMaxConjuro: number | null;
  /** Límites de magia por clase (una entrada por clase; la principal primero). */
  magia: MagiaClase[];
  total: { general: number; habilidades: number; magia: number; rasgos: number };
  /** Conjuros de raza/dote por elegir (lo calcula la ficha). */
  conjurosElegir?: number;
}

export const buscarClase = (clases: Clase[] | null, nombre: string) => clases?.find((c) => c.nombre === nombre) ?? null;
export const buscarRaza = (razas: Razas | null, nombre: string): Raza | null => razas?.razas.find((r) => r.nombre === nombre) ?? null;

const num = (v: unknown) => { const n = parseInt(String(v ?? ''), 10); return isNaN(n) ? null : n; };

export function filaClase(c: Clase | null, nivel: number) {
  return c?.tabla.find((f) => f.nivel === nivel) ?? null;
}

/** Límites de magia de UNA clase a su nivel. */
export interface MagiaClase {
  clase: string; nivel: number;
  limiteTrucos: number | null; limiteConjuros: number | null; conjurosAbierto: boolean; limitePreparados: number | null; nivelMaxConjuro: number | null;
  nTrucos: number; nConj: number; nPrep: number;
}

/** Conjuros de clase (no adicionales) aprendidos por esa clase; los antiguos sin clase son de la principal. */
export const claseDeConjuro = (p: Personaje, x: { clase?: string }) => (x.clase && clasesDe(p).some((c) => c.clase === x.clase) ? x.clase : p.clase);
export const conjurosDeClase = (p: Personaje, clase: string) => p.conjuros.filter((x) => !x.adicional && claseDeConjuro(p, x) === clase);

function magiaClase(p: Personaje, c: { clase: string; subclase: string; nivel: number }, datos: Clase | null): MagiaClase {
  const f = filaClase(datos, c.nivel);
  const sub = SUBCLASES_MAGICAS[c.subclase]?.[c.nivel - 1];
  const lt = f && 'Trucos' in f ? num(f['Trucos']) : sub ? sub[0] : null;
  const limiteTrucos = lt === null ? null : lt + trucoExtraOrden(p, c.clase);
  const limiteConjuros = f && 'Conjuros conocidos' in f ? num(f['Conjuros conocidos']) : sub ? sub[1] : null;
  const propios = conjurosDeClase(p, c.clase);
  return {
    clase: c.clase, nivel: c.nivel, limiteTrucos, limiteConjuros,
    conjurosAbierto: !!f && /\+/.test(String(f['Conjuros conocidos'] ?? '')),
    limitePreparados: f && 'Conjuros preparados' in f ? num(f['Conjuros preparados']) : limiteConjuros,
    nivelMaxConjuro: f && 'Nivel máximo de conjuro' in f ? num(f['Nivel máximo de conjuro']) : sub ? sub[2] : null,
    nTrucos: propios.filter((x) => x.nivel === 0).length, nConj: propios.filter((x) => x.nivel > 0).length, nPrep: propios.filter((x) => x.nivel > 0 && x.preparado).length,
  };
}

export function calcularAvisos(p: Personaje, clases: Clase[] | null, razas: Razas | null, trasfondos: Trasfondo[] | null): Avisos {
  const c = buscarClase(clases, p.clase);
  const todas = clasesDe(p);
  // Magia: cada clase con sus límites (multiclase). Los adicionales (raza, dote, objeto…) no cuentan.
  const magia = todas.map((x) => magiaClase(p, x, buscarClase(clases, x.clase)));
  const m0 = magia[0];
  const trucos = magia.reduce((s, m) => s + (m.limiteTrucos ? Math.max(0, m.limiteTrucos - m.nTrucos) : 0), 0);
  const conjuros = magia.reduce((s, m) => s + (m.limiteConjuros ? Math.max(0, m.limiteConjuros - m.nConj) : 0), 0);

  // Dotes: 1 de origen por trasfondo + una por cada "Mejora de característica"/"Don épico" alcanzado en cada clase.
  const dotesEsperadas = (p.trasfondoEstilo ? 1 : 0) + dotesDeClases(p, c)
    + (nivelEn(p, 'Brujo') && p.elecciones?.['Brujo:invocaciones']?.includes('Lecciones de los primeros') ? 1 : 0);
  const dotes = Math.max(0, dotesEsperadas - p.dotes.filter((d) => !esDoteDeEstilo(d)).length);

  const raza = buscarRaza(razas, p.raza);
  const rasgosRaza = raza ? Math.max(0, raza.rasgosAElegir - p.rasgosRaza.length) : 0;

  const habilidadesEsperadas = c ? limitesHabilidades(p, c, trasfondos ?? null).comp : (trasfondos?.find((x) => x.nombre === p.trasfondoEstilo)?.habilidades.length ?? 0);
  const nComp = Object.values(p.habilidades).filter((h) => h.comp).length;
  const habilidades = Math.max(0, habilidadesEsperadas - nComp);

  const idiomas = huecosVacios(p, HUECOS_IDIOMAS, p.idiomas);
  const oficios = huecosVacios(p, HUECOS_OFICIOS, p.oficios);
  const profesiones = huecosVacios(p, HUECOS_PROFESIONES, p.profesiones);
  const elecciones = eleccionesPendientes(p, eleccionesDe(p, clases, raza));
  const subclase = todas.some((x) => x.nivel >= 3 && !x.subclase && !!buscarClase(clases, x.clase));

  return {
    trucos, conjuros, dotes, rasgosRaza, habilidades, idiomas, oficios, profesiones, subclase, elecciones, magia,
    limiteTrucos: m0?.limiteTrucos ?? null, limiteConjuros: m0?.limiteConjuros ?? null, conjurosAbierto: m0?.conjurosAbierto ?? false,
    limitePreparados: m0?.limitePreparados ?? null, nivelMaxConjuro: m0?.nivelMaxConjuro ?? null,
    total: {
      general: idiomas + oficios + profesiones + (subclase ? 1 : 0) + elecciones,
      habilidades,
      magia: trucos + conjuros,
      rasgos: dotes + rasgosRaza,
    },
  };
}

/** Tablas de «Lanzamiento de conjuros» del Embaucador arcano y del Caballero arcano (manual): [trucos, conjuros conocidos, nivel máx.] por nivel. */
const T = (trucos3: number, trucos10: number) => Array.from({ length: 20 }, (_, i) => {
  const n = i + 1;
  if (n < 3) return [0, 0, 0] as [number, number, number];
  const conocidos = [0, 0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13][n];
  const max = n >= 19 ? 4 : n >= 13 ? 3 : n >= 7 ? 2 : 1;
  return [n >= 10 ? trucos10 : trucos3, conocidos, max] as [number, number, number];
});
export const SUBCLASES_MAGICAS: Record<string, [number, number, number][]> = {
  'Embaucador arcano': T(3, 4),
  'Caballero arcano': T(2, 3),
};

const MANA_ARCANO = [0, 0, 2, 3, 3, 3, 8, 8, 8, 10, 10, 10, 16, 16, 16, 19, 19, 19, 23, 23];
/** Maná máximo: columna «Maná» de la tabla de la clase (o del Embaucador/Caballero arcano) + Despertar Interior (+1 por nivel). */
export function manaMaximo(p: Personaje, clases: Clase[] | null): number {
  const manaDe = (clase: string, subclase: string, nivel: number) => {
    const f = filaClase(buscarClase(clases, clase), nivel);
    return f && 'Maná' in f ? num(f['Maná']) ?? 0 : SUBCLASES_MAGICAS[subclase] ? MANA_ARCANO[nivel - 1] ?? 0 : 0;
  };
  const conMana = clasesDe(p).filter((c) => manaDe(c.clase, c.subclase, c.nivel) > 0);
  let m: number;
  if (conMana.length <= 1) m = conMana[0] ? manaDe(conMana[0].clase, conMana[0].subclase, conMana[0].nivel) : 0;
  else if (MODO_MANA === 'sumar') m = conMana.reduce((s, c) => s + manaDe(c.clase, c.subclase, c.nivel), 0);
  else if (MODO_MANA === 'principal') m = manaDe(p.clase, p.subclase, clasesDe(p)[0].nivel);
  else {
    // Como los espacios de conjuro del manual: nivel de lanzador conjunto en la tabla de un lanzador completo; el Brujo suma aparte.
    const brujo = conMana.find((c) => c.clase === 'Brujo');
    const n = nivelLanzador(p);
    m = (n > 0 ? manaDe('Mago', '', Math.min(20, n)) : 0) + (brujo ? manaDe('Brujo', '', brujo.nivel) : 0);
    if (!conMana.some((c) => PESO_LANZADOR[c.clase] || SUBCLASES_MAGICAS[c.subclase])) m = conMana.reduce((s, c) => s + manaDe(c.clase, c.subclase, c.nivel), 0);
  }
  if (p.rasgosRaza.includes('Despertar Interior') && m > 0) m += p.nivel;
  return m;
}

/** Cómo se junta el maná de varias clases lanzadoras: 'conjunto' (como el manual), 'sumar' o 'principal'. */
export const MODO_MANA: 'conjunto' | 'sumar' | 'principal' = 'conjunto';
