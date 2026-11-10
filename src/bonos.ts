import { L } from './i18n';
import type { Atributo, Personaje } from './types';
import { RASGOS_FIJOS } from './fijos';

/**
 * Bonificadores fijos que dan rasgos de raza, rasgos genéricos y dotes, y que se pueden sumar solos.
 * Solo los que siempre aplican: los condicionales («contra gigantes», «1 vez por descanso»…) no se suman.
 */
export interface Bono {
  ca?: number;
  /** CA: resta al bonificador de Destreza (Caparazón de las Taratugas). */
  caMenosDes?: number;
  /** Solo con armadura puesta (dote Defensa). */
  conArmadura?: boolean;
  habilidad?: Record<string, number>;
  /** Competencia automática; si ya la tenías marcada, +2 (texto: «si ya eres competente por clase, +2»). */
  competencia?: string[];
  competenciaO2?: boolean;
  prueba?: Partial<Record<Atributo, number>>;
  salvacion?: Partial<Record<Atributo, number>>;
  ataqueCaC?: number;
  ataqueDistancia?: number;
  ataqueConjuro?: number;
  cdConjuro?: number;
  velocidad?: number;
  fuerzaCarga?: number;
  /** Nota que se muestra al tirar (dados extra, etc.). */
  nota?: Record<string, string>;
}

const PEQUENOS: Bono = { ca: 1, habilidad: { sigilo: 2 } };
/** Clave: nombre del rasgo o dote; «Raza:Rasgo» cuando el mismo nombre hace cosas distintas según la raza. */
export const BONOS: Record<string, Bono> = {
  'Defensa de los pequeños': PEQUENOS,
  'Escamas reforzadas': { ca: 1 },
  'Piel escamosa': { ca: 1 },
  'Piel escamada': { ca: 1 },
  'Cuerpo Quitonoso': { ca: 1 },
  'Corteza Gruesa': { ca: 1 },
  'Caparazón': { ca: 2, caMenosDes: 1 },
  'Camuflaje': { competencia: ['sigilo'] },
  'Sentidos arácnidos': { competencia: ['percepcion'] },
  'Vista de Halcón': { competencia: ['percepcion'] },
  'Presencia aterradora': { competencia: ['intimidacion'], habilidad: { intimidacion: 2 } },
  'Sentidos Élficos': { competencia: ['percepcion'], competenciaO2: true },
  'Arcanistas': { competencia: ['arcano'], competenciaO2: true },
  'Conocimientos Naturales': { competencia: ['animales', 'naturaleza'], competenciaO2: true },
  'Elfo Oscuro (Drow):Embaucador': { competencia: ['engano'], competenciaO2: true },
  'Cazador Natural': { competencia: ['sigilo', 'percepcion', 'supervivencia'], competenciaO2: true },
  'Emboscador': { competencia: ['sigilo'], competenciaO2: true },
  'Comerciantes': { competencia: ['persuasion'], competenciaO2: true },
  'Naturaleza Engañosa': { competencia: ['persuasion', 'engano'], competenciaO2: true },
  'Cazador Invernal': { competencia: ['sigilo'], competenciaO2: true },
  'Taratuga:Instinto de Supervivencia': { competencia: ['supervivencia'], competenciaO2: true },
  'Embaucadores de bajos fondos': { competencia: ['engano', 'sigilo'], competenciaO2: true },
  'Altos Elfos:Alta Magia': { ataqueConjuro: 2 },
  'Semi-Alto elfo:Alta Magia': { ataqueConjuro: 1 },
  'Maestros conjuradores': { cdConjuro: 2 },
  'Afinidad Mágica': { ataqueConjuro: 1, cdConjuro: 1 },
  'Charr:Poderoso': { prueba: { FUE: 2 }, salvacion: { FUE: 2 } },
  'Norn:Poderoso': { prueba: { FUE: 2 } },
  'Orco:Poderoso': { prueba: { FUE: 2 } },
  'Semiorco:Poderoso': { prueba: { FUE: 2 } },
  // Rasgos genéricos
  'Asaltante Ágil': { ataqueCaC: 1 },
  'Pies Ligeros': { velocidad: 5 },
  'Curiosidad Incansable': { competencia: ['investigacion'], nota: { investigacion: '+1d4 si ya eras competente (Curiosidad Incansable)' } },
  'Ojos de Halcón': { competencia: ['percepcion'] },
  'Estudios Avanzados': { competencia: ['arcano', 'historia', 'investigacion', 'naturaleza', 'religion'], competenciaO2: true },
  'Paso Boscoso': { competencia: ['sigilo'] },
  'Kitsune:Sentidos Agudos': { competencia: ['percepcion'] },
  'Aguante Sobrehumano': { fuerzaCarga: 2 },
  // Dotes
  'Defensa': { ca: 1, conArmadura: true },
  'Tiro con arco': { ataqueDistancia: 2 },
};

export interface BonoActivo { origen: string; b: Bono }
/** Bonos de los rasgos fijos de la raza, de los rasgos elegidos y de las dotes del personaje. */
export function bonosActivos(p: Personaje): BonoActivo[] {
  const nombres = [...(RASGOS_FIJOS[p.raza] ?? []), ...p.rasgosRaza, ...p.dotes.map((d) => d.nombre)];
  const out: BonoActivo[] = [];
  for (const n of new Set(nombres)) {
    const b = BONOS[`${p.raza}:${n}`] ?? BONOS[n];
    if (b) out.push({ origen: n, b });
  }
  return out;
}

const sumar = (lista: BonoActivo[], f: (b: Bono) => number | undefined) =>
  lista.reduce((s, x) => s + (f(x.b) ?? 0), 0);
const origenes = (lista: BonoActivo[], f: (b: Bono) => number | undefined) =>
  lista.filter((x) => f(x.b)).map((x) => `${x.origen} ${(f(x.b)! > 0 ? '+' : '')}${f(x.b)}`);

export function bonoHabilidad(p: Personaje, id: string, compMarcada: boolean): { comp: boolean; bono: number; origen: string[]; notas: string[] } {
  const l = bonosActivos(p);
  let comp = false, bono = 0;
  const origen: string[] = [], notas: string[] = [];
  for (const { origen: o, b } of l) {
    if (b.competencia?.includes(id)) {
      if (compMarcada && b.competenciaO2) { bono += 2; origen.push(`${o} +2`); }
      else { comp = true; origen.push(`${o} (${L("competencia", "владение")})`); }
    }
    const h = b.habilidad?.[id]; if (h) { bono += h; origen.push(`${o} ${h > 0 ? '+' : ''}${h}`); }
    if (b.nota?.[id]) notas.push(b.nota[id]);
  }
  return { comp, bono, origen, notas };
}
export const bonoPrueba = (p: Personaje, a: Atributo) => sumar(bonosActivos(p), (b) => b.prueba?.[a]);
export const bonoSalvacion = (p: Personaje, a: Atributo) => sumar(bonosActivos(p), (b) => b.salvacion?.[a]);
export const bonoVelocidad = (p: Personaje) => sumar(bonosActivos(p), (b) => b.velocidad);
export const bonoFuerzaCarga = (p: Personaje) => sumar(bonosActivos(p), (b) => b.fuerzaCarga);
export const bonoAtaqueConjuro = (p: Personaje) => sumar(bonosActivos(p), (b) => b.ataqueConjuro);
export const bonoCdConjuro = (p: Personaje) => sumar(bonosActivos(p), (b) => b.cdConjuro);
export const bonoAtaqueArma = (p: Personaje, distancia: boolean) => sumar(bonosActivos(p), (b) => distancia ? b.ataqueDistancia : b.ataqueCaC);
export function bonosCA(p: Personaje, conArmadura: boolean): { total: number; menosDes: number; partes: string[] } {
  const l = bonosActivos(p).filter((x) => !x.b.conArmadura || conArmadura);
  return { total: sumar(l, (b) => b.ca), menosDes: sumar(l, (b) => b.caMenosDes), partes: origenes(l, (b) => b.ca) };
}
export const origenesTexto = origenes;
