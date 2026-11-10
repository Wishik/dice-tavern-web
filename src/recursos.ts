import type { Clase } from './data';
import type { Personaje } from './types';
import { modificador } from './rules';

/** Recurso de clase con usos limitados que se recupera con un descanso largo. */
export interface Recurso { id: string; es: string; ru: string; max: number }

/** Columnas de la tabla de cada clase que son usos (Furias, Puntos de ki…). */
const COLUMNAS: Record<string, { col: string; id: string; es: string; ru: string }[]> = {
  'Bárbaro': [{ col: 'Furias', id: 'furia', es: 'Furia', ru: 'Ярость' }],
  'Clérigo': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал' }],
  'Paladín': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал' }],
  'Druida': [{ col: 'Forma salvaje', id: 'formaSalvaje', es: 'Forma salvaje', ru: 'Дикий облик' }],
  'Explorador': [{ col: 'Enemigo predilecto', id: 'enemigoPredilecto', es: 'Enemigo predilecto', ru: 'Излюбленный враг' }],
  'Guerrero': [{ col: 'Tomar aliento', id: 'tomarAliento', es: 'Tomar aliento', ru: 'Второе дыхание' }],
  'Hechicero': [{ col: 'Puntos de hechicería', id: 'puntosHechiceria', es: 'Puntos de hechicería', ru: 'Очки чародейства' }],
  'Monje': [{ col: 'Puntos de ki', id: 'ki', es: 'Puntos de ki', ru: 'Очки ки' }],
};

/** Recursos de la clase del personaje a su nivel actual, sacados de la tabla de la clase del manual. */
export function recursosClase(p: Personaje, clase: Clase | null | undefined): Recurso[] {
  if (!clase) return [];
  const fila = clase.tabla.find((f) => f.nivel === p.nivel) ?? clase.tabla[clase.tabla.length - 1];
  const out: Recurso[] = [];
  for (const c of COLUMNAS[clase.nombre] ?? []) {
    const n = parseInt(String(fila?.[c.col] ?? ''), 10);
    if (n > 0) out.push({ id: c.id, es: c.es, ru: c.ru, max: n });
  }
  // Sin columna en la tabla: usos según el texto del rasgo.
  if (clase.nombre === 'Bardo') out.unshift({ id: 'inspiracionBardica', es: 'Inspiración bárdica', ru: 'Бардовское вдохновение', max: Math.max(1, modificador(p.caracteristicas.CAR)) });
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
  x.agotamiento = Math.max(0, (x.agotamiento ?? 0) - 1);
  x.muerte = { exitos: 0, fallos: 0 };
  if (x.pg.actual > 0) x.estados = (x.estados ?? []).filter((e) => e !== 'inconsciente' && e !== 'moribundo');
}
