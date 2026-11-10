import type { Clase } from './data';
import type { Personaje } from './types';
import { bonoCompetencia, modificador } from './rules';

/**
 * Recurso de clase o raza con usos limitados. Todos se recuperan con un descanso largo;
 * `corto` dice qué devuelve un descanso corto (uno o todos). `acumula`: cuenta lo que se acumula (p. ej. estrés) en vez de lo que queda.
 */
export interface Recurso { id: string; es: string; ru: string; max: number; corto?: 'uno' | 'todos'; acumula?: boolean }

/** Columnas de la tabla de cada clase que son usos (Furias, Puntos de ki…). */
// Qué recupera el descanso corto, según el manual: Furia, Canalizar divinidad, Forma salvaje y Tomar aliento recuperan uno; el ki, todos.
const COLUMNAS: Record<string, { col: string; id: string; es: string; ru: string; corto?: 'uno' | 'todos' }[]> = {
  'Bárbaro': [{ col: 'Furias', id: 'furia', es: 'Furia', ru: 'Ярость', corto: 'uno' }],
  'Clérigo': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал', corto: 'uno' }],
  'Paladín': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал', corto: 'uno' }],
  'Druida': [{ col: 'Forma salvaje', id: 'formaSalvaje', es: 'Forma salvaje', ru: 'Дикий облик', corto: 'uno' }],
  'Explorador': [{ col: 'Enemigo predilecto', id: 'enemigoPredilecto', es: 'Enemigo predilecto', ru: 'Излюбленный враг' }],
  'Guerrero': [{ col: 'Tomar aliento', id: 'tomarAliento', es: 'Tomar aliento', ru: 'Второе дыхание', corto: 'uno' }],
  'Hechicero': [{ col: 'Puntos de hechicería', id: 'puntosHechiceria', es: 'Puntos de hechicería', ru: 'Очки чародейства' }],
  'Monje': [{ col: 'Puntos de ki', id: 'ki', es: 'Puntos de ki', ru: 'Очки ки', corto: 'todos' }],
};

const TROLES = ['Trol de hielo (Drakkari)', 'Trol de la jungla (Gurubashi)', 'Trol del bosque (Amani)', 'Trol lanza-negra', 'Trol zandalari'];
const tieneRasgo = (p: Personaje, nombre: string) => (p.rasgosRaza ?? []).some((r) => r.toLowerCase() === nombre.toLowerCase());

/** Recursos que da la raza (o un rasgo racial elegido). */
export function recursosRaza(p: Personaje): Recurso[] {
  const out: Recurso[] = [];
  if (TROLES.includes(p.raza)) out.push({ id: 'trance', es: 'Puntos de Trance', ru: 'Очки транса', max: bonoCompetencia(p.nivel), corto: 'uno' });
  if (p.raza === 'Norn') out.push(
    { id: 'formaTotal', es: 'Forma total', ru: 'Полный облик', max: 1 },
    { id: 'estres', es: 'Estrés espiritual', ru: 'Духовный стресс', max: 3, corto: 'uno', acumula: true },
  );
  if (tieneRasgo(p, 'Agilidad Zorruna')) out.push({ id: 'agilidadZorruna', es: 'Agilidad zorruna', ru: 'Лисья ловкость', max: 1, corto: 'todos' });
  if (tieneRasgo(p, 'Concentración Firme')) out.push({ id: 'concentracionFirme', es: 'Concentración firme', ru: 'Твёрдая концентрация', max: 1, corto: 'todos' });
  return out;
}

/** Todos los recursos con usos del personaje: los de su clase y los de su raza. */
export const recursosPersonaje = (p: Personaje, clase: Clase | null | undefined) => [...recursosClase(p, clase), ...recursosRaza(p)];

/** Recursos de la clase del personaje a su nivel actual, sacados de la tabla de la clase del manual. */
export function recursosClase(p: Personaje, clase: Clase | null | undefined): Recurso[] {
  if (!clase) return [];
  const fila = clase.tabla.find((f) => f.nivel === p.nivel) ?? clase.tabla[clase.tabla.length - 1];
  const out: Recurso[] = [];
  for (const c of COLUMNAS[clase.nombre] ?? []) {
    const n = parseInt(String(fila?.[c.col] ?? ''), 10);
    if (n > 0) out.push({ id: c.id, es: c.es, ru: c.ru, max: n, corto: c.corto });
  }
  // Sin columna en la tabla: usos según el texto del rasgo.
  if (clase.nombre === 'Bardo') out.unshift({ id: 'inspiracionBardica', es: 'Inspiración bárdica', ru: 'Бардовское вдохновение', max: Math.max(1, modificador(p.caracteristicas.CAR)), corto: p.nivel >= 5 ? 'todos' : undefined });
  if (clase.nombre === 'Paladín') out.unshift({ id: 'imponerManos', es: 'Imponer las manos (PG)', ru: 'Наложение рук (хиты)', max: 5 * p.nivel });
  return out;
}

/** Dados de golpe que se recuperan con un descanso largo: la mitad del máximo, redondeando abajo (mínimo 1). */
export const dgRecuperados = (nivel: number) => Math.max(1, Math.floor(nivel / 2));

/** Descanso largo: PG y maná al máximo, mitad de los DG, todos los recursos de clase, −1 agotamiento. */
export function descansoLargo(x: Personaje) {
  x.pg.actual = x.pg.max;
  x.pg.temp = 0;
  x.pm.actual = x.pm.max;
  x.dgUsados = Math.max(0, x.dgUsados - dgRecuperados(x.nivel));
  x.recursosUsados = {};
  x.descansosCortos = 0;
  x.agotamiento = Math.max(0, (x.agotamiento ?? 0) - 1);
  x.muerte = { exitos: 0, fallos: 0 };
  if (x.pg.actual > 0) x.estados = (x.estados ?? []).filter((e) => e !== 'inconsciente' && e !== 'moribundo');
}

/** Bonificador extra al tirar un dado de golpe (Taratuga: + bonificador por competencia en descanso corto). */
export const extraDadoGolpe = (p: Personaje) => (p.raza === 'Taratuga' ? bonoCompetencia(p.nivel) : 0);

/** Descanso corto: devuelve los usos que marca el manual y quita 1 de agotamiento al Explorador de nivel 10+. Devuelve qué ha recuperado. */
export function descansoCorto(x: Personaje, clase: Clase | null | undefined): string[] {
  const hecho: string[] = [];
  const usados = { ...(x.recursosUsados ?? {}) };
  for (const r of recursosPersonaje(x, clase)) {
    const u = usados[r.id] ?? 0;
    if (!r.corto || u <= 0) continue;
    usados[r.id] = r.corto === 'todos' ? 0 : u - 1;
    hecho.push(r.id);
  }
  x.recursosUsados = usados;
  x.descansosCortos = (x.descansosCortos ?? 0) + 1;
  if (x.clase === 'Explorador' && x.nivel >= 10 && x.agotamiento > 0) { x.agotamiento -= 1; hecho.push('agotamiento'); }
  return hecho;
}

/** Texto de lo que recupera un descanso corto, para avisar antes de hacerlo. */
export function resumenCorto(p: Personaje, clase: Clase | null | undefined, ru: boolean): string[] {
  const out = recursosPersonaje(p, clase).filter((r) => r.corto).map((r) => `${ru ? r.ru : r.es} (${r.corto === 'todos' ? (ru ? 'все' : 'todos') : '+1'})`);
  if (p.clase === 'Explorador' && p.nivel >= 10) out.push(ru ? 'истощение −1' : 'agotamiento −1');
  return out;
}
