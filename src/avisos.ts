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
  const limiteTrucos = f && 'Trucos' in f ? num(f['Trucos']) : null;
  const limiteConjuros = f && 'Conjuros conocidos' in f ? num(f['Conjuros conocidos']) : null;
  const nivelMaxConjuro = f && 'Nivel máximo de conjuro' in f ? num(f['Nivel máximo de conjuro']) : null;
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
    limiteTrucos, limiteConjuros, nivelMaxConjuro,
    total: {
      general: idiomas + oficios + profesiones + (subclase ? 1 : 0),
      habilidades,
      magia: trucos + conjuros,
      rasgos: dotes + rasgosRaza,
    },
  };
}
