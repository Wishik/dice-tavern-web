import { nivelEn, nivelTotal } from './multiclase';
import type { Conjuro, Razas } from './data';
import type { ConjuroPersonaje, Personaje } from './types';
import { bonoCompetencia } from './rules';

/**
 * Conjuros que dan los rasgos de raza y las dotes del manual.
 * Se añaden solos a «Conjuros adicionales» (no cuentan para el límite de la clase) al llegar al nivel indicado;
 * cuando hay que elegir, la hoja lo pide en la pestaña de conjuros.
 */
export interface Eleccion {
  cantidad: number;
  /** Lista cerrada de conjuros entre los que elegir… */
  de?: string[];
  /** …o un filtro sobre la lista de conjuros. */
  nivelConjuro?: number;
  clases?: string[];
  escuelas?: string[];
  /** Solo conjuros que se pueden lanzar como ritual. */
  ritual?: boolean;
  /** La cantidad es el bonificador por competencia (sube con el nivel). */
  porBC?: boolean;
}
/** Cuántos conjuros se eligen ahora. */
export const cantidadEleccion = (e: Eleccion, p: Personaje) => (e.porBC ? bonoCompetencia(nivelTotal(p)) : e.cantidad);
export interface Concesion { id: string; nivel: number; conjuros?: string[]; elegir?: Eleccion }
export interface Fuente { rasgo: string; razas?: string[]; dote?: boolean; /** Invocación sobrenatural elegida (p.elecciones['Brujo:invocaciones']). */ invocacion?: boolean; concesiones: Concesion[] }

const TROLES = ['Trol de hielo (Drakkari)', 'Trol de la jungla (Gurubashi)', 'Trol del bosque (Amani)', 'Trol lanza-negra', 'Trol zandalari'];
const tiefling = (rasgo: string, truco: string, n3: string, n5: string): Fuente => ({
  rasgo, razas: ['Tiefling'], concesiones: [
    { id: `${rasgo}:1`, nivel: 1, conjuros: [truco] }, { id: `${rasgo}:3`, nivel: 3, conjuros: [n3] }, { id: `${rasgo}:5`, nivel: 5, conjuros: [n5] },
  ],
});

const inv = (rasgo: string, conjuro: string): Fuente => ({ rasgo, invocacion: true, concesiones: [{ id: `invocacion:${rasgo}`, nivel: 1, conjuros: [conjuro] }] });
export const FUENTES: Fuente[] = [
  inv('Armadura de sombras', 'Armadura de mago'), inv('Don de las profundidades', 'Respirar bajo el agua'), inv('Maestro de las formas innumerables', 'Alterar el propio aspecto'),
  inv('Mascara de los mil rostros', 'Disfrazarse'), inv('Paso ascendente', 'Levitar'), inv('Salto sobrenatural', 'Salto'), inv('Susurros del sepulcro', 'Hablar con los muertos'),
  inv('Uno con la sombra', 'Invisibilidad'), inv('Vigor infernal', 'Falsa vida'), inv('Visiones brumosas', 'Imagen silenciosa'), inv('Visiones de reinos remotos', 'Ojo arcano'),
  inv('Pacto de la cadena', 'Encontrar familiar'),
  { rasgo: 'Pacto del grimorio', invocacion: true, concesiones: [
    { id: 'invocacion:grimorio:trucos', nivel: 1, elegir: { cantidad: 3, nivelConjuro: 0 } },
    { id: 'invocacion:grimorio:rituales', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 1, ritual: true } }] },
  { rasgo: 'Portador de Luz', razas: ['Aasimar'], concesiones: [{ id: 'aasimar:1', nivel: 1, conjuros: ['Luz'] }, { id: 'aasimar:5', nivel: 5, conjuros: ['Luz del día'] }] },
  { rasgo: 'Llamar al viento', razas: ['Avianthar'], concesiones: [{ id: 'avianthar:1', nivel: 1, conjuros: ['Ráfaga de viento'] }] },
  { rasgo: 'Magia del Bosque', razas: ['Elfos de los Bosques'], concesiones: [{ id: 'elfoBosque:1', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 0, clases: ['druida'] } }] },
  { rasgo: 'Magia del Bosque', razas: ['Semi-Elfo del Bosque'], concesiones: [{ id: 'semielfoBosque:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 0, clases: ['druida'] } }] },
  { rasgo: 'Magia Drow', razas: ['Elfo Oscuro (Drow)'], concesiones: [
    { id: 'drow:1', nivel: 1, conjuros: ['Luces danzantes'] },
    { id: 'drow:1b', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 0, clases: ['mago', 'brujo'] } },
    { id: 'drow:3', nivel: 3, conjuros: ['Fuego feérico'] }, { id: 'drow:5', nivel: 5, conjuros: ['Oscuridad'] },
  ] },
  { rasgo: 'Magia Drow', razas: ['Semi-Elfo Oscuro (Ni’Ssilin)'], concesiones: [{ id: 'nissilin:1', nivel: 1, conjuros: ['Luces danzantes'] }, { id: 'nissilin:3', nivel: 3, conjuros: ['Fuego feérico'] }] },
  { rasgo: 'Magia Duergar', razas: ['Enanos Grises (Duergar)'], concesiones: [{ id: 'duergar:1', nivel: 1, conjuros: ['Agrandar/Reducir'] }, { id: 'duergar:3', nivel: 3, conjuros: ['Invisibilidad'] }] },
  { rasgo: 'Poder Psiónico Gith', razas: ['Githyanki'], concesiones: [
    { id: 'gith:1', nivel: 1, conjuros: ['Mano de mago'] },
    { id: 'gith:3', nivel: 3, elegir: { cantidad: 1, de: ['Salto', 'Escudo'] } },
    { id: 'gith:5', nivel: 5, elegir: { cantidad: 1, de: ['Paso brumoso', 'Detectar pensamientos'] } },
  ] },
  { rasgo: 'Magia Gnomica', razas: ['Gnomo'], concesiones: [{ id: 'gnomo:1', nivel: 1, elegir: { cantidad: 1, de: ['Detectar magia', 'Dormir', 'Escudo', 'Ola atronadora', 'Proyectil mágico'] } }] },
  { rasgo: 'Afinidad Mágica', razas: ['Gnomos Grises (Svirfneblin)'], concesiones: [{ id: 'svirfneblin:1', nivel: 1, elegir: { cantidad: 1, de: ['Imagen silenciosa', 'Armadura de mago', 'Hechizar persona', 'Orbe cromático', 'Risa horrible de Tasha'] } }] },
  { rasgo: 'Llamas Azules', razas: ['Kitsune'], concesiones: [{ id: 'kitsuneLlama:1', nivel: 1, conjuros: ['Crear llama'] }] },
  { rasgo: 'Magia Kitsune', razas: ['Kitsune'], concesiones: [{ id: 'kitsune:1', nivel: 1, conjuros: ['Prestidigitación'] }, { id: 'kitsune:3', nivel: 3, conjuros: ['Hechizar persona'] }, { id: 'kitsune:5', nivel: 5, conjuros: ['Imagen múltiple'] }] },
  { rasgo: 'Magia Sylvari', razas: ['Sylvari'], concesiones: [
    { id: 'sylvari:1', nivel: 1, conjuros: ['Látigo de espinas'] }, { id: 'sylvari:3', nivel: 3, conjuros: ['Enmarañar'] },
    { id: 'sylvari:5', nivel: 5, elegir: { cantidad: 1, de: ['Crecimiento espinoso', 'Espíritu sanador'] } },
  ] },
  tiefling('Legado de Baalzebul', 'Taumaturgia', 'Rayo debilitador', 'Corona de la locura'),
  tiefling('Legado de Levistus', 'Rayo de escarcha', 'Armadura de Agathys', 'Oscuridad'),
  tiefling('Legado de Mammon', 'Mano de mago', 'Disco flotante de Tenser', 'Cerradura arcana'),
  tiefling('Legado de Mefistófeles', 'Mano de mago', 'Manos ardientes', 'Hoja de fuego'),
  tiefling('Legado de Zariel', 'Taumaturgia', 'Castigo abrasador', 'Castigo brillante'),
  tiefling('Legado de Maladomini', 'Burla dañina', 'Hechizar persona', 'Embelesar'),
  tiefling('Legado de Dispater', 'Taumaturgia', 'Disfrazarse', 'Detectar pensamientos'),
  tiefling('Legado de Phlegethos', 'Amistad', 'Hechizar persona', 'Sugestión'),
  tiefling('Legado de Malebolgia', 'Ilusión menor', 'Disfrazarse', 'Invisibilidad'),
  { rasgo: 'Pacto con los Loa', razas: TROLES, concesiones: [{ id: 'loa:1', nivel: 1, conjuros: ['Taumaturgia'] }, { id: 'loa:3', nivel: 3, conjuros: ['Protección contra el bien y el mal'] }, { id: 'loa:5', nivel: 5, conjuros: ['Auxilio'] }] },
  { rasgo: 'Aléjate del vudú', razas: ['Trol lanza-negra'], concesiones: [
    { id: 'vudu:1', nivel: 1, elegir: { cantidad: 1, de: ['Fragmento mental', 'Tañido por los muertos'] } },
    { id: 'vudu:3', nivel: 3, elegir: { cantidad: 1, de: ['Maleficio', 'Perdición'] } },
    { id: 'vudu:5', nivel: 5, elegir: { cantidad: 1, de: ['Clavo mental', 'Corona de la locura', 'Sugestión'] } },
  ] },
  { rasgo: 'Bendición de los Loa', razas: ['Trol zandalari'], concesiones: [{ id: 'zandalari:1', nivel: 1, conjuros: ['Bendición'] }] },
  { rasgo: 'Vampiro', concesiones: [{ id: 'vampiro:1', nivel: 1, conjuros: ['Hechizar persona'] }] },
  // Dotes
  { rasgo: 'Iniciado en la magia', dote: true, concesiones: [
    { id: 'iniciado:trucos', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 0, clases: ['clérigo', 'druida', 'mago'] } },
    { id: 'iniciado:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, clases: ['clérigo', 'druida', 'mago'] } },
  ] },
  { rasgo: 'Influencia feérica', dote: true, concesiones: [
    { id: 'feerica:fijo', nivel: 1, conjuros: ['Paso brumoso'] },
    { id: 'feerica:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, escuelas: ['adivinación', 'encantamiento'] } },
  ] },
  { rasgo: 'Influencia sombría', dote: true, concesiones: [
    { id: 'sombria:fijo', nivel: 1, conjuros: ['Invisibilidad'] },
    { id: 'sombria:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, escuelas: ['ilusionismo', 'nigromancia'] } },
  ] },
  { rasgo: 'Lanzador ritual', dote: true, concesiones: [{ id: 'ritual', nivel: 1, elegir: { cantidad: 2, porBC: true, nivelConjuro: 1, ritual: true } }] },
  { rasgo: 'Telepático', dote: true, concesiones: [{ id: 'telepatico', nivel: 1, conjuros: ['Detectar pensamientos'] }] },
  { rasgo: 'Telequinético', dote: true, concesiones: [{ id: 'telequinetico', nivel: 1, conjuros: ['Mano de mago'] }] },
];

/** Conjuros que no están en la lista del manual: nivel para poder añadirlos igualmente. */
const SIN_DATOS: Record<string, number> = { 'Espíritu sanador': 2 };

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;

/** ¿El personaje tiene activo este rasgo o dote? Los rasgos fijos de la raza cuentan siempre; los demás, si los eligió. */
export function fuenteActiva(f: Fuente, p: Personaje, razas: Razas | null): boolean {
  if (f.invocacion) return nivelEn(p, 'Brujo') > 0 && (p.elecciones?.['Brujo:invocaciones'] ?? []).some((n) => igual(n, f.rasgo));
  if (f.dote) return (p.dotes ?? []).some((d) => igual(d.nombre, f.rasgo));
  if (f.razas && !f.razas.includes(p.raza)) return false;
  if ((p.rasgosRaza ?? []).some((r) => igual(r, f.rasgo))) return true;
  const raza = razas?.razas.find((r) => r.nombre === p.raza);
  return !!raza?.rasgosFijos.some((r) => igual(r.nombre, f.rasgo));
}

/** Concesiones que ya le tocan al personaje (fuente activa y nivel alcanzado). */
export function concesionesActivas(p: Personaje, razas: Razas | null): (Concesion & { fuente: Fuente })[] {
  return FUENTES.filter((f) => fuenteActiva(f, p, razas)).flatMap((f) => f.concesiones.filter((c) => p.nivel >= c.nivel).map((c) => ({ ...c, fuente: f })));
}

/** Elecciones pendientes (hay que escoger conjuro). */
export function eleccionesPendientes(p: Personaje, razas: Razas | null) {
  return concesionesActivas(p, razas).filter((c) => c.elegir && (p.eleccionesConjuros?.[c.id]?.length ?? 0) < cantidadEleccion(c.elegir, p));
}

/** Opciones posibles para una elección. */
export function opcionesEleccion(e: Eleccion, todos: Conjuro[]): { nombre: string; nivel: number }[] {
  if (e.de) return e.de.map((n) => { const c = todos.find((x) => igual(x.nombre, n)); return { nombre: c?.nombre ?? n, nivel: c?.nivel ?? SIN_DATOS[n] ?? 1 }; });
  return todos.filter((c) => (e.nivelConjuro === undefined || c.nivel === e.nivelConjuro)
    && (!e.clases || e.clases.some((k) => c.clases.includes(k)))
    && (!e.escuelas || e.escuelas.includes(c.escuela))
    && (!e.ritual || /ritual/i.test(c.tiempo)))
    .map((c) => ({ nombre: c.nombre, nivel: c.nivel })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Pone en la lista de conjuros los que dan raza y dotes (como adicionales, con su `origen`)
 * y quita los que ya no tocan (rasgo o dote quitados, elección cambiada). Devuelve true si ha cambiado algo.
 */
export function sincronizarConjuros(x: Personaje, razas: Razas | null, todos: Conjuro[]): boolean {
  const deseados: { nombre: string; nivel: number; origen: string }[] = [];
  for (const c of concesionesActivas(x, razas)) {
    const nombres = c.conjuros ?? (x.eleccionesConjuros?.[c.id] ?? []).slice(0, cantidadEleccion(c.elegir!, x));
    for (const n of nombres) {
      const d = todos.find((s) => igual(s.nombre, n));
      deseados.push({ nombre: d?.nombre ?? n, nivel: d?.nivel ?? SIN_DATOS[n] ?? 1, origen: c.id });
    }
  }
  let cambia = false;
  // Fuera los que ya no tocan.
  const antes = x.conjuros.length;
  x.conjuros = x.conjuros.filter((c) => !c.origen || deseados.some((d) => d.origen === c.origen && igual(d.nombre, c.nombre)));
  if (x.conjuros.length !== antes) cambia = true;
  for (const d of deseados) {
    if (x.conjuros.some((c) => c.origen === d.origen && igual(c.nombre, d.nombre))) continue;
    // Si ya lo tenía puesto a mano, se pasa a adicionales (así deja libre el hueco de la clase).
    const yaEsta = x.conjuros.find((c) => !c.origen && igual(c.nombre, d.nombre));
    if (yaEsta) { yaEsta.adicional = true; yaEsta.origen = d.origen; yaEsta.preparado = undefined; }
    else x.conjuros.push({ nombre: d.nombre, nivel: d.nivel, adicional: true, origen: d.origen } as ConjuroPersonaje);
    cambia = true;
  }
  return cambia;
}
