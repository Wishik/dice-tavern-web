import { normalizarTexto, type ObjetoBase } from './data';
import type { Item, Personaje, RanuraEquipo } from './types';
import { MAX_MUNICION, uid, usaMunicion } from './rules';

const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

/** «10 antorchas» → {nombre: 'antorchas', cantidad: 10}; «raciones para 9 días» → 9 raciones; «15po» → monedas. */
export function trocearEquipo(texto: string): { objetos: { nombre: string; cantidad: number }[]; po: number } {
  let po = 0;
  const objetos: { nombre: string; cantidad: number }[] = [];
  const partes = texto.replace(/\.\s*$/, '').split(/,\s*|\s+y\s+(?=[\wáéíóúñ\d])/i).map((s) => s.trim()).filter(Boolean);
  for (const s of partes) {
    const m = s.match(/^(\d+)\s*po$/i);
    if (m) { po += +m[1]; continue; }
    let cantidad = 1; let nombre = s;
    const n = s.match(/^(\d+)\s+(.*)$/);
    const w = s.match(/^(\S+)\s+(.*)$/);
    if (n) { cantidad = +n[1]; nombre = n[2]; } else if (w && NUMEROS[w[1].toLowerCase()]) { cantidad = NUMEROS[w[1].toLowerCase()]; nombre = w[2]; }
    const dias = nombre.match(/^(raciones) para (\d+) días$/i);
    if (dias) { nombre = dias[1]; cantidad = +dias[2]; }
    objetos.push({ nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), cantidad });
  }
  return { objetos, po };
}

const singular = (s: string) => normalizarTexto(s).split(/\s+/).map((w) => (w.length > 3 && /[^aeiou]es$/.test(w) && !/(ces)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)).join(' ').replace(/\(.*?\)/g, '').trim();

const ALIAS: Record<string, string> = { 'frascos de aceite': 'Aceite', 'hojas de pergamino': 'Pergamino', 'odre': 'Cantimplora u Odre', 'disfraces': 'Disfraz' };

/** Busca el objeto en la base (nombre exacto, en singular o que empiece igual). */
export function buscarObjeto(base: ObjetoBase[], nombre: string): ObjetoBase | null {
  const alias = ALIAS[normalizarTexto(nombre)] ?? ALIAS[nombre.toLowerCase()];
  if (alias) nombre = alias;
  const n = singular(nombre);
  return base.find((o) => normalizarTexto(o.nombre) === normalizarTexto(nombre))
    ?? base.find((o) => singular(o.nombre) === n)
    ?? base.find((o) => singular(o.nombre).startsWith(n))
    ?? null;
}

/** Mete en la mochila (y en las monedas) el equipo inicial elegido, p. ej. la parte «A» y la «B» del Guerrero. */
/** `instrumento`: lo elegido para «un instrumento musical» / «herramientas de artesano o instrumento musical». */
export function meterEquipoInicial(p: Personaje, descripcion: string, base: ObjetoBase[], instrumento?: string) {
  const { objetos, po } = trocearEquipo(descripcion.replace(/\.\s+/g, ', '));
  const items: Item[] = objetos.map((o) => {
    const nombre = instrumento && /instrumento musical/i.test(o.nombre) ? instrumento : o.nombre;
    const b = buscarObjeto(base, nombre);
    return b
      ? { id: uid(), nombre: b.nombre, descripcion: b.descripcion, precio: b.precio, cantidad: o.cantidad, tipo: b.tipo, detalles: b.detalles, maxPorEspacio: b.maxPorEspacio }
      : { id: uid(), nombre, descripcion: '', precio: '', cantidad: o.cantidad, tipo: 'otro' };
  });
  // Las flechas o virotes van dentro del arco o la ballesta (la munición se cuenta en el arma).
  for (const arma of items.filter(usaMunicion)) {
    const mun = items.find((i) => i.tipo === 'consumible' && /flecha|virote|bala|dardo|proyectil/i.test(i.nombre));
    if (!mun) break;
    arma.municion = Math.min(MAX_MUNICION, mun.cantidad);
    items.splice(items.indexOf(mun), 1);
  }
  // Se pone puesto lo que se puede: armadura, escudo y la primera arma cuerpo a cuerpo.
  const ponerSi = (r: RanuraEquipo, f: (i: Item) => boolean) => {
    if (p.equipo[r]) return;
    const it = items.find(f);
    if (it) { p.equipo[r] = it.cantidad > 1 ? { ...it, cantidad: 1 } : it; if (it.cantidad > 1) it.cantidad -= 1; else items.splice(items.indexOf(it), 1); }
  };
  ponerSi('armadura', (i) => i.tipo === 'armadura');
  ponerSi('manoHabil', (i) => i.tipo === 'arma' && !usaMunicion(i) && !/dos manos/i.test(i.detalles?.['Propiedades'] ?? ''));
  if (!p.equipo.manoHabil) ponerSi('manoHabil', (i) => i.tipo === 'arma');
  if (!/dos manos/i.test(p.equipo.manoHabil?.detalles?.['Propiedades'] ?? '')) ponerSi('manoTorpe', (i) => i.tipo === 'escudo');
  p.mochila.push(...items);
  p.monedas.PO = (p.monedas.PO ?? 0) + po;
}
