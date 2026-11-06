import type { Atributo, Item, Moneda, Personaje } from './types';

export const modificador = (valor: number) => Math.floor((valor - 10) / 2);
export const conSigno = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Bonificador por competencia según nivel (1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17+: +6). */
export const bonoCompetencia = (nivel: number) => 2 + Math.floor((Math.max(1, Math.min(20, nivel)) - 1) / 4);

export interface DefHabilidad { id: string; nombre: string; atributo: Atributo; grupo: 'cognitivas' | 'fisicas' | 'sociales' }
export const HABILIDADES: DefHabilidad[] = [
  { id: 'arcano', nombre: 'C. Arcano', atributo: 'INT', grupo: 'cognitivas' },
  { id: 'historia', nombre: 'Historia', atributo: 'INT', grupo: 'cognitivas' },
  { id: 'investigacion', nombre: 'Investigación', atributo: 'INT', grupo: 'cognitivas' },
  { id: 'medicina', nombre: 'Medicina', atributo: 'SAB', grupo: 'cognitivas' },
  { id: 'naturaleza', nombre: 'Naturaleza', atributo: 'INT', grupo: 'cognitivas' },
  { id: 'religion', nombre: 'Religión', atributo: 'INT', grupo: 'cognitivas' },
  { id: 'supervivencia', nombre: 'Supervivencia', atributo: 'SAB', grupo: 'cognitivas' },
  { id: 'acrobacias', nombre: 'Acrobacias', atributo: 'DES', grupo: 'fisicas' },
  { id: 'atletismo', nombre: 'Atletismo', atributo: 'FUE', grupo: 'fisicas' },
  { id: 'juegoManos', nombre: 'Juego de manos', atributo: 'DES', grupo: 'fisicas' },
  { id: 'percepcion', nombre: 'Percepción', atributo: 'SAB', grupo: 'fisicas' },
  { id: 'sigilo', nombre: 'Sigilo', atributo: 'DES', grupo: 'fisicas' },
  { id: 'engano', nombre: 'Engaño', atributo: 'CAR', grupo: 'sociales' },
  { id: 'interpretacion', nombre: 'Interpretación', atributo: 'CAR', grupo: 'sociales' },
  { id: 'intimidacion', nombre: 'Intimidación', atributo: 'CAR', grupo: 'sociales' },
  { id: 'perspicacia', nombre: 'Perspicacia', atributo: 'SAB', grupo: 'sociales' },
  { id: 'persuasion', nombre: 'Persuasión', atributo: 'CAR', grupo: 'sociales' },
  { id: 'animales', nombre: 'T. con animales', atributo: 'SAB', grupo: 'sociales' },
];

/** Normaliza nombres de habilidad del manual ("Conocimiento arcano", "Trato con animales"...) a id. */
export function idHabilidad(nombre: string): string | undefined {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const mapa: Record<string, string> = {
    'conocimiento arcano': 'arcano', 'c. arcano': 'arcano', historia: 'historia', investigacion: 'investigacion',
    medicina: 'medicina', naturaleza: 'naturaleza', religion: 'religion', supervivencia: 'supervivencia',
    acrobacias: 'acrobacias', atletismo: 'atletismo', 'juego de manos': 'juegoManos', percepcion: 'percepcion',
    pespicacia: 'perspicacia', sigilo: 'sigilo', engano: 'engano', interpretacion: 'interpretacion', intimidacion: 'intimidacion',
    perspicacia: 'perspicacia', persuasion: 'persuasion', 'trato con animales': 'animales', 't. con animales': 'animales',
  };
  return mapa[n];
}

export function valorHabilidad(p: Personaje, id: string): number {
  const def = HABILIDADES.find((h) => h.id === id)!;
  const h = p.habilidades[id] ?? { comp: false, pericia: false, bonus: 0 };
  const bc = bonoCompetencia(p.nivel);
  return modificador(p.caracteristicas[def.atributo]) + (h.comp ? bc : 0) + (h.pericia ? bc : 0) + (h.bonus || 0);
}

export function valorSalvacion(p: Personaje, a: Atributo): number {
  const s = p.salvaciones[a];
  return modificador(p.caracteristicas[a]) + (s.comp ? bonoCompetencia(p.nivel) : 0) + (s.bonus || 0);
}

export const iniciativa = (p: Personaje) => modificador(p.caracteristicas.DES) + (p.bonusIniciativa || 0);
export const percepcionPasiva = (p: Personaje) => 10 + valorHabilidad(p, 'percepcion') + (p.bonusPercepcionPasiva || 0);

export function cdConjuros(p: Personaje): number | null {
  if (!p.conjuroCaracteristica) return null;
  return 8 + bonoCompetencia(p.nivel) + modificador(p.caracteristicas[p.conjuroCaracteristica]);
}
export function ataqueConjuros(p: Personaje): number | null {
  if (!p.conjuroCaracteristica) return null;
  return bonoCompetencia(p.nivel) + modificador(p.caracteristicas[p.conjuroCaracteristica]);
}

// ---------------------------------------------------------------- Inventario
export const MOCHILA_BASE = 7;
export const UMBRALES_FUERZA = [12, 14, 16, 18, 20];

/** Espacios extra de mochila por Fuerza: +1 por cada umbral alcanzado (12, 14, 16, 18, 20). */
export const espaciosPorFuerza = (fue: number) => UMBRALES_FUERZA.filter((u) => fue >= u).length;

/**
 * Tramos de sobrecarga, según la hoja de inventario: tras los 7 espacios base y los de Fuerza,
 * los espacios 8-13 dan -5 pies, 14-18 dan -10 pies y desventaja en TS/habilidades de FUE y DES,
 * y 19-22 dan -20 pies y desventaja en todas las tiradas de FUE y DES.
 */
export const TRAMOS_SOBRECARGA = [
  { hasta: 6, velocidad: -5, efecto: '' },
  { hasta: 11, velocidad: -10, efecto: 'Desventaja en TS y habilidades de Fuerza y Destreza' },
  { hasta: 15, velocidad: -20, efecto: 'Desventaja en todas las tiradas de Fuerza y Destreza' },
];

export const espaciosItem = (it: Item) =>
  it.maxPorEspacio && it.maxPorEspacio > 0 ? Math.max(1, Math.ceil((it.cantidad || 1) / it.maxPorEspacio)) : 1;

export const espaciosUsados = (items: Item[]) => items.reduce((s, it) => s + espaciosItem(it), 0);

export interface EstadoCarga {
  usados: number;
  libres: number; // capacidad sin penalización
  capacidad: number; // capacidad máxima absoluta
  exceso: number;
  penalizacion: number; // pies (negativo o 0)
  efecto: string;
  sobreMaximo: boolean;
}

export function estadoCarga(p: Personaje): EstadoCarga {
  const libres = MOCHILA_BASE + espaciosPorFuerza(p.caracteristicas.FUE);
  const usados = espaciosUsados(p.mochila);
  const exceso = Math.max(0, usados - libres);
  const max = TRAMOS_SOBRECARGA[TRAMOS_SOBRECARGA.length - 1].hasta;
  let penalizacion = 0, efecto = '';
  if (exceso > 0) {
    const t = TRAMOS_SOBRECARGA.find((t) => exceso <= t.hasta) ?? TRAMOS_SOBRECARGA[TRAMOS_SOBRECARGA.length - 1];
    penalizacion = t.velocidad; efecto = t.efecto;
  }
  return { usados, libres, capacidad: libres + max, exceso, penalizacion, efecto, sobreMaximo: exceso > max };
}

export const CINTURON_ESPACIOS = { pequeño: 3, mediano: 6, grande: 9 } as const;

// ---------------------------------------------------------------- Monedas
/** Valor de cada moneda en piezas de cobre. 1 PM = 100 PO, 1 PL = 7 PO, 1 PO = 5 PE = 10 PP = 100 PC. */
export const VALOR_PC: Record<Moneda, number> = { PM: 10000, PL: 700, PO: 100, PE: 20, PP: 10, PC: 1 };
export const NOMBRE_MONEDA: Record<Moneda, string> = {
  PM: 'Mithril', PL: 'Platino', PO: 'Oro', PE: 'Electro', PP: 'Plata', PC: 'Cobre',
};
export const MAX_MONEDAS = 500;

export interface ResultadoConversion { ok: boolean; error?: string; monedas?: Record<Moneda, number>; resto?: number }

/**
 * Convierte `cantidad` monedas de `desde` a `hacia`. Si no es exacto, lo que sobra se queda
 * en la moneda de origen (no se pierde nada).
 */
export function convertir(m: Record<Moneda, number>, desde: Moneda, hacia: Moneda, cantidad: number): ResultadoConversion {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return { ok: false, error: 'Indica una cantidad válida.' };
  if (desde === hacia) return { ok: false, error: 'Elige dos monedas distintas.' };
  if ((m[desde] ?? 0) < cantidad) return { ok: false, error: `No tienes ${cantidad} ${desde}.` };
  const totalPC = cantidad * VALOR_PC[desde];
  const obtenidas = Math.floor(totalPC / VALOR_PC[hacia]);
  if (obtenidas === 0) return { ok: false, error: `${cantidad} ${desde} no llegan a 1 ${hacia}.` };
  const sobrantePC = totalPC - obtenidas * VALOR_PC[hacia];
  const devueltas = Math.floor(sobrantePC / VALOR_PC[desde]);
  const usadas = cantidad - devueltas;
  return { ok: true, monedas: { ...m, [desde]: m[desde] - usadas, [hacia]: (m[hacia] ?? 0) + obtenidas }, resto: devueltas };
}

// ---------------------------------------------------------------- Idiomas, oficios, profesiones
export const HUECOS_IDIOMAS = [
  { id: 'trasfondo-0', etiqueta: 'Trasfondo', atr: null, min: 0 },
  { id: 'trasfondo-1', etiqueta: 'Trasfondo', atr: null, min: 0 },
  { id: 'INT5', etiqueta: 'INT 5+', atr: 'INT', min: 5 },
  { id: 'INT10', etiqueta: 'INT 10+', atr: 'INT', min: 10 },
  { id: 'INT14', etiqueta: 'INT 14+ (aprendido)', atr: 'INT', min: 14 },
  { id: 'INT17', etiqueta: 'INT 17+ (aprendido)', atr: 'INT', min: 17 },
  { id: 'INT19', etiqueta: 'INT 19+ (aprendido)', atr: 'INT', min: 19 },
] as const;
export const HUECOS_OFICIOS = [
  { id: 'trasfondo', etiqueta: 'Trasfondo', atr: null, min: 0 },
  { id: 'SAB5', etiqueta: 'SAB 5+', atr: 'SAB', min: 5 },
  { id: 'SAB12', etiqueta: 'SAB 12+ (aprendido)', atr: 'SAB', min: 12 },
  { id: 'SAB18', etiqueta: 'SAB 18+ (aprendido)', atr: 'SAB', min: 18 },
] as const;
export const HUECOS_PROFESIONES = [
  { id: 'trasfondo', etiqueta: 'Trasfondo', atr: null, min: 0 },
  { id: 'INT5', etiqueta: 'INT 5+', atr: 'INT', min: 5 },
  { id: 'INT12', etiqueta: 'INT 12+ (aprendida)', atr: 'INT', min: 12 },
  { id: 'INT18', etiqueta: 'INT 18+ (aprendida)', atr: 'INT', min: 18 },
] as const;

type Hueco = { id: string; atr: null | 'INT' | 'SAB'; min: number };
export const huecoDisponible = (p: Personaje, h: Hueco) => !h.atr || p.caracteristicas[h.atr] >= h.min;
export const huecosVacios = (p: Personaje, huecos: readonly Hueco[], valores: Record<string, string>) =>
  huecos.filter((h) => h.atr && huecoDisponible(p, h) && !(valores[h.id] ?? '').trim()).length;

// ---------------------------------------------------------------- Varios
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Lee "1d6+3", "2d8 + 4", "d20" → {n, caras, mod}. */
export function parseFormula(f: string): { dados: { n: number; caras: number }[]; mod: number } | null {
  const s = f.replace(/\s+/g, '').toLowerCase();
  if (!s) return null;
  const partes = s.match(/[+-]?[^+-]+/g);
  if (!partes) return null;
  const dados: { n: number; caras: number }[] = [];
  let mod = 0;
  for (const p of partes) {
    const signo = p.startsWith('-') ? -1 : 1;
    const q = p.replace(/^[+-]/, '');
    const m = q.match(/^(\d*)d(\d+)$/);
    if (m) dados.push({ n: signo * (m[1] ? parseInt(m[1]) : 1), caras: parseInt(m[2]) });
    else if (/^\d+$/.test(q)) mod += signo * parseInt(q);
    else return null;
  }
  return { dados, mod };
}

// ---------------------------------------------------------------- Experiencia y nivel
/** PX totales para alcanzar cada nivel (tabla «Progreso de los personajes»). Índice = nivel. */
export const PX_NIVEL = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
/** PX que hacen falta para pasar de `nivel` a `nivel + 1` (null en nivel 20). */
export function pxParaSubir(nivel: number): number | null {
  return nivel >= 20 || nivel < 1 ? null : PX_NIVEL[nivel + 1] - PX_NIVEL[nivel];
}
/** Sube de nivel mientras los PX alcancen; el resto se queda como PX. */
export function aplicarExperiencia(nivel: number, exp: number): { nivel: number; exp: number; subidos: number } {
  let n = nivel, e = Math.max(0, exp), subidos = 0;
  for (let c = pxParaSubir(n); c !== null && e >= c; c = pxParaSubir(n)) { e -= c; n++; subidos++; }
  return { nivel: n, exp: e, subidos };
}

// ---------------------------------------------------------------- Bolsas llenas y ventas
/** Saca a la mochila una bolsa de 500 por cada vez que una moneda pasa de 500. Devuelve cuántas bolsas creó. */
export function embolsarExceso(p: Personaje): number {
  let n = 0;
  for (const m of Object.keys(p.monedas) as Moneda[]) {
    while (p.monedas[m] > MAX_MONEDAS) {
      p.monedas[m] -= MAX_MONEDAS;
      p.mochila.push(bolsaMonedas(m, MAX_MONEDAS));
      n++;
    }
  }
  return n;
}
export function bolsaMonedas(m: Moneda, cantidad: number): Item {
  return {
    id: uid(), nombre: `Bolsa de ${NOMBRE_MONEDA[m].toLowerCase()} (${cantidad} ${m})`, tipo: 'monedas', cantidad: 1,
    precio: '', descripcion: `Una bolsa llena con ${cantidad} ${m}. Ocupa un espacio en la mochila.`, bolsa: { moneda: m, cantidad },
  };
}
/** Lee un precio libre como «50po», «155 pc» o «1,5 po». */
export function leerPrecio(s: string): { cantidad: number; moneda: Moneda } | null {
  const m = s.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(pm|pl|po|pe|pp|pc)\b/i);
  if (!m) return null;
  return { cantidad: parseFloat(m[1]), moneda: m[2].toUpperCase() as Moneda };
}
