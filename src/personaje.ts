import { ATRIBUTOS, TIPO_RANURA, type Atributo, type Montura, type Personaje, type RanuraEquipo } from './types';
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
    ca: '', bonusCA: 0, caV2: true, pgV2: true, bonusPercepcionPasiva: 0, recursos: '', recursosUsados: {}, descansosCortos: 0,
    ataquesTurno: { habil: 1, torpe: 0 }, ataques: [],
    conjuroCaracteristica: '', conjurosTurno: { estandar: '', adicional: '' },
    salvaciones: Object.fromEntries(ATRIBUTOS.map((a) => [a, { comp: false, bonus: 0 }])) as Personaje['salvaciones'],
    muerte: { exitos: 0, fallos: 0 },
    habilidades: Object.fromEntries(HABILIDADES.map((h) => [h.id, { comp: false, pericia: false, bonus: 0 }])),
    rasgosRaza: [], eleccionesConjuros: {}, rasgos: [], dotes: [], conjuros: [],
    equipo: { yelmo: null, amuleto: null, armadura: null, capa: null, brazalete: null, guantes: null, anillo1: null, anillo2: null, cinto: null, botas: null, manoHabil: null, manoTorpe: null },
    mochila: [], cinturon: { items: [] },
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
  // pgV2: los PG de nivel 1 antes no sumaban el +1 de la mesa (dado máx. + CON + 1): se suma una vez.
  if (!p.pgV2) { if (out.clase && out.pg?.max > 0) { const lleno = out.pg.actual >= out.pg.max; out.pg = { ...out.pg, max: out.pg.max + 1, actual: lleno ? out.pg.max + 1 : out.pg.actual }; } out.pgV2 = true; }
  out.ca = '';
  // El antiguo «Ajuste» de la CA pasa a ser un bonus con nombre (se puede cambiar o quitar).
  if (out.bonusCA) { out.bonosExtra = [...(out.bonosExtra ?? []), { id: `ajusteCA${Date.now().toString(36)}`, donde: 'CA', valor: out.bonusCA, origen: 'Ajuste' }]; out.bonusCA = 0; }
  // Las casillas pequeñas de bonus en habilidades y salvaciones pasan a ser bonus con nombre.
  const mano: { id: string; donde: string; valor: number; origen: string }[] = [];
  if (out.habilidades && Object.values(out.habilidades).some((h) => h?.bonus)) {
    out.habilidades = Object.fromEntries(Object.entries(out.habilidades).map(([id, h]) => { if (h?.bonus) mano.push({ id: `aj-${id}-${Date.now().toString(36)}`, donde: `hab:${id}`, valor: h.bonus, origen: 'Ajuste' }); return [id, h ? { ...h, bonus: 0 } : h]; }));
  }
  if (out.salvaciones && Object.values(out.salvaciones).some((x) => x?.bonus)) {
    out.salvaciones = Object.fromEntries(Object.entries(out.salvaciones).map(([a, x]) => { if (x?.bonus) mano.push({ id: `aj-s${a}-${Date.now().toString(36)}`, donde: `salv:${a}`, valor: x.bonus, origen: 'Ajuste' }); return [a, x ? { ...x, bonus: 0 } : x]; })) as typeof out.salvaciones;
  }
  if (mano.length) out.bonosExtra = [...(out.bonosExtra ?? []), ...mano];
  migrarObjetos(out);
  // Los PG actuales nunca pueden pasar de los máximos: si pasa (datos antiguos), el máximo sube.
  if (out.pg.actual > out.pg.max) out.pg.max = out.pg.actual;
  return out;
}

/**
 * Objetos de versiones anteriores: las pociones pasan a «Consumible»; lo que estaba en yelmo, amuleto, capa…
 * como «Objeto» toma la categoría de su hueco; y el antiguo selector de tamaño del cinturón se convierte
 * en un cinturón equipado de ese tamaño (si tenías algo en él o habías elegido mediano/grande).
 */
function migrarObjetos(out: Personaje) {
  const todos = [...out.mochila ?? [], ...out.cinturon?.items ?? [], ...Object.values(out.equipo ?? {})];
  for (const it of todos) if (it && it.tipo === 'pocion') it.tipo = 'consumible';
  // La munición y sus contenedores tienen ya su categoría.
  for (const it of todos) {
    if (!it || it.tipo === 'arma') continue;
    if (/^(flechas?|virotes?|balas?|dardos? de cerbatana|proyectiles? de honda)\b/i.test(it.nombre) && (it.tipo === 'consumible' || it.tipo === 'otro')) it.tipo = 'municion';
    else if (/^(aljaba|estuche para virotes|bolsa para balas|estuche para dardos)/i.test(it.nombre) && it.tipo === 'otro') it.tipo = 'contenedorMunicion';
  }
  for (const [r, t] of Object.entries(TIPO_RANURA) as [RanuraEquipo, NonNullable<(typeof TIPO_RANURA)[RanuraEquipo]>][]) {
    const it = out.equipo[r];
    if (it && it.tipo === 'otro') it.tipo = t;
  }
  const viejo = out.cinturon?.tamano;
  if (viejo) {
    if (!out.equipo.cinto && (out.cinturon.items.length || viejo !== 'pequeño'))
      out.equipo.cinto = { id: `cint${Date.now().toString(36)}`, nombre: 'Cinturón', descripcion: '', precio: '', cantidad: 1, tipo: 'cinturon', cinturon: viejo };
    const { tamano: _t, ...resto } = out.cinturon;
    out.cinturon = resto;
  }
  if (out.equipo.cinto && out.equipo.cinto.tipo === 'cinturon' && !out.equipo.cinto.cinturon) out.equipo.cinto.cinturon = 'pequeño';
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
