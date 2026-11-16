import { L } from './i18n';
import type { Atributo, Personaje } from './types';
import { RASGOS_FIJOS } from './fijos';
import { dadosEquipo, sumaEquipo } from './bonosObjetos';
import { nivelEn } from './multiclase';

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
  /** Ventaja siempre (sin condiciones) en salvaciones de esas características o en esas habilidades. */
  ventaja?: { salv?: Atributo[]; hab?: string[] };
  /** Dados que se suman a la tirada: clave 'hab:percepcion', 'salv:DES'… (p. ej. +1d4 de Intuición salvaje). */
  dados?: Record<string, string>;
  /** Velocidades especiales (pies). */
  trepar?: number;
  nadar?: number;
  volar?: number;
  /** Ventaja siempre en iniciativa (Instinto salvaje). */
  ventajaIniciativa?: boolean;
}

/** Velocidad trepando/nadando «igual a tu velocidad» (Errante). */
export const IGUAL_VELOCIDAD = -1;
/** Armadura que llevas puesta: ligera, media o pesada (por su fórmula de CA), o null. */
export function tipoArmadura(p: Personaje): 'ligera' | 'media' | 'pesada' | null {
  const arm = Object.values(p.equipo ?? {}).find((it) => it && it.tipo === 'armadura' && /^\d+/.test(it.detalles?.['Clase de armadura'] ?? ''));
  if (!arm) return null;
  const f = arm.detalles!['Clase de armadura'];
  return /m[aá]x/i.test(f) ? 'media' : /destreza/i.test(f) ? 'ligera' : 'pesada';
}
export const llevaEscudo = (p: Personaje) => [p.equipo?.manoHabil, p.equipo?.manoTorpe].some((it) => it?.tipo === 'escudo');
const VEL_MONJE = [0, 0, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 25, 25, 25, 25, 30, 30, 30];

/** Rasgos de clase que se suman solos según el nivel (velocidad, ventajas…). */
function bonosClase(p: Personaje): BonoActivo[] {
  const out: BonoActivo[] = [];
  const arm = tipoArmadura(p);
  const bar = nivelEn(p, 'Bárbaro'), exp = nivelEn(p, 'Explorador'), monje = nivelEn(p, 'Monje');
  if (bar >= 2) out.push({ origen: L('Sentido del peligro', 'Чувство опасности'), b: { ventaja: { salv: ['DES'] } } });
  if (bar >= 5 && arm !== 'pesada') out.push({ origen: L('Movimiento rápido', 'Быстрое передвижение'), b: { velocidad: 10 } });
  if (bar >= 7) out.push({ origen: L('Instinto salvaje', 'Дикий инстинкт'), b: { ventajaIniciativa: true } });
  if (exp >= 6 && arm !== 'pesada') out.push({ origen: L('Errante', 'Странник'), b: { velocidad: 10, trepar: IGUAL_VELOCIDAD, nadar: IGUAL_VELOCIDAD } });
  if (monje >= 2 && !arm && !llevaEscudo(p)) out.push({ origen: L('Movimiento sin armadura', 'Движение без доспехов'), b: { velocidad: VEL_MONJE[Math.min(20, monje)] } });
  return out;
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
  'Agilidad Mental': { ventaja: { salv: ['SAB'] } },
  'Reflejos Felinos': { ventaja: { salv: ['DES'], hab: ['acrobacias'] } },
  'Orco:Presencia Aterradora': { ventaja: { hab: ['intimidacion'] } },
  'Semiorco:Presencia Aterradora': { ventaja: { hab: ['intimidacion'] } },
  'Intuición salvaje': { dados: { 'hab:perspicacia': '1d4', 'hab:percepcion': '1d4' } },
  'Trepadores': { trepar: 30 },
  'Reptilianos:Anfibio': { nadar: 30 },
  'Taratuga:Anfibio': { nadar: 30 },
  'Avianthar:Alas': { volar: 30 },
  'Diablillo:Alas': { volar: 30 },
  // Dotes
  'Defensa': { ca: 1, conArmadura: true },
  'Tiro con arco': { ataqueDistancia: 2 },
  'Veloz': { velocidad: 10 },
  'Don de la velocidad': { velocidad: 30 },
  'Atleta': { trepar: IGUAL_VELOCIDAD },
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
  // Orden divina «Taumaturgo» / Orden primigenia «Mago»: + mod. de Sabiduría (mín. +1) a dos habilidades.
  const sab = Math.max(1, Math.floor(((p.caracteristicas?.SAB ?? 10) - 10) / 2));
  const tiene = (c: string) => p.clase === c || !!p.multiclase?.some((m) => m.clase === c && m.nivel > 0);
  if (tiene('Clérigo') && p.elecciones?.['Clérigo:orden']?.[0] === 'Taumaturgo') out.push({ origen: 'Taumaturgo', b: { habilidad: { arcano: sab, religion: sab } } });
  if (tiene('Druida') && p.elecciones?.['Druida:orden']?.[0] === 'Mago') out.push({ origen: L('Mago (Orden primigenia)', 'Маг (Первородный орден)'), b: { habilidad: { arcano: sab, naturaleza: sab } } });
  out.push(...bonosClase(p));
  return out;
}

const sumar = (lista: BonoActivo[], f: (b: Bono) => number | undefined) =>
  lista.reduce((s, x) => s + (f(x.b) ?? 0), 0);
const origenes = (lista: BonoActivo[], f: (b: Bono) => number | undefined) =>
  lista.filter((x) => f(x.b)).map((x) => `${x.origen} ${(f(x.b)! > 0 ? '+' : '')}${f(x.b)}`);

/** Una línea por rasgo o dote que da algo (para el desglose). */
export const lineasBonos = (p: Personaje, f: (b: Bono) => number | undefined) =>
  bonosActivos(p).filter((x) => f(x.b)).map((x) => ({ texto: x.origen, valor: f(x.b)! }));

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
export const bonoVelocidad = (p: Personaje) => sumar(bonosActivos(p), (b) => b.velocidad) + sumaEquipo(p, 'velocidad');
export const bonoFuerzaCarga = (p: Personaje) => sumar(bonosActivos(p), (b) => b.fuerzaCarga);
export const bonoAtaqueConjuro = (p: Personaje) => sumar(bonosActivos(p), (b) => b.ataqueConjuro) + sumaEquipo(p, 'ataqueConjuro');
export const bonoCdConjuro = (p: Personaje) => sumar(bonosActivos(p), (b) => b.cdConjuro) + sumaEquipo(p, 'cdConjuro');
export const bonoAtaqueArma = (p: Personaje, distancia: boolean) => sumar(bonosActivos(p), (b) => distancia ? b.ataqueDistancia : b.ataqueCaC);
export function bonosCA(p: Personaje, conArmadura: boolean): { total: number; menosDes: number; partes: string[]; lineas: { texto: string; valor: number }[] } {
  const l = bonosActivos(p).filter((x) => !x.b.conArmadura || conArmadura);
  return { total: sumar(l, (b) => b.ca), menosDes: sumar(l, (b) => b.caMenosDes), partes: origenes(l, (b) => b.ca), lineas: l.filter((x) => x.b.ca).map((x) => ({ texto: x.origen, valor: x.b.ca! })) };
}
export const origenesTexto = origenes;

/** Dados que se suman a una tirada: los de los objetos equipados y los de los rasgos (Intuición salvaje…). */
export const dadosEn = (p: Personaje, donde: string) => [...dadosEquipo(p, donde), ...bonosActivos(p).map((x) => x.b.dados?.[donde]).filter(Boolean) as string[]];
/** «Ventaja (Reflejos Felinos)»: rasgos que dan ventaja siempre en esta tirada. */
export function ventajasRasgos(p: Personaje, tipo: 'salvacion' | 'habilidad', atr: Atributo | null, hab?: string): string[] {
  return bonosActivos(p).filter(({ b }) => (tipo === 'salvacion' && atr && b.ventaja?.salv?.includes(atr)) || (tipo === 'habilidad' && hab && b.ventaja?.hab?.includes(hab))).map((x) => x.origen);
}
/** Velocidad de trepar, nadar o volar que da un rasgo (0 si ninguno). */
export function velocidadRasgo(p: Personaje, k: 'trepar' | 'nadar' | 'volar'): { pies: number; origen: string } | null {
  const l = bonosActivos(p).filter(({ b }) => b[k]);
  if (!l.length) return null;
  const pies = (v: number) => (v === IGUAL_VELOCIDAD ? (p.velocidad?.andando ?? 30) + bonoVelocidad(p) : v);
  const x = l.reduce((m, y) => (pies(y.b[k]!) > pies(m.b[k]!) ? y : m));
  return { pies: pies(x.b[k]!), origen: x.origen };
}
/** Rasgos que dan ventaja siempre en la iniciativa. */
export const ventajaIniciativa = (p: Personaje) => bonosActivos(p).filter((x) => x.b.ventajaIniciativa).map((x) => x.origen);
