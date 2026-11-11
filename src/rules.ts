import { ajustarMulticlase, nivelEn, nivelTotal } from './multiclase';
import type { Atributo, Item, Moneda, Personaje } from './types';
import { bonoAtaqueArma, bonoAtaqueConjuro, bonoCdConjuro, bonoFuerzaCarga, bonoHabilidad, bonoPrueba, bonoSalvacion, bonosCA } from './bonos';
import { L } from './i18n';
import { tr } from './ru';


/** Valor de una característica con los efectos temporales del máster (entre 1 y 30). */
export function car(p: Personaje, a: Atributo): number {
  const extra = (p.efectosCar ?? []).filter((e) => e.atributo === a).reduce((s, e) => s + e.valor, 0);
  return extra ? Math.max(1, Math.min(30, p.caracteristicas[a] + extra)) : p.caracteristicas[a];
}

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
  const bc = bonoCompetencia(nivelTotal(p));
  const r = bonoHabilidad(p, id, h.comp);
  return modificador(car(p, def.atributo)) + (h.comp || r.comp ? bc : 0) + (h.pericia ? bc : 0) + (h.bonus || 0) + r.bono + bonoPrueba(p, def.atributo);
}
/** Prueba de característica: modificador + bonos de rasgos (p. ej. «Poderoso» +2 a FUE). */
export const valorPrueba = (p: Personaje, a: Atributo) => modificador(car(p, a)) + bonoPrueba(p, a);

export function valorSalvacion(p: Personaje, a: Atributo): number {
  const s = p.salvaciones[a];
  return modificador(car(p, a)) + (s.comp ? bonoCompetencia(nivelTotal(p)) : 0) + (s.bonus || 0) + bonoSalvacion(p, a);
}

export const iniciativa = (p: Personaje) => valorPrueba(p, 'DES') + (p.bonusIniciativa || 0);
export const percepcionPasiva = (p: Personaje) => 10 + valorHabilidad(p, 'percepcion') + (p.bonusPercepcionPasiva || 0);

export function cdConjuros(p: Personaje): number | null {
  const a = caracteristicaConjuros(p); if (!a) return null;
  return 8 + bonoCompetencia(nivelTotal(p)) + modificador(car(p, a)) + bonoCdConjuro(p);
}
export function ataqueConjuros(p: Personaje): number | null {
  const a = caracteristicaConjuros(p); if (!a) return null;
  return bonoCompetencia(nivelTotal(p)) + modificador(car(p, a)) + bonoAtaqueConjuro(p);
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
  const libres = MOCHILA_BASE + espaciosPorFuerza(car(p, 'FUE') + bonoFuerzaCarga(p));
  const usados = espaciosUsados(p.mochila);
  const exceso = Math.max(0, usados - libres);
  const max = TRAMOS_SOBRECARGA[TRAMOS_SOBRECARGA.length - 1].hasta;
  let penalizacion = 0, efecto = '';
  if (exceso > 0) {
    const t = TRAMOS_SOBRECARGA.find((t) => exceso <= t.hasta) ?? TRAMOS_SOBRECARGA[TRAMOS_SOBRECARGA.length - 1];
    penalizacion = t.velocidad; efecto = tr(t.efecto);
  }
  return { usados, libres, capacidad: Math.min(MOCHILA_MAX, libres + max), exceso, penalizacion, efecto, sobreMaximo: usados > MOCHILA_MAX };
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
  if (!Number.isInteger(cantidad) || cantidad <= 0) return { ok: false, error: L('Indica una cantidad válida.', 'Укажи правильное количество.') };
  if (desde === hacia) return { ok: false, error: L('Elige dos monedas distintas.', 'Выбери две разные монеты.') };
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
/**
 * Saca a la mochila una bolsa de 500 por cada vez que una moneda pasa de 500, mientras quepa
 * (la mochila no pasa de 22 espacios). Devuelve cuántas bolsas creó.
 */
export function embolsarExceso(p: Personaje): number {
  let n = 0;
  for (const m of Object.keys(p.monedas) as Moneda[]) {
    while (p.monedas[m] > MAX_MONEDAS && espaciosLibresMochila(p) > 0) {
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

// ---------------------------------------------------------------- Conjunto estándar (manual, p. 11)
/** Características iniciales recomendadas por clase: FUE, DES, CON, INT, SAB, CAR. */
export const CONJUNTO_ESTANDAR: Record<string, [number, number, number, number, number, number]> = {
  'Bárbaro': [15, 13, 14, 10, 12, 8], 'Bardo': [8, 14, 12, 13, 10, 15], 'Brujo': [8, 14, 13, 12, 10, 15],
  'Clérigo': [14, 8, 13, 10, 15, 12], 'Druida': [8, 12, 14, 13, 15, 10], 'Explorador': [12, 15, 13, 8, 14, 10],
  'Guerrero': [15, 14, 13, 8, 10, 12], 'Hechicero': [10, 13, 14, 8, 12, 15], 'Mago': [8, 12, 13, 15, 14, 10],
  'Monje': [12, 15, 13, 10, 14, 8], 'Paladín': [15, 10, 13, 8, 12, 14], 'Pícaro': [12, 15, 13, 14, 10, 8],
};
const ORDEN_CAR: Atributo[] = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
export function aplicarConjuntoEstandar(p: Personaje, clase: string): boolean {
  const c = CONJUNTO_ESTANDAR[clase]; if (!c) return false;
  ORDEN_CAR.forEach((a, i) => { p.caracteristicas[a] = c[i]; });
  return true;
}
/** true si las características siguen sin tocar (todo 10 o el conjunto de alguna clase). */
export function caracteristicasSinTocar(p: Personaje): boolean {
  const v = ORDEN_CAR.map((a) => p.caracteristicas[a]);
  if (v.every((x) => x === 10)) return true;
  return Object.values(CONJUNTO_ESTANDAR).some((c) => c.every((x, i) => x === v[i]));
}

// ---------------------------------------------------------------- Mochila: máximo absoluto
/** La mochila nunca puede pasar de 22 espacios, haya la Fuerza que haya. */
export const MOCHILA_MAX = 22;
export const espaciosLibresMochila = (p: Personaje) => Math.max(0, MOCHILA_MAX - espaciosUsados(p.mochila));
export const cabeEnMochila = (p: Personaje, it: Item) => espaciosItem(it) <= espaciosLibresMochila(p);

// ---------------------------------------------------------------- PG y CA automáticos
const carasDado = (dado: string) => parseInt(dado.replace(/\D/g, ''), 10) || 0;
/** PG de nivel 1: máximo del dado de golpe + CON. A partir de ahí, cada nivel se tira el dado (ver subirNivel). */
export function pgPorDefecto(p: Personaje, dado: string): number {
  const c = carasDado(dado); if (!c) return 0;
  return Math.max(1, c + modificador(car(p, 'CON')));
}
/** Cambia el nivel y apunta las subidas pendientes de tirar dado de golpe. */
export function cambiarNivel(p: Personaje, nivel: number) {
  const d = nivel - p.nivel;
  p.nivel = nivel;
  p.subidasPendientes = Math.max(0, (p.subidasPendientes || 0) + d);
  if (d < 0) ajustarMulticlase(p);
}
/** PG ganados al subir un nivel: lo que sale en el dado + 1 + modificador de CON (mínimo 1). */
export const pgSubida = (tirada: number, con: number) => Math.max(1, tirada + 1 + modificador(con));

export interface DesgloseCA { total: number; partes: string[]; sigiloDesventaja: string[]; fuerzaMinima: number }
/** CA = 10 + DES sin armadura; con armadura, su fórmula; + escudo; + ajuste manual. */
export function calcularCA(p: Personaje): DesgloseCA {
  const des = modificador(car(p, 'DES'));
  const partes: string[] = [];
  const sigiloDesventaja: string[] = [];
  let fuerzaMinima = 0;
  const arm = Object.values(p.equipo).find((it) => it && it.tipo === 'armadura' && /^\d+/.test(it.detalles?.['Clase de armadura'] ?? ''));
  const extra = bonosCA(p, !!arm);
  const desEf = des > 0 ? Math.max(0, des - extra.menosDes) : des;
  const escudo = [p.equipo.manoHabil, p.equipo.manoTorpe].some((it) => it?.tipo === 'escudo');
  let base = 10 + desEf;
  if (arm) {
    const f = arm.detalles!['Clase de armadura'];
    const n = parseInt(f, 10);
    if (/Destreza/i.test(f)) {
      const tope = f.match(/m[aá]x\.?\s*(\d+)/i);
      const d = tope ? Math.min(desEf, parseInt(tope[1], 10)) : desEf;
      base = n + d; partes.push(`${arm.nombre} ${n} ${conSigno(d)} ${L('DES', 'ЛОВ')}`);
    } else { base = n; partes.push(`${arm.nombre} ${n}`); }
    const mg = bonoMagicoArma(arm);
    if (mg) { base += mg; partes.push(`${L('mágica', 'магия')} ${conSigno(mg)}`); }
    if (/desventaja/i.test(arm.detalles?.['Sigilo'] ?? '')) sigiloDesventaja.push(arm.nombre);
    fuerzaMinima = Math.max(fuerzaMinima, parseInt(arm.detalles?.['Fuerza'] ?? '', 10) || 0);
  } else if (nivelEn(p, 'Bárbaro') > 0) {
    const c = modificador(car(p, 'CON')); base = 10 + desEf + c; partes.push(L(`Defensa sin armadura 10 ${conSigno(desEf)} DES ${conSigno(c)} CON`, `Защита без доспехов 10 ${conSigno(desEf)} ЛОВ ${conSigno(c)} ТЕЛ`));
  } else if (nivelEn(p, 'Monje') > 0 && !escudo) {
    const s = modificador(car(p, 'SAB')); base = 10 + desEf + s; partes.push(L(`Defensa sin armadura 10 ${conSigno(desEf)} DES ${conSigno(s)} SAB`, `Защита без доспехов 10 ${conSigno(desEf)} ЛОВ ${conSigno(s)} МДР`));
  } else partes.push(`10 ${conSigno(desEf)} ${L('DES', 'ЛОВ')}`);
  let total = base;
  for (const it of [p.equipo.manoHabil, p.equipo.manoTorpe]) {
    if (it?.tipo !== 'escudo') continue;
    const b = parseInt((it.detalles?.['Clase de armadura'] ?? '+2').replace(/[^\d-]/g, ''), 10) || 2;
    const mg = bonoMagicoArma(it);
    total += b + mg; partes.push(`${it.nombre} +${b + mg}`);
    if (/desventaja/i.test(it.detalles?.['Sigilo'] ?? '')) sigiloDesventaja.push(it.nombre);
    fuerzaMinima = Math.max(fuerzaMinima, parseInt(it.detalles?.['Fuerza'] ?? '', 10) || 0);
  }
  if (extra.total) { total += extra.total; partes.push(...extra.partes); }
  if (p.bonusCA) { total += p.bonusCA; partes.push(`${L('ajuste', 'поправка')} ${conSigno(p.bonusCA)}`); }
  return { total, partes, sigiloDesventaja, fuerzaMinima };
}

// ---------------------------------------------------------------- Conjuros por clase
/** Característica para lanzar conjuros de cada clase (Pícaro y Guerrero: INT por Embaucador / Caballero arcano). */
export const CARACTERISTICA_CONJUROS: Record<string, Atributo> = {
  'Bardo': 'CAR', 'Brujo': 'CAR', 'Clérigo': 'SAB', 'Druida': 'SAB', 'Explorador': 'SAB', 'Hechicero': 'CAR',
  'Mago': 'INT', 'Paladín': 'CAR', 'Pícaro': 'INT', 'Guerrero': 'INT', 'Monje': 'SAB',
};
/** La elegida a mano o, si no hay, la de la clase. */
export const caracteristicaConjuros = (p: Personaje): Atributo | '' => p.conjuroCaracteristica || CARACTERISTICA_CONJUROS[p.clase] || '';

/** Nº de dados de un truco según nivel de personaje (mejora a nivel 5, 11 y 17). */
export const multiplicadorTruco = (nivel: number) => 1 + [5, 11, 17].filter((n) => nivel >= n).length;

/**
 * Dados de un conjuro listos para tirar: el primer dado del texto escalado por nivel de personaje (trucos)
 * o por espacio de conjuro («aumenta en XdY por cada nivel por encima de N»).
 */
export function dadosConjuro(texto: string, nivelConjuro: number, nivelPersonaje: number, espacio: number): string[] {
  // Los dados de «Mejora de truco» y «Con un espacio de nivel superior» son el incremento, no se tiran sueltos.
  const corte = texto.search(/mejora de truco|con un espacio de conjuro de nivel superior/i);
  const cuerpo = corte >= 0 ? texto.slice(0, corte) : texto;
  const extra = corte >= 0 ? texto.slice(corte) : '';
  const todos = [...new Set((cuerpo.match(/\b\d+d\d+(?:\s*\+\s*\d+)?/gi) ?? []).map((d) => d.replace(/\s+/g, '').toLowerCase()))];
  if (!todos.length) return [];
  const m = todos[0].match(/^(\d+)d(\d+)(.*)$/)!;
  let n = parseInt(m[1], 10);
  const caras = m[2], resto = m[3];
  if (nivelConjuro === 0) {
    if (/mejora de truco/i.test(extra)) n *= multiplicadorTruco(nivelPersonaje);
  } else {
    const sube = extra.match(/aumenta en (\d+)d(\d+) por cada nivel por encima de/i);
    if (sube && sube[2] === caras) n += parseInt(sube[1], 10) * Math.max(0, espacio - nivelConjuro);
  }
  return [`${n}d${caras}${resto}`, ...todos.slice(1, 3)];
}

// ---------------------------------------------------------------- Avisos de ventaja/desventaja
export type TipoTirada = 'prueba' | 'salvacion' | 'habilidad' | 'ataque';
/** Motivos por los que podrías tener ventaja o desventaja en una tirada (solo aviso, no se aplica solo). */
export function avisosTirada(p: Personaje, tipo: TipoTirada, atr: Atributo | null, habilidad?: string): string[] {
  const out: string[] = [];
  const carga = estadoCarga(p);
  const tramo = carga.exceso > 0 ? TRAMOS_SOBRECARGA.findIndex((t) => carga.exceso <= t.hasta) : -1;
  const fisica = atr === 'FUE' || atr === 'DES';
  if (fisica && (tramo === 2 || carga.sobreMaximo)) out.push(L(`Desventaja: mochila muy sobrecargada (${carga.usados} espacios), todas las tiradas de Fuerza y Destreza.`, `Помеха: рюкзак сильно перегружен (${carga.usados} ячеек), все броски Силы и Ловкости.`));
  else if (fisica && tramo === 1 && (tipo === 'salvacion' || tipo === 'habilidad')) out.push(L(`Desventaja: mochila sobrecargada (${carga.usados} espacios), TS y habilidades de Fuerza y Destreza.`, `Помеха: рюкзак перегружен (${carga.usados} ячеек), спасброски и навыки Силы и Ловкости.`));
  const ca = calcularCA(p);
  if (habilidad === 'sigilo' && ca.sigiloDesventaja.length) out.push(L(`Desventaja en Sigilo por ${ca.sigiloDesventaja.join(' y ')}.`, `Помеха на Скрытность из-за: ${ca.sigiloDesventaja.join(', ')}.`));
  if (ca.fuerzaMinima && car(p, 'FUE') < ca.fuerzaMinima && fisica) out.push(L(`Tu armadura pide Fuerza ${ca.fuerzaMinima}: pregunta al DM si te penaliza.`, `Доспех требует Силу ${ca.fuerzaMinima}: спроси мастера о штрафе.`));
  return out;
}

// ---------------------------------------------------------------- Armas a distancia
/** true si el arma usa munición (arcos, ballestas, hondas…): lleva su munición (máx. 20) en el mismo espacio. */
export const usaMunicion = (it: Item | null | undefined) => !!it && it.tipo === 'arma' && /munici[oó]n/i.test(it.detalles?.['Propiedades'] ?? '');
export const MAX_MUNICION = 20;
/** Bonificador de ataque de un arma: competencia + FUE (o DES si es a distancia o sutil, la mejor). */
/** Armas sencillas cuerpo a cuerpo (armas.json): todas son armas de monje. */
const SENCILLAS_CAC = ['Bastón', 'Cestus', 'Daga', 'Garrote', 'Garrote grande', 'Hacha de mano', 'Hoz', 'Lanza', 'Lanza de caza', 'Martillo ligero', 'Maza', 'Nudillo de latón', 'Puñal'];
/** «Daga +1» → 1: bonificador mágico escrito en el nombre del arma. */
export const bonoMagicoArma = (it: Item) => it.magico ?? parseInt(it.nombre.match(/\+\s*(\d)\b/)?.[1] ?? '0', 10);
/** Arma de monje: sencilla cuerpo a cuerpo o marcial cuerpo a cuerpo con la propiedad «ligera». */
export function esArmaMonje(it: Item): boolean {
  if (it.tipo !== 'arma' || it.id.startsWith('nat:') || esDistancia(it)) return false;
  const base = it.nombre.replace(/\s*\+\s*\d\b.*/, '').trim();
  return SENCILLAS_CAC.some((n) => n.localeCompare(base, 'es', { sensitivity: 'base' }) === 0) || /\bliger[ao]\b/i.test(it.detalles?.['Propiedades'] ?? '');
}

/** Arma a distancia (arco, ballesta, honda…): las arrojadizas cuentan como cuerpo a cuerpo. */
export function esDistancia(it: Item): boolean {
  const props = it.detalles?.['Propiedades'] ?? '';
  return usaMunicion(it) || (/alcance\s*\(/i.test(props) && !/arrojadiz/i.test(props));
}

export function bonoArma(p: Personaje, it: Item): { ataque: number; mod: number; atr: Atributo; distancia: boolean; auto: Atributo } {
  const props = it.detalles?.['Propiedades'] ?? '';
  const fue = modificador(car(p, 'FUE')), des = modificador(car(p, 'DES'));
  const distancia = esDistancia(it);
  // Ataques diestros del monje: con sus armas puede usar DES en vez de FUE.
  const sutil = /sutil/i.test(props) || (nivelEn(p, 'Monje') > 0 && esArmaMonje(it));
  const auto: Atributo = distancia || (sutil && des > fue) ? 'DES' : 'FUE';
  const magico = bonoMagicoArma(it);
  // El jugador puede elegir otra característica para el ataque y/o el daño de esta arma.
  const elegido = p.atrArmas?.[it.id];
  const atr: Atributo = elegido?.ataque ?? auto;
  const mod = modificador(car(p, elegido?.dano ?? auto)) + magico;
  return { ataque: modificador(car(p, atr)) + magico + bonoCompetencia(nivelTotal(p)) + bonoAtaqueArma(p, distancia), mod, atr, distancia, auto };
}

// ---------------------------------------------------------------- Rasgos raciales recomendados e idiomas
/** Rasgos genéricos que encajan con cada clase (se marcan con 👍 al elegir). */
export const RASGOS_RECOMENDADOS: Record<string, string[]> = {
  'Bárbaro': ['Arremetida Brutal', 'Ira controlada', 'Instinto de Supervivencia', 'Aguante Sobrehumano', 'Maestro del Contraataque'],
  'Bardo': ['Lengua Veloz', 'Palabra Potenciada', 'Conjurador Experto', 'Concentración Firme', 'Voluntad de Acero'],
  'Brujo': ['Palabra Potenciada', 'Conjurador Experto', 'Concentración Firme', 'Lengua Veloz', 'Despertar Interior'],
  'Clérigo': ['Concentración Firme', 'Pulso Estable', 'Voluntad de Acero', 'Palabra Potenciada', 'Conjurador Experto'],
  'Druida': ['Concentración Firme', 'Pulso Estable', 'Instinto del Cazador', 'Palabra Potenciada', 'Conjurador Experto'],
  'Explorador': ['Ojos de Halcón', 'Tirador veloz', 'Instinto del Cazador', 'Veterano de Batalla', 'Pies Ligeros'],
  'Guerrero': ['Asaltante Ágil', 'Golpe Preciso', 'Maestro del Contraataque', 'Veterano de Batalla', 'Instinto de Supervivencia'],
  'Hechicero': ['Palabra Potenciada', 'Conjurador Experto', 'Concentración Firme', 'Despertar Interior', 'Lengua Veloz'],
  'Mago': ['Curiosidad Incansable', 'Palabra Potenciada', 'Conjurador Experto', 'Concentración Firme', 'Despertar Interior'],
  'Monje': ['Pies Ligeros', 'Pies Seguros', 'Reflejos Rápidos', 'Asaltante Ágil', 'Maestro del Contraataque'],
  'Paladín': ['Arremetida Brutal', 'Voluntad de Acero', 'Concentración Firme', 'Golpe Preciso', 'Veterano de Batalla'],
  'Pícaro': ['Reflejos Rápidos', 'Lengua Veloz', 'Improvisador de Venenos', 'Pies Ligeros', 'Oídos Agudos'],
};
/** Rasgos de clase que en realidad son idiomas: van a «Idiomas», no a la lista de rasgos. */
export const RASGOS_IDIOMA: Record<string, string> = { 'Druídico': 'Druídico', 'Jerga de ladrones': 'Jerga de ladrones' };
/** «Élfico, Silvano y Común» → ['Élfico', 'Silvano', 'Común'] (sin «Otro a tu elección»). */
export const idiomasDeTexto = (t: string) => t.split(/,|\s+y\s+|\s+e\s+/).map((x) => x.trim()).filter((x) => x && !/elecci[oó]n/i.test(x));
