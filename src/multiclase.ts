import type { Atributo, NivelClase, Personaje } from './types';
import type { Clase } from './data';
import { L, T, RU_ATRIBUTOS, RU_CLASES } from './i18n';

/**
 * Multiclase (D&D 2024). `p.nivel` es el nivel del personaje (bonificador por competencia, trucos, rasgos de raza);
 * cada clase tiene el suyo para su tabla, rasgos, recursos y conjuros. La principal es `p.clase`, las demás `p.multiclase`.
 */

/** Nivel total del personaje (también dentro de una vista por clase). */
export const nivelTotal = (p: Personaje) => p.nivelPersonaje ?? p.nivel;

/** Todas las clases del personaje con su nivel, la principal primero. */
export function clasesDe(p: Personaje): NivelClase[] {
  if (p.nivelPersonaje !== undefined || !p.multiclase?.length) return p.clase ? [{ clase: p.clase, subclase: p.subclase, nivel: p.nivel }] : [];
  const otras = p.multiclase.filter((m) => m.clase && m.nivel > 0);
  const principal = Math.max(1, p.nivel - otras.reduce((s, m) => s + m.nivel, 0));
  return [{ clase: p.clase, subclase: p.subclase, nivel: principal }, ...otras];
}

export const esMulticlase = (p: Personaje) => clasesDe(p).length > 1;

/** Nivel en una clase concreta (0 si no la tiene). */
export const nivelEn = (p: Personaje, clase: string) => clasesDe(p).find((c) => c.clase === clase)?.nivel ?? 0;

/**
 * El personaje «visto» como si solo tuviera esa clase a ese nivel: sirve para reutilizar los cálculos de una clase
 * (recursos, rasgos, potenciadores…). El bonificador por competencia sigue saliendo del nivel total.
 */
export function vistaClase(p: Personaje, c: NivelClase): Personaje {
  return { ...p, clase: c.clase, subclase: c.subclase, nivel: c.nivel, nivelPersonaje: nivelTotal(p), multiclase: [] };
}
export const vistas = (p: Personaje) => clasesDe(p).map((c) => vistaClase(p, c));

/** «Pícaro 3 / Guerrero 2» (o solo «Pícaro 5»). */
export const textoClases = (p: Personaje) => clasesDe(p).map((c) => `${T(RU_CLASES, c.clase)} ${c.nivel}`).join(' / ');

/** Requisito para entrar o salir de una clase en multiclase: 13 en su característica principal. */
export const REQUISITO: Record<string, { atr: Atributo[]; alguna?: boolean }> = {
  'Bárbaro': { atr: ['FUE'] }, 'Bardo': { atr: ['CAR'] }, 'Brujo': { atr: ['CAR'] }, 'Clérigo': { atr: ['SAB'] },
  'Druida': { atr: ['SAB'] }, 'Explorador': { atr: ['DES', 'SAB'] }, 'Guerrero': { atr: ['FUE', 'DES'], alguna: true },
  'Hechicero': { atr: ['CAR'] }, 'Mago': { atr: ['INT'] }, 'Monje': { atr: ['DES', 'SAB'] }, 'Paladín': { atr: ['FUE', 'CAR'] }, 'Pícaro': { atr: ['DES'] },
};
export function cumpleRequisito(clase: string, valor: (a: Atributo) => number): boolean {
  const r = REQUISITO[clase];
  if (!r) return true;
  return r.alguna ? r.atr.some((a) => valor(a) >= 13) : r.atr.every((a) => valor(a) >= 13);
}
export const textoRequisito = (clase: string) => {
  const r = REQUISITO[clase];
  return r ? r.atr.map((a) => T(RU_ATRIBUTOS, a)).join(r.alguna ? L(' o ', ' или ') : L(' y ', ' и ')) + ' 13+' : '';
};

/** Lo que se gana al entrar en una clase por multiclase (PHB 2024: competencias parciales). */
export const GANAS_MULTICLASE: Record<string, [string, string]> = {
  'Bárbaro': ['Escudos, armas marciales.', 'Щиты, воинское оружие.'],
  'Bardo': ['Armadura ligera, 1 habilidad, 1 instrumento musical.', 'Лёгкие доспехи, 1 навык, 1 музыкальный инструмент.'],
  'Brujo': ['Armadura ligera.', 'Лёгкие доспехи.'],
  'Clérigo': ['Armadura ligera y media, escudos.', 'Лёгкие и средние доспехи, щиты.'],
  'Druida': ['Armadura ligera, escudos.', 'Лёгкие доспехи, щиты.'],
  'Explorador': ['Armadura ligera y media, escudos, armas marciales, 1 habilidad de la lista del explorador.', 'Лёгкие и средние доспехи, щиты, воинское оружие, 1 навык следопыта.'],
  'Guerrero': ['Armadura ligera y media, escudos, armas marciales.', 'Лёгкие и средние доспехи, щиты, воинское оружие.'],
  'Hechicero': ['Nada extra.', 'Ничего дополнительно.'],
  'Mago': ['Nada extra.', 'Ничего дополнительно.'],
  'Monje': ['Nada extra.', 'Ничего дополнительно.'],
  'Paladín': ['Armadura ligera y media, escudos, armas marciales.', 'Лёгкие и средние доспехи, щиты, воинское оружие.'],
  'Pícaro': ['Armadura ligera, 1 habilidad de la lista del pícaro, herramientas de ladrón.', 'Лёгкие доспехи, 1 навык плута, воровские инструменты.'],
};
/** Habilidades que da una clase al entrar por multiclase. */
export const HABILIDADES_MULTICLASE: Record<string, number> = { 'Bardo': 1, 'Explorador': 1, 'Pícaro': 1 };

/** Sube un nivel en una clase (la principal, una que ya tienes o una nueva). `p.nivel` ya debe incluir la subida. */
export function asignarNivel(p: Personaje, clase: string) {
  if (!clase || clase === p.clase) return;
  p.multiclase = [...(p.multiclase ?? [])];
  const m = p.multiclase.find((x) => x.clase === clase);
  if (m) m.nivel += 1; else p.multiclase.push({ clase, subclase: '', nivel: 1 });
}

/** Si baja el nivel total, se quitan niveles de las otras clases (de la última a la primera) para que la principal tenga al menos 1. */
export function ajustarMulticlase(p: Personaje) {
  if (!p.multiclase?.length) return;
  let sobra = p.multiclase.reduce((s, m) => s + m.nivel, 0) - (p.nivel - 1);
  for (let i = p.multiclase.length - 1; i >= 0 && sobra > 0; i--) {
    const q = Math.min(sobra, p.multiclase[i].nivel);
    p.multiclase[i].nivel -= q; sobra -= q;
  }
  p.multiclase = p.multiclase.filter((m) => m.nivel > 0);
}

// ---------------------------------------------------------------- Maná con varias clases lanzadoras
/** Cuánto cuenta cada clase para el nivel de lanzador conjunto (PHB 2024). */
export const PESO_LANZADOR: Record<string, number> = { 'Bardo': 1, 'Clérigo': 1, 'Druida': 1, 'Hechicero': 1, 'Mago': 1, 'Paladín': 0.5, 'Explorador': 0.5 };
export const SUBCLASE_TERCIO = ['Embaucador arcano', 'Caballero arcano'];
/** Nivel de lanzador conjunto: completo + mitad (redondeando arriba) + tercio (abajo). El Brujo va aparte (magia de pacto). */
export function nivelLanzador(p: Personaje): number {
  let n = 0;
  for (const c of clasesDe(p)) {
    const w = PESO_LANZADOR[c.clase];
    if (w === 1) n += c.nivel;
    else if (w === 0.5) n += Math.ceil(c.nivel / 2);
    else if (SUBCLASE_TERCIO.includes(c.subclase)) n += Math.floor(c.nivel / 3);
  }
  return n;
}

// ---------------------------------------------------------------- Datos de las clases
/** La ficha carga las clases y las deja aquí para que los cálculos encuentren las tablas de las otras clases. */
let CLASES: Clase[] | null = null;
export const fijarClases = (c: Clase[] | null) => { if (c) CLASES = c; };
export const datosClase = (nombre: string, preferida?: Clase | null): Clase | null =>
  (preferida?.nombre === nombre ? preferida : null) ?? CLASES?.find((c) => c.nombre === nombre) ?? null;

/** Dotes que dan las tablas de clase («Mejora de característica», «Don épico»), sumando cada clase a su nivel. */
export const dotesDeClases = (p: Personaje, clase: Clase | null | undefined) =>
  clasesDe(p).reduce((s, c) => s + (datosClase(c.clase, clase)?.tabla.filter((r) => r.nivel <= c.nivel && /Mejora de característica|Don épico/.test(r.rasgos)).length ?? 0), 0);

/** Para listas y la partida (sin traducir): «Pícaro» o «Pícaro / Guerrero». */
export const textoClasesBreve = (p: Personaje) => (p.multiclase?.length ? [p.clase, ...p.multiclase.map((m) => m.clase)].join(' / ') : p.clase);
