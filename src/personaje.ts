import { ATRIBUTOS, type Atributo, type Montura, type Personaje } from './types';
import { HABILIDADES, uid } from './rules';

export function nuevoPersonaje(nombre = ''): Personaje {
  const ahora = new Date().toISOString();
  const car = Object.fromEntries(ATRIBUTOS.map((a) => [a, 10])) as Record<Atributo, number>;
  return {
    id: uid(), version: 1, creado: ahora, actualizado: ahora,
    nombre, foto: '', tamano: '', edad: '', raza: '', clase: '', subclase: '', nivel: 1, exp: 0,
    trasfondoEstilo: '', trasfondo: '', personalidad: '',
    competencias: '', alineamiento: { orden: '', moral: '' }, idiomas: {}, oficios: {}, profesiones: {},
    estados: [], estadosDetalle: {}, agotamiento: 0, iniciativaActual: null, bloqueado: false,
    pg: { max: 0, actual: 0, temp: 0 }, pm: { max: 0, actual: 0 }, inspiracion: 0, dgUsados: 0, subidasPendientes: 0,
    caracteristicas: car, bonusIniciativa: 0,
    velocidad: { andando: 30, corriendo: 60, trepando: '', nadando: '', volando: '' },
    ca: '', bonusCA: 0, caV2: true, bonusPercepcionPasiva: 0, recursos: '', recursosUsados: {}, descansosCortos: 0,
    ataquesTurno: { habil: 1, torpe: 0 }, ataques: [],
    conjuroCaracteristica: '', conjurosTurno: { estandar: '', adicional: '' },
    salvaciones: Object.fromEntries(ATRIBUTOS.map((a) => [a, { comp: false, bonus: 0 }])) as Personaje['salvaciones'],
    muerte: { exitos: 0, fallos: 0 },
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { comp: false, pericia: false, bonus: 0 }])),
    rasgosRaza: [], eleccionesConjuros: {}, rasgos: [], dotes: [], conjuros: [],
    equipo: { yelmo: null, amuleto: null, armadura: null, capa: null, manoHabil: null, manoTorpe: null },
    mochila: [], cinturon: { tamano: 'pequeño', items: [] },
    viaje: { raciones: 0, odre: 0, pedernal: 0, antorchas: 0, cuerda: '', ropa: '', sacoDormir: false, manta: false, tienda: '' },
    monedas: { PM: 0, PL: 0, PO: 0, PE: 0, PP: 0, PC: 0 },
    monturas: [],
    notas: '',
  };
}

/** Completa campos que falten en personajes guardados con versiones anteriores. */
export function normalizar(p: Partial<Personaje>): Personaje {
  const base = nuevoPersonaje();
  const out = { ...base, ...p } as Personaje;
  for (const k of ['caracteristicas', 'velocidad', 'pg', 'pm', 'equipo', 'viaje', 'monedas', 'alineamiento', 'ataquesTurno', 'conjurosTurno', 'muerte', 'cinturon'] as const) {
    (out as unknown as Record<string, unknown>)[k] = { ...(base[k] as object), ...((p as Record<string, unknown>)[k] as object ?? {}) };
  }
  if (typeof out.inspiracion !== 'number') out.inspiracion = out.inspiracion ? 1 : 0;
  if (typeof out.exp !== 'number') { const n = parseInt(String(out.exp ?? '').replace(/\D/g, ''), 10); out.exp = isNaN(n) ? 0 : n; }
  out.monturas = (p.monturas ?? []).map(normalizarMontura);
  if (typeof out.viaje.pedernal !== 'number') out.viaje.pedernal = out.viaje.pedernal ? 10 : 0;
  out.habilidades = { ...base.habilidades, ...(p.habilidades ?? {}) };
  out.salvaciones = { ...base.salvaciones, ...(p.salvaciones ?? {}) };
  // La CA antigua escrita a mano no se traslada: la CA se calcula sola (10 + DES, armadura, escudo).
  // caV2: limpia una vez el «ajuste» que la primera versión de esta migración calculó mal.
  if (!p.caV2) { out.bonusCA = 0; out.caV2 = true; }
  out.ca = '';
  // Los PG actuales nunca pueden pasar de los máximos: si pasa (datos antiguos), el máximo sube.
  if (out.pg.actual > out.pg.max) out.pg.max = out.pg.actual;
  return out;
}

export function nuevaMontura(nombre = ''): Montura {
  return {
    id: uid(), nombre, tipo: '', foto: '', pg: { max: 0, actual: 0 }, ca: '',
    velocidad: { andando: 0, volando: '', nadando: '', trepando: '' },
    caracteristicas: Object.fromEntries(ATRIBUTOS.map((a) => [a, 10])) as Record<Atributo, number>,
    rasgos: [], equipo: [], espaciosEquipo: 3, carga: [], espaciosCarga: 0, notas: '',
  };
}
export function normalizarMontura(m: Partial<Montura>): Montura {
  const b = nuevaMontura();
  return { ...b, ...m, pg: { ...b.pg, ...m.pg }, velocidad: { ...b.velocidad, ...m.velocidad }, caracteristicas: { ...b.caracteristicas, ...m.caracteristicas } } as Montura;
}
