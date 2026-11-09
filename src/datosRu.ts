import { idioma } from './i18n';

/** Traducción al ruso de los textos del manual (conjuros, rasgos, dotes, objetos…).
 *  Los datos siguen en español (la lógica busca por esos textos); solo se traduce lo que se muestra. */
const ARCHIVOS = ['spells', 'dotes', 'gear', 'armas', 'razas', 'trasfondos', 'monturas', 'clases'];
let dic: Record<string, string> = {};
let carga: Promise<void> | null = null;

export function cargarRu(): Promise<void> {
  if (!carga) carga = Promise.all(ARCHIVOS.map((a) => fetch(`/data/ru/${a}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))))
    .then((ls: Record<string, string>[]) => { dic = Object.assign({}, ...ls); });
  return carga;
}

/** Texto del manual en el idioma actual (si no hay traducción, el original). */
export const td = (s: string | undefined | null): string => {
  if (!s) return s ?? '';
  return idioma() === 'ru' ? dic[s] ?? s : s;
};
