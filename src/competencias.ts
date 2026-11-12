import type { Personaje } from './types';
import { L, T, RU_CLASES } from './i18n';
import { clasesDe } from './multiclase';
import { ARTESANO, INSTRUMENTOS, elegido } from './elecciones';
import { normalizarTexto } from './data';

/** Competencias con armas, armaduras y herramientas: las automáticas salen de clase, multiclase, elecciones y dotes. */
export type TipoComp = 'armas' | 'armaduras' | 'herramientas' | 'otras';
export const TIPOS_COMP: { id: TipoComp; es: string; ru: string; icono: string }[] = [
  { id: 'armas', es: 'Armas', ru: 'Оружие', icono: '⚔️' },
  { id: 'armaduras', es: 'Armaduras', ru: 'Доспехи', icono: '🛡️' },
  { id: 'herramientas', es: 'Herramientas', ru: 'Инструменты', icono: '🛠️' },
  { id: 'otras', es: 'Otras', ru: 'Другое', icono: '✦' },
];
export interface CompPropia { id: string; tipo: TipoComp; nombre: string }
export interface CompAuto { clave: string; tipo: TipoComp; es: string; ru: string; origenes: string[] }

type Par = [string, string];
const SEN: Par = ['Armas sencillas', 'Простое оружие'];
const MAR: Par = ['Armas marciales', 'Воинское оружие'];
const LIG: Par = ['Armaduras ligeras', 'Лёгкие доспехи'];
const MED: Par = ['Armaduras medias', 'Средние доспехи'];
const PES: Par = ['Armaduras pesadas', 'Тяжёлые доспехи'];
const ESC: Par = ['Escudos', 'Щиты'];
const LADRON: Par = ['Herramientas de ladrón', 'Воровские инструменты'];

const CLASE: Record<string, { armas: Par[]; armaduras: Par[]; herramientas?: Par[] }> = {
  'Bárbaro': { armas: [SEN, MAR], armaduras: [LIG, MED, ESC] },
  'Bardo': { armas: [SEN], armaduras: [LIG] },
  'Brujo': { armas: [SEN], armaduras: [LIG] },
  'Clérigo': { armas: [SEN], armaduras: [LIG, MED, ESC] },
  'Druida': { armas: [SEN], armaduras: [LIG, ESC] },
  'Explorador': { armas: [SEN, MAR], armaduras: [LIG, MED, ESC] },
  'Guerrero': { armas: [SEN, MAR], armaduras: [LIG, MED, PES, ESC] },
  'Hechicero': { armas: [SEN], armaduras: [] },
  'Mago': { armas: [SEN], armaduras: [] },
  'Monje': { armas: [SEN, ['Armas marciales con la propiedad «ligera»', 'Воинское оружие со свойством «лёгкое»']], armaduras: [] },
  'Paladín': { armas: [SEN, MAR], armaduras: [LIG, MED, PES, ESC] },
  'Pícaro': { armas: [SEN, ['Armas marciales «ligeras» o «sutiles»', 'Воинское оружие «лёгкое» или «фехтовальное»']], armaduras: [LIG], herramientas: [LADRON] },
};
/** Al entrar por multiclase (PHB 2024). */
const MULTI: Record<string, { armas?: Par[]; armaduras?: Par[]; herramientas?: Par[] }> = {
  'Bárbaro': { armas: [MAR], armaduras: [ESC] },
  'Bardo': { armaduras: [LIG] },
  'Brujo': { armaduras: [LIG] },
  'Clérigo': { armaduras: [LIG, MED, ESC] },
  'Druida': { armaduras: [LIG, ESC] },
  'Explorador': { armas: [MAR], armaduras: [LIG, MED, ESC] },
  'Guerrero': { armas: [MAR], armaduras: [LIG, MED, ESC] },
  'Paladín': { armas: [MAR], armaduras: [LIG, MED, ESC] },
  'Pícaro': { armaduras: [LIG], herramientas: [LADRON] },
};
const DOTES: Record<string, { armas?: Par[]; armaduras?: Par[] }> = {
  'Matón de taberna': { armas: [['Armas improvisadas', 'Импровизированное оружие']] },
  'Entrenamiento con armas marciales': { armas: [MAR] },
  'Entrenamiento con armas exóticas': { armas: [['Armas exóticas', 'Экзотическое оружие']] },
  'Ligeramente acorazado': { armaduras: [LIG, ESC] },
  'Moderadamente acorazado': { armaduras: [MED] },
  'Muy acorazado': { armaduras: [PES] },
};

export const claveComp = (tipo: TipoComp, nombre: string) => `${tipo}:${normalizarTexto(nombre)}`;

const parDe = (nombre: string): Par => {
  const op = [...INSTRUMENTOS, ...ARTESANO].find((x) => x.valor === nombre);
  return op ? [op.es, op.ru] : [nombre, nombre];
};

/** Competencias automáticas (sin repetir: si dos cosas dan lo mismo, se juntan los orígenes). */
export function competenciasAuto(p: Personaje): CompAuto[] {
  const mapa = new Map<string, CompAuto>();
  const add = (tipo: TipoComp, [es, ru]: Par, origen: string) => {
    const k = claveComp(tipo, es);
    const e = mapa.get(k);
    if (e) { if (!e.origenes.includes(origen)) e.origenes.push(origen); } else mapa.set(k, { clave: k, tipo, es, ru, origenes: [origen] });
  };
  const addTodo = (d: { armas?: Par[]; armaduras?: Par[]; herramientas?: Par[] } | undefined, origen: string) => {
    d?.armas?.forEach((x) => add('armas', x, origen));
    d?.armaduras?.forEach((x) => add('armaduras', x, origen));
    d?.herramientas?.forEach((x) => add('herramientas', x, origen));
  };
  clasesDe(p).forEach((c, i) => {
    const org = T(RU_CLASES, c.clase);
    addTodo(i === 0 ? CLASE[c.clase] : MULTI[c.clase], org);
    if (c.clase === 'Clérigo' && p.elecciones?.['Clérigo:orden']?.[0] === 'Protector') addTodo({ armas: [MAR], armaduras: [PES] }, `${org} (${L('Protector', 'Защитник')})`);
    if (c.clase === 'Druida' && p.elecciones?.['Druida:orden']?.[0] === 'Guardián') addTodo({ armas: [MAR], armaduras: [MED] }, `${org} (${L('Guardián', 'Страж')})`);
    if (c.clase === 'Bardo' && c.subclase === 'Colegio del valor' && c.nivel >= 3) addTodo({ armas: [MAR], armaduras: [MED, ESC] }, `${org} (${L('Colegio del valor', 'Коллегия доблести')})`);
    for (const s of ['instrumentos', 'herramienta']) elegido(p, `${c.clase}:${s}`).forEach((n) => add('herramientas', parDe(n), org));
  });
  for (const d of p.dotes) addTodo(DOTES[d.nombre], d.nombre);
  elegido(p, 'dote:musico').forEach((n) => add('herramientas', parDe(n), 'Músico'));
  elegido(p, 'dote:fabricante').forEach((n) => add('herramientas', parDe(n), 'Fabricante'));
  return [...mapa.values()];
}

/** Texto que ponía el antiguo botón «Rellenar desde la clase» (si sigue igual, ya no hace falta mostrarlo). */
export const textoAntiguoClase = (a: { armas: string; armaduras: string; herramientas: string }) =>
  [`Armas: ${a.armas}`, `Armaduras: ${a.armaduras}`, a.herramientas && `Herramientas: ${a.herramientas}`].filter(Boolean).join('\n');
