import { ATRIBUTOS, type Atributo, type Personaje } from './types';
import { HABILIDADES, uid } from './rules';

export function nuevoPersonaje(nombre = ''): Personaje {
  const ahora = new Date().toISOString();
  const car = Object.fromEntries(ATRIBUTOS.map((a) => [a, 10])) as Record<Atributo, number>;
  return {
    id: uid(), version: 1, creado: ahora, actualizado: ahora,
    nombre, foto: '', tamano: '', edad: '', raza: '', clase: '', subclase: '', nivel: 1, exp: 0,
    trasfondoEstilo: '', trasfondo: '', personalidad: '',
    competencias: '', alineamiento: { orden: '', moral: '' }, idiomas: {}, oficios: {}, profesiones: {},
    pg: { max: 0, actual: 0, temp: 0 }, pm: { max: 0, actual: 0 }, inspiracion: 0, dgUsados: 0,
    caracteristicas: car, bonusIniciativa: 0,
    velocidad: { andando: 30, corriendo: 60, trepando: '', nadando: '', volando: '' },
    ca: '', bonusPercepcionPasiva: 0, recursos: '',
    ataquesTurno: { habil: 1, torpe: 0 }, ataques: [],
    conjuroCaracteristica: '', conjurosTurno: { estandar: '', adicional: '' },
    salvaciones: Object.fromEntries(ATRIBUTOS.map((a) => [a, { comp: false, bonus: 0 }])) as Personaje['salvaciones'],
    muerte: { exitos: 0, fallos: 0 },
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { comp: false, pericia: false, bonus: 0 }])),
    rasgosRaza: [], rasgos: [], dotes: [], conjuros: [],
    equipo: { yelmo: null, amuleto: null, armadura: null, capa: null, manoHabil: null, manoTorpe: null },
    mochila: [], cinturon: { tamano: 'pequeño', items: [] },
    viaje: { raciones: 0, odre: 0, pedernal: false, antorchas: 0, cuerda: '', ropa: '', sacoDormir: false, manta: false, tienda: '' },
    monedas: { PM: 0, PL: 0, PO: 0, PE: 0, PP: 0, PC: 0 },
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
  out.habilidades = { ...base.habilidades, ...(p.habilidades ?? {}) };
  out.salvaciones = { ...base.salvaciones, ...(p.salvaciones ?? {}) };
  return out;
}
