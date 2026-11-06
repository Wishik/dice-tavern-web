import type { Clase, Raza, Razas, Trasfondo } from './data';
import type { Personaje } from './types';
import { HUECOS_IDIOMAS, HUECOS_OFICIOS, HUECOS_PROFESIONES, huecosVacios } from './rules';

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
  limiteTrucos: number | null;
  limiteConjuros: number | null;
  /** El libro (Mago «6+») puede tener más conjuros que el número de la tabla. */
  conjurosAbierto: boolean;
  limitePreparados: number | null;
  nivelMaxConjuro: number | null;
  total: { general: number; habilidades: number; magia: number; rasgos: number };
}

export const buscarClase = (clases: Clase[] | null, nombre: string) => clases?.find((c) => c.nombre === nombre) ?? null;
export const buscarRaza = (razas: Razas | null, nombre: string): Raza | null => razas?.razas.find((r) => r.nombre === nombre) ?? null;

const num = (v: unknown) => { const n = parseInt(String(v ?? ''), 10); return isNaN(n) ? null : n; };

export function filaClase(c: Clase | null, nivel: number) {
  return c?.tabla.find((f) => f.nivel === nivel) ?? null;
}

export function calcularAvisos(p: Personaje, clases: Clase[] | null, razas: Razas | null, trasfondos: Trasfondo[] | null): Avisos {
  const c = buscarClase(clases, p.clase);
  const f = filaClase(c, p.nivel);
  const sub = SUBCLASES_MAGICAS[p.subclase]?.[p.nivel - 1];
  const limiteTrucos = f && 'Trucos' in f ? num(f['Trucos']) : sub ? sub[0] : null;
  const limiteConjuros = f && 'Conjuros conocidos' in f ? num(f['Conjuros conocidos']) : sub ? sub[1] : null;
  const conjurosAbierto = !!f && /\+/.test(String(f['Conjuros conocidos'] ?? ''));
  const limitePreparados = f && 'Conjuros preparados' in f ? num(f['Conjuros preparados']) : limiteConjuros;
  const nivelMaxConjuro = f && 'Nivel máximo de conjuro' in f ? num(f['Nivel máximo de conjuro']) : sub ? sub[2] : null;
  // Los conjuros adicionales (raza, dote, objeto…) no cuentan para el límite de la clase.
  const nTrucos = p.conjuros.filter((x) => x.nivel === 0 && !x.adicional).length;
  const nConj = p.conjuros.filter((x) => x.nivel > 0 && !x.adicional).length;
  const trucos = limiteTrucos ? Math.max(0, limiteTrucos - nTrucos) : 0;
  const conjuros = limiteConjuros ? Math.max(0, limiteConjuros - nConj) : 0;

  // Dotes: 1 de origen por trasfondo + una por cada "Mejora de característica"/"Don épico" alcanzado.
  let dotesEsperadas = p.trasfondoEstilo ? 1 : 0;
  if (c) dotesEsperadas += c.tabla.filter((r) => r.nivel <= p.nivel && /Mejora de característica|Don épico/.test(r.rasgos)).length;
  const dotes = Math.max(0, dotesEsperadas - p.dotes.length);

  const raza = buscarRaza(razas, p.raza);
  const rasgosRaza = raza ? Math.max(0, raza.rasgosAElegir - p.rasgosRaza.length) : 0;

  let habilidadesEsperadas = 0;
  if (c) habilidadesEsperadas += c.atributos.habilidadesN;
  const t = trasfondos?.find((x) => x.nombre === p.trasfondoEstilo);
  if (t) habilidadesEsperadas += t.habilidades.length;
  const nComp = Object.values(p.habilidades).filter((h) => h.comp).length;
  const habilidades = Math.max(0, habilidadesEsperadas - nComp);

  const idiomas = huecosVacios(p, HUECOS_IDIOMAS, p.idiomas);
  const oficios = huecosVacios(p, HUECOS_OFICIOS, p.oficios);
  const profesiones = huecosVacios(p, HUECOS_PROFESIONES, p.profesiones);
  const subclase = !!c && p.nivel >= 3 && !p.subclase;

  return {
    trucos, conjuros, dotes, rasgosRaza, habilidades, idiomas, oficios, profesiones, subclase,
    limiteTrucos, limiteConjuros, conjurosAbierto, limitePreparados, nivelMaxConjuro,
    total: {
      general: idiomas + oficios + profesiones + (subclase ? 1 : 0),
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
  const f = filaClase(buscarClase(clases, p.clase), p.nivel);
  let m = f && 'Maná' in f ? num(f['Maná']) ?? 0 : SUBCLASES_MAGICAS[p.subclase] ? MANA_ARCANO[p.nivel - 1] ?? 0 : 0;
  if (p.rasgosRaza.includes('Despertar Interior') && m > 0) m += p.nivel;
  return m;
}
