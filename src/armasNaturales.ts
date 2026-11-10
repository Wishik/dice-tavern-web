import type { Clase } from './data';
import type { Item, Personaje } from './types';
import { RASGOS_FIJOS } from './fijos';
import { L } from './i18n';

/**
 * Ataques que no salen de un objeto: golpe sin armas (artes marciales del monje, Matón de taberna…)
 * y armas naturales de las razas (garras, mordisco, cola…). Se muestran en Combate como un arma más.
 */
export interface ArmaNatural { it: Item; donde: string; /** Daño extra fijo del ataque (p. ej. +1d4 necrótico). */ extra?: string }

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;
const AMBAS = 'Sutil'; // «Puede usarse tanto con Fuerza como con Destreza»: bonoArma coge la mejor.
const porNivel = (n: number, t: [number, string][]) => t.filter(([d]) => n >= d).pop()?.[1] ?? t[0][1];

interface Def { razas: string[]; rasgo: string; ataques: (p: Personaje) => { es: string; ru: string; dano: string; tipo_es: string; tipo_ru: string; veces: number; extra?: string; nota_es?: string; nota_ru?: string }[] }
const MORDISCO = { es: 'Mordisco', ru: 'Укус', dano: '1d6', tipo_es: 'perforante', tipo_ru: 'колющий', veces: 1 };
const GARRAS = { es: 'Garras', ru: 'Когти', dano: '2d4', tipo_es: 'cortante o perforante', tipo_ru: 'рубящий или колющий', veces: 2 };
const COLA = { es: 'Cola', ru: 'Хвост', dano: '1d8', tipo_es: 'contundente', tipo_ru: 'дробящий', veces: 1 };

const DEFS: Def[] = [
  { razas: ['Charr', 'Dracónido', 'Taratuga'], rasgo: 'Armas naturales', ataques: (p) => p.raza === 'Dracónido' ? [MORDISCO, GARRAS, COLA] : [MORDISCO, GARRAS] },
  { razas: ['Avianthar'], rasgo: 'Armas naturales', ataques: () => [{ ...MORDISCO, es: 'Picotazo', ru: 'Клевок', dano: '1d4' }, GARRAS] },
  { razas: ['Félidos'], rasgo: 'Garras', ataques: () => [GARRAS] },
  { razas: ['Kobold'], rasgo: 'Cola (x1)', ataques: () => [COLA] },
  { razas: ['Diablillo'], rasgo: 'Garras Necróticas (x2)', ataques: () => [{ ...GARRAS, es: 'Garras necróticas', ru: 'Некротические когти', dano: '1d4', extra: '+1d4', tipo_es: 'cortante o perforante + necrótico', tipo_ru: 'рубящий или колющий + некротический', nota_es: 'TS de Constitución o Corrupción.', nota_ru: 'Спасбросок Телосложения, иначе Порча.' }] },
  { razas: ['Araina'], rasgo: 'Mordisco paralizante', ataques: () => [{ ...MORDISCO, es: 'Mordisco paralizante', ru: 'Парализующий укус', dano: '1d4', tipo_es: 'veneno', tipo_ru: 'ядом', nota_es: 'TS de Constitución o paralizado.', nota_ru: 'Спасбросок Телосложения, иначе паралич.' }] },
  { razas: ['Reptilianos'], rasgo: 'Mordisco', ataques: () => [
    { ...MORDISCO, es: 'Mordisco tóxico', ru: 'Ядовитый укус', nota_es: 'Si lo elegiste. TS de Constitución o envenenado.', nota_ru: 'Если выбран. Спасбросок Телосложения, иначе отравлен.' },
    { ...MORDISCO, es: 'Frenesí voraz', ru: 'Ненасытное бешенство', dano: '1d4', nota_es: 'Si lo elegiste. Acción adicional.', nota_ru: 'Если выбран. Бонусное действие.' }] },
  { razas: ['Norn'], rasgo: 'Bendición de los Espíritus', ataques: (p) => [
    { ...GARRAS, es: 'Garras (forma híbrida)', ru: 'Когти (гибридный облик)', dano: porNivel(p.nivel, [[1, '2d4'], [5, '2d6'], [11, '2d8'], [17, '2d10']]) },
    { ...MORDISCO, es: 'Mordisco o picotazo (forma híbrida)', ru: 'Укус или клевок (гибридный облик)', dano: porNivel(p.nivel, [[1, '1d6'], [5, '1d8'], [11, '1d10'], [17, '1d12']]) }] },
];

const item = (id: string, nombre: string, dano: string, tipo: string, props: string, desc = ''): Item =>
  ({ id, nombre, descripcion: desc, precio: '', cantidad: 1, tipo: 'arma', detalles: { 'Daño': `${dano} ${tipo}`, 'Propiedades': props } });

const columna = (clase: Clase | null | undefined, p: Personaje, col: string) => String((clase?.tabla.find((f) => f.nivel === p.nivel) ?? clase?.tabla[clase.tabla.length - 1])?.[col] ?? '');

export function armasNaturales(p: Personaje, clase: Clase | null | undefined): ArmaNatural[] {
  const out: ArmaNatural[] = [];
  const rasgos = [...(RASGOS_FIJOS[p.raza] ?? []), ...(p.rasgosRaza ?? [])];
  for (const d of DEFS) {
    if (!d.razas.includes(p.raza) || !rasgos.some((r) => igual(r, d.rasgo))) continue;
    for (const a of d.ataques(p)) {
      const nombre = L(a.es, a.ru) + (a.veces > 1 ? ` ×${a.veces}` : '');
      out.push({ it: item(`nat:${a.es}`, nombre, a.dano, L(a.tipo_es, a.tipo_ru), AMBAS, L(a.nota_es ?? '', a.nota_ru ?? '')), donde: L('Arma natural', 'Природное оружие'), extra: a.extra });
    }
  }
  // Golpe sin armas: todo el mundo puede; el monje, Matón de taberna y Combate sin armas lo mejoran.
  const tiene = (d: string) => (p.dotes ?? []).some((x) => igual(x.nombre, d));
  const manosLibres = !p.equipo.manoHabil && !p.equipo.manoTorpe;
  let dano = '1', props = '', fuente = '';
  if (tiene('Matón de taberna')) { dano = '1d4'; fuente = 'Matón de taberna'; }
  if (tiene('Combate sin armas')) { dano = manosLibres ? '1d8' : '1d6'; fuente = 'Combate sin armas'; }
  if (p.clase === 'Monje') {
    const dm = columna(clase, p, 'Artes marciales') || '1d6';
    const caras = (x: string) => parseInt(x.split('d')[1] ?? '0', 10);
    if (caras(dm) >= caras(dano)) { dano = dm; fuente = L('Artes marciales', 'Боевые искусства'); }
    props = AMBAS; // Ataques diestros: FUE o DES.
  }
  out.push({ it: item('nat:sinArmas', L('Golpe sin armas', 'Безоружный удар'), dano, L('contundente', 'дробящий'), props), donde: fuente || L('Puños, patadas…', 'Кулаки, пинки…') });
  return out;
}
