import type { Clase, Razas } from './data';
import type { Item, Personaje } from './types';
import { bonoCompetencia } from './rules';
import { RASGOS_FIJOS } from './fijos';
import { recursosPersonaje } from './recursos';

/**
 * Rasgos, dotes y efectos que se activan en combate y suman al ataque o al daño de un arma
 * (Furia, Ataque furtivo…). Los bonos fijos que siempre se aplican ya están en bonos.ts.
 */
export interface Potenciador {
  id: string; es: string; ru: string;
  /** Qué suma: al ataque (número) y/o al daño (fórmula, p. ej. «+2» o «+3d6»). */
  ataque?: number; dano?: string;
  /** Solo para un golpe: se desactiva sola después de tirar el daño. Si no, dura hasta que la apagues. */
  unaVez?: boolean;
  /** Armas a las que se aplica. */
  armas?: 'cac' | 'distancia' | 'sutilODistancia' | 'pesada' | 'arrojadiza' | 'fuerza';
  /** Recurso que gasta al encenderla (id de recursos.ts). */
  gasta?: string;
  nota_es?: string; nota_ru?: string;
}

interface Def {
  clase?: string; subclase?: string; nivel?: number; rasgo?: string; razas?: string[]; dote?: string;
  /** Se calcula al momento (nivel, PG…). Devuelve null si ahora no aplica. */
  crear: (p: Personaje, clase: Clase | null | undefined) => Omit<Potenciador, 'id'> | null;
}

const porNivel = (n: number, tramos: [number, string][]) => tramos.filter(([desde]) => n >= desde).pop()?.[1] ?? tramos[0][1];
const columna = (clase: Clase | null | undefined, p: Personaje, col: string) => String((clase?.tabla.find((f) => f.nivel === p.nivel) ?? clase?.tabla[clase.tabla.length - 1])?.[col] ?? '');
const pctPG = (p: Personaje) => (p.pg.max > 0 ? p.pg.actual / p.pg.max : 1);
const TROLES = ['Trol de hielo (Drakkari)', 'Trol de la jungla (Gurubashi)', 'Trol del bosque (Amani)', 'Trol lanza-negra', 'Trol zandalari'];

const DEFS: Record<string, Def> = {
  // ---------- Clases
  furia: { clase: 'Bárbaro', crear: (p, c) => ({ es: 'Furia', ru: 'Ярость', dano: columna(c, p, 'Daño de furia') || '+2', armas: 'fuerza', gasta: 'furia',
    nota_es: 'Daño con armas de Fuerza. Se gasta 1 furia al encenderla.', nota_ru: 'Урон оружием на Силе. При включении тратится 1 ярость.' }) },
  golpeBrutal: { clase: 'Bárbaro', nivel: 9, crear: (p) => ({ es: 'Golpe brutal', ru: 'Жестокий удар', dano: p.nivel >= 17 ? '+2d10' : '+1d10', unaVez: true, nota_es: 'Con Ataque temerario.', nota_ru: 'С безрассудной атакой.' }) },
  frenesi: { clase: 'Bárbaro', subclase: 'Senda del berserker', nivel: 3, crear: (p, c) => ({ es: 'Frenesí', ru: 'Бешенство', dano: `+${parseInt(columna(c, p, 'Daño de furia').replace('+', ''), 10) || 2}d6`, unaVez: true, nota_es: 'Enfurecido + Ataque temerario, al primer objetivo.', nota_ru: 'В ярости + безрассудная атака, по первой цели.' }) },
  furiaDivina: { clase: 'Bárbaro', subclase: 'Senda del fanático', nivel: 3, crear: (p) => ({ es: 'Furia divina', ru: 'Божественная ярость', dano: `+1d6+${Math.floor(p.nivel / 2)}`, unaVez: true, nota_es: 'Enfurecido, primera criatura a la que aciertes en el turno.', nota_ru: 'В ярости, первое попадание за ход.' }) },
  furtivo: { clase: 'Pícaro', crear: (p, c) => ({ es: 'Ataque furtivo', ru: 'Скрытая атака', dano: `+${columna(c, p, 'Ataque furtivo') || '1d6'}`, unaVez: true, armas: 'sutilODistancia', nota_es: '1 vez por turno, con ventaja o con un aliado al lado del objetivo.', nota_ru: '1 раз за ход, с преимуществом или если союзник рядом с целью.' }) },
  asesinar: { clase: 'Pícaro', subclase: 'Asesino', nivel: 3, crear: (p) => ({ es: 'Asesinar', ru: 'Убийство', dano: `+${p.nivel}`, unaVez: true, nota_es: 'Ataque furtivo en el primer asalto del combate.', nota_ru: 'Скрытая атака в первом раунде боя.' }) },
  golpeDivino: { clase: 'Clérigo', nivel: 7, crear: (p) => ({ es: 'Golpe divino', ru: 'Божественный удар', dano: p.nivel >= 14 ? '+2d8' : '+1d8', unaVez: true, nota_es: '1 vez por turno, necrótico o radiante.', nota_ru: '1 раз за ход, некротический или излучение.' }) },
  golpePrimordial: { clase: 'Druida', nivel: 7, crear: (p) => ({ es: 'Golpe primordial', ru: 'Первородный удар', dano: p.nivel >= 15 ? '+2d8' : '+1d8', unaVez: true, nota_es: 'Si elegiste Golpe primordial en Furia elemental.', nota_ru: 'Если выбран «Первородный удар» в «Стихийной ярости».' }) },
  golpesRadiantes: { clase: 'Paladín', nivel: 11, crear: () => ({ es: 'Golpes radiantes', ru: 'Сияющие удары', dano: '+1d8', armas: 'cac', nota_es: 'Cada golpe cuerpo a cuerpo.', nota_ru: 'Каждый удар в ближнем бою.' }) },
  presaCazador: { clase: 'Explorador', subclase: 'Cazador', nivel: 3, crear: () => ({ es: 'Asesino de colosos', ru: 'Убийца колоссов', dano: '+1d8', unaVez: true, nota_es: '1 vez por turno, si el objetivo no tiene todos sus PG.', nota_ru: '1 раз за ход, если у цели не полные хиты.' }) },
  golpePavoroso: { clase: 'Explorador', subclase: 'Acechador en la penumbra', nivel: 3, crear: () => ({ es: 'Golpe pavoroso', ru: 'Ужасающий удар', dano: '+2d6', unaVez: true, nota_es: 'Daño psíquico.', nota_ru: 'Психический урон.' }) },
  golpesPavorososFeerico: { clase: 'Explorador', subclase: 'Errante feérico', nivel: 3, crear: (p) => ({ es: 'Golpes pavorosos', ru: 'Ужасающие удары', dano: p.nivel >= 11 ? '+1d6' : '+1d4', unaVez: true, nota_es: 'Psíquico, 1 vez por turno por objetivo.', nota_ru: 'Психический, 1 раз за ход по цели.' }) },
  supremacia: { clase: 'Guerrero', subclase: 'Maestro del combate', nivel: 3, crear: (p) => ({ es: 'Dado de supremacía', ru: 'Кость превосходства', dano: `+1${porNivel(p.nivel, [[3, 'd8'], [10, 'd10'], [18, 'd12']])}`, unaVez: true, gasta: 'dadosSupremacia', nota_es: 'Maniobra que suma el dado al daño.', nota_ru: 'Манёвр, добавляющий кость к урону.' }) },
  // ---------- Razas
  altosCielos: { rasgo: 'Poder de los Altos Cielos', crear: (p) => ({ es: 'Poder de los Altos Cielos', ru: 'Сила высших небес', dano: `+1${porNivel(p.nivel, [[1, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']])}`, nota_es: '1 minuto; todo el daño es radiante.', nota_ru: '1 минута; весь урон — излучение.' }) },
  nueveInfiernos: { rasgo: 'Poder de los Nueve Infiernos', crear: (p) => ({ es: 'Poder de los Nueve Infiernos', ru: 'Сила Девяти Преисподних', dano: `+2${porNivel(p.nivel, [[1, 'd4'], [5, 'd6'], [11, 'd8'], [17, 'd10']])}`, nota_es: '1 minuto; daño necrótico o de fuego.', nota_ru: '1 минута; некротический урон или огонь.' }) },
  furiaColina: { rasgo: 'Furia de la Colina', crear: (p) => (pctPG(p) < 0.5 ? { es: 'Furia de la Colina', ru: 'Ярость холмов', dano: pctPG(p) < 0.25 ? '+3' : '+2', nota_es: 'Por estar por debajo de la mitad de PG.', nota_ru: 'Хитов меньше половины.' } : null) },
  tranceTrol: { razas: TROLES, crear: (p) => { const x = pctPG(p); return { es: 'Trance trol (Rabiar)', ru: 'Транс тролля (ярость)', dano: x > 0.75 ? '+1d4' : x >= 0.5 ? '+1d6' : x >= 0.25 ? '+1d8' : '+1d10', unaVez: true, gasta: 'trance', nota_es: 'Según tus PG actuales.', nota_ru: 'Зависит от текущих хитов.' }; } },
  hextech: { rasgo: 'Artesanía Hextech', crear: (p) => ({ es: 'Arma Hextech', ru: 'Хекстек-оружие', ataque: p.nivel >= 17 ? 3 : p.nivel >= 10 ? 2 : 1, dano: p.nivel >= 17 ? '+3d4' : p.nivel >= 10 ? '+2d4' : '+1d4', nota_es: 'Solo con el arma mejorada.', nota_ru: 'Только улучшенным оружием.' }) },
  odioGnomo: { rasgo: 'Odio', razas: ['Gnomo'], crear: () => ({ es: 'Odio (orcos y goblins)', ru: 'Ненависть (орки и гоблины)', ataque: 2 }) },
  odioCavernario: { rasgo: 'Odio Cavernario', crear: () => ({ es: 'Odio cavernario', ru: 'Пещерная ненависть', ataque: 2, nota_es: 'Contra el tipo de criatura elegido.', nota_ru: 'Против выбранного типа существ.' }) },
  gloria: { rasgo: 'En Busca de la Gloria', crear: () => ({ es: 'En busca de la gloria', ru: 'В поисках славы', ataque: 2, nota_es: 'Contra gigantes o criaturas Enormes.', nota_ru: 'Против великанов и Огромных существ.' }) },
  equipo: { rasgo: 'Trabajo en equipo', crear: () => ({ es: 'Trabajo en equipo', ru: 'Командная работа', ataque: 1, nota_es: 'Un aliado a 5 pies del objetivo.', nota_ru: 'Союзник в 5 фт от цели.' }) },
  jinetes: { rasgo: 'Pequeños Jinetes', crear: () => ({ es: 'Pequeños jinetes', ru: 'Маленькие всадники', ataque: 1, nota_es: 'Montando una criatura pequeña, lobo o huargo.', nota_ru: 'Верхом на маленьком существе, волке или варге.' }) },
  arremetida: { rasgo: 'Arremetida Brutal', crear: () => ({ es: 'Arremetida brutal', ru: 'Жестокий натиск', dano: '+1d6', unaVez: true, nota_es: 'Tras moverte 20 pies en carga.', nota_ru: 'После рывка на 20 фт.' }) },
  venenos: { rasgo: 'Improvisador de Venenos', crear: () => ({ es: 'Arma envenenada', ru: 'Отравленное оружие', dano: '+1d4', unaVez: true, nota_es: 'Daño de veneno + TS de Constitución.', nota_ru: 'Урон ядом + спасбросок Телосложения.' }) },
  golpePreciso: { rasgo: 'Golpe Preciso', crear: () => ({ es: 'Golpe preciso', ru: 'Точный удар', ataque: -1, dano: '+2', unaVez: true, armas: 'cac', nota_es: 'Cuerpo a cuerpo: −1 al ataque, +2 al daño.', nota_ru: 'Ближний бой: −1 к атаке, +2 к урону.' }) },
  iraControlada: { rasgo: 'Ira controlada', crear: () => ({ es: 'Ira controlada', ru: 'Сдержанный гнев', dano: '+2', unaVez: true, nota_es: 'Contra quien te acaba de dañar.', nota_ru: 'Против того, кто тебя только что ранил.' }) },
  // ---------- Dotes
  carga: { dote: 'Atacante a la carga', crear: () => ({ es: 'Atacante a la carga', ru: 'Атакующий с разбега', dano: '+1d8', unaVez: true, armas: 'cac', nota_es: 'Tras moverte 10 pies en línea recta.', nota_ru: 'После 10 фт по прямой.' }) },
  armasPesadas: { dote: 'Maestro en armas pesadas', crear: (p) => ({ es: 'Maestro en armas pesadas', ru: 'Мастер тяжёлого оружия', dano: `+${bonoCompetencia(p.nivel)}`, armas: 'pesada' }) },
  duelo: { dote: 'Duelo', crear: () => ({ es: 'Duelo', ru: 'Дуэль', dano: '+2', armas: 'cac', nota_es: 'Arma a una mano y nada en la otra.', nota_ru: 'Оружие в одной руке, вторая свободна.' }) },
  arrojadizas: { dote: 'Combate con armas arrojadizas', crear: () => ({ es: 'Armas arrojadizas', ru: 'Метательное оружие', dano: '+2', armas: 'arrojadiza', nota_es: 'Al lanzarla.', nota_ru: 'При броске.' }) },
};

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;

/** Potenciadores que puede usar el personaje ahora mismo. */
export function potenciadoresDisponibles(p: Personaje, clase: Clase | null | undefined, _razas?: Razas | null): Potenciador[] {
  const rasgos = [...(RASGOS_FIJOS[p.raza] ?? []), ...(p.rasgosRaza ?? [])];
  const out: Potenciador[] = [];
  for (const [id, d] of Object.entries(DEFS)) {
    if (d.clase && (d.clase !== p.clase || p.nivel < (d.nivel ?? 1))) continue;
    if (d.subclase && !igual(d.subclase, p.subclase ?? '')) continue;
    if (d.razas && !d.razas.includes(p.raza)) continue;
    if (d.rasgo && !rasgos.some((r) => igual(r, d.rasgo!))) continue;
    if (d.dote && !(p.dotes ?? []).some((x) => igual(x.nombre, d.dote!))) continue;
    const x = d.crear(p, clase);
    if (x) out.push({ id, ...x });
  }
  return out;
}

/** ¿Este potenciador vale para esta arma? */
export function aplicaArma(pt: Potenciador, it: Item, atr: 'FUE' | 'DES' | string, distancia: boolean): boolean {
  const props = it.detalles?.['Propiedades'] ?? '';
  // El golpe sin armas no es un arma: ni furtivo, ni Duelo, ni dotes de armas pesadas o arrojadizas.
  if (it.id === 'nat:sinArmas' && (pt.id === 'duelo' || pt.armas === 'sutilODistancia' || pt.armas === 'pesada' || pt.armas === 'arrojadiza')) return false;
  switch (pt.armas) {
    case 'cac': return !distancia;
    case 'distancia': return distancia;
    case 'sutilODistancia': return distancia || /sutil/i.test(props);
    case 'pesada': return /pesad/i.test(props);
    case 'arrojadiza': return /arrojadiz/i.test(props);
    case 'fuerza': return atr === 'FUE' && !distancia;
    default: return true;
  }
}

/** Suma las fórmulas de daño extra: «1d8+3» + [«+3d6», «+2»] → «1d8+3+3d6+2». */
export const sumarDano = (base: string, extras: string[]) => [base, ...extras.map((e) => (/^[+-]/.test(e) ? e : `+${e}`))].join('');

/**
 * Enciende o apaga un potenciador. Al encenderlo gasta 1 uso de su recurso si el personaje lo tiene;
 * devuelve un aviso (sin cambiar nada) si no quedan usos.
 */
export function alternarPotenciador(x: Personaje, pt: Potenciador, clase: Clase | null | undefined): string | null {
  const activos = x.potenciadores ?? [];
  if (activos.includes(pt.id)) { x.potenciadores = activos.filter((i) => i !== pt.id); return null; }
  const r = pt.gasta ? recursosPersonaje(x, clase).find((y) => y.id === pt.gasta) : undefined;
  if (r) {
    const usados = x.recursosUsados?.[r.id] ?? 0;
    if (usados >= r.max) return r.id;
    x.recursosUsados = { ...(x.recursosUsados ?? {}), [r.id]: usados + 1 };
  }
  x.potenciadores = [...activos, pt.id];
  return null;
}

/** Tras tirar el daño, se apagan los de un solo golpe. */
export function apagarDeUnGolpe(x: Personaje, usados: Potenciador[]) {
  const fuera = new Set(usados.filter((u) => u.unaVez).map((u) => u.id));
  if (fuera.size) x.potenciadores = (x.potenciadores ?? []).filter((i) => !fuera.has(i));
}
