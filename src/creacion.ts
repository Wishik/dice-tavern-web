import type { Clase, Razas, Trasfondo } from './data';
import { ATRIBUTOS, type Atributo, type Personaje } from './types';
import { buscarClase, buscarRaza } from './avisos';
import { aplicarConjuntoEstandar, caracteristicasSinTocar, idHabilidad, pgPorDefecto } from './rules';
import { esRetratoRaza, retratoRaza } from './imagenesRazas';

/** Lo que pasa al elegir raza, clase o trasfondo (lo usan la hoja y el asistente de creación). */
export function aplicarRaza(x: Personaje, nombre: string, razas: Razas | null, clases: Clase[] | null) {
  x.raza = nombre;
  // Sin foto propia, el retrato de la raza hace de foto.
  if (!x.foto || esRetratoRaza(x.foto)) x.foto = retratoRaza(nombre);
  const r = buscarRaza(razas, nombre);
  if (r) {
    x.tamano = r.tamano;
    const v = parseInt(r.velocidad, 10);
    if (!isNaN(v)) { x.velocidad.andando = v; x.velocidad.corriendo = v * 2; }
    const nad = r.velocidad.match(/(\d+)\s*pies\s+nadando/); if (nad) x.velocidad.nadando = nad[1];
    x.rasgosRaza = [];
    // Lo elegido para la raza anterior (Resiliencia, linaje…) ya no vale.
    for (const a of x.elecciones?.['raza:resiliencia'] ?? []) if (a in x.salvaciones && !buscarClase(clases, x.clase)?.atributos.salvaciones.includes(a)) x.salvaciones[a as Atributo].comp = false;
    if (x.elecciones) x.elecciones = Object.fromEntries(Object.entries(x.elecciones).filter(([k]) => !k.startsWith('raza:')));
  }
}

export function aplicarClase(x: Personaje, nombre: string, clases: Clase[] | null) {
  const viejo = buscarClase(clases, x.clase);
  const pgViejo = viejo ? pgPorDefecto(x, viejo.atributos.dadoGolpe) : 0;
  x.clase = nombre; x.subclase = '';
  const c = buscarClase(clases, nombre);
  if (c) for (const a of ATRIBUTOS) x.salvaciones[a].comp = c.atributos.salvaciones.includes(a) || !!x.elecciones?.['raza:resiliencia']?.includes(a);
  // El estilo de combate de la clase anterior ya no vale.
  if (viejo && viejo.nombre !== nombre) x.dotes = x.dotes.filter((d) => d.origen !== `Estilo de combate · ${viejo.nombre}`);
  // Al elegir clase, si aún no has tocado las características, pone el conjunto estándar del manual.
  if (caracteristicasSinTocar(x)) aplicarConjuntoEstandar(x, nombre);
  // PG por defecto si aún no los habías puesto (o seguían siendo los de la clase anterior).
  if (c && (x.pg.max === 0 || x.pg.max === pgViejo)) { x.pg.max = pgPorDefecto(x, c.atributos.dadoGolpe); x.pg.actual = x.pg.max; x.pgExtra = 0; }
  // La característica de conjuros vuelve a ser la automática de la clase.
  x.conjuroCaracteristica = '';
}

export function aplicarTrasfondo(x: Personaje, nombre: string, trasfondos: Trasfondo[] | null) {
  const viejo = trasfondos?.find((t) => t.nombre === x.trasfondoEstilo);
  viejo?.habilidades.forEach((h) => { const id = idHabilidad(h); if (id) x.habilidades[id].comp = false; });
  x.trasfondoEstilo = nombre;
  const t = trasfondos?.find((t) => t.nombre === nombre);
  t?.habilidades.forEach((h) => { const id = idHabilidad(h); if (id) x.habilidades[id].comp = true; });
}
