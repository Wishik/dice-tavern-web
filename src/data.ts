import { useEffect, useState } from 'react';
import type { Item, TipoItem } from './types';

export interface Conjuro { nombre: string; nivel: number; escuela: string; clases: string[]; tiempo: string; alcance: string; componentes: string; duracion: string; descripcion: string }
export interface RasgoDef { nombre: string; texto: string }
export interface Raza { nombre: string; descripcion: string; caracteristicas: string; tamano: string; velocidad: string; idiomas: string; rasgosFijos: RasgoDef[]; rasgosAdicionales: string; rasgosAElegir: number; rasgosUnicos: RasgoDef[] }
export interface Razas { razas: Raza[]; rasgosGenericos: { excluyentes: RasgoDef[]; noExcluyentes: RasgoDef[] } }
export interface RasgoClase { nivel: number; nombre: string; texto: string }
export interface Clase {
  nombre: string; descripcion: string;
  atributos: { caracteristicaPrincipal: string; dadoGolpe: string; salvaciones: string[]; habilidadesN: number; habilidades: string[]; armas: string; armaduras: string; herramientas: string; equipo: string };
  columnas: string[]; tabla: ({ nivel: number; rasgos: string } & Record<string, string | number>)[];
  rasgos: RasgoClase[]; subclases: { nombre: string; descripcion: string; rasgos: RasgoClase[] }[];
}
export interface Dote { nombre: string; categoria: string; descripcion: string }
export interface Trasfondo { nombre: string; descripcion: string; habilidades: string[]; dotes: string[] }
export interface Arma { nombre: string; dano: string; propiedades: string; maestria: string; precio: string; categoria: string; nota?: string }
export interface Armadura { nombre: string; ca: string; fuerza: string; sigilo: string; precio: string; categoria: string; nota?: string }
export interface Equipo { nombre: string; precio: string; descripcion: string; categoria: string }

const cache = new Map<string, Promise<unknown>>();
export function cargar<T>(archivo: string): Promise<T> {
  if (!cache.has(archivo)) cache.set(archivo, fetch(`/data/${archivo}.json`).then((r) => { if (!r.ok) throw new Error(archivo); return r.json(); }));
  return cache.get(archivo) as Promise<T>;
}
export function useDatos<T>(archivo: string): T | null {
  const [d, setD] = useState<T | null>(null);
  useEffect(() => { let vivo = true; cargar<T>(archivo).then((x) => vivo && setD(x)).catch(() => {}); return () => { vivo = false; }; }, [archivo]);
  return d;
}

/** Base de objetos unificada para el buscador del inventario. */
/** Munición del manual (pág. 216): cantidad por compra y precio de ese lote. */
export const MUNICION = [
  { nombre: 'Flechas', cantidad: 20, precio: '1po', descripcion: 'Munición para arcos. Se compran 20 por 1 po. Máximo 20 por espacio.' },
  { nombre: 'Virotes', cantidad: 20, precio: '1po', descripcion: 'Munición para ballestas. Se compran 20 por 1 po. Máximo 20 por espacio.' },
  { nombre: 'Proyectiles de honda', cantidad: 20, precio: '4pc', descripcion: 'Munición para hondas. Se compran 20 por 4 pc. Máximo 20 por espacio.' },
  { nombre: 'Balas', cantidad: 10, precio: '3po', descripcion: 'Munición para armas de fuego (pimentero, mosquete…). Se compran 10 por 3 po. Máximo 20 por espacio.' },
  { nombre: 'Dardos de cerbatana', cantidad: 50, precio: '4pc', descripcion: 'Munición para cerbatanas. Se compran 50 por 4 pc. Máximo 20 por espacio.' },
];
/** Contenedores de munición: los dos del manual y los dos que añade la mesa. */
export const CONTENEDORES_MUNICION = [
  { nombre: 'Aljaba', manual: true, precio: '1po', descripcion: '' },
  { nombre: 'Estuche para virotes de ballesta', manual: true, precio: '1po', descripcion: '' },
  { nombre: 'Bolsa para balas', manual: false, precio: '1po', descripcion: 'En una bolsa para balas caben hasta 20 balas o proyectiles de honda.' },
  { nombre: 'Estuche para dardos de cerbatana', manual: false, precio: '1po', descripcion: 'En un estuche para dardos de cerbatana caben hasta 20 dardos de cerbatana.' },
];
export interface ObjetoBase { nombre: string; descripcion: string; precio: string; tipo: TipoItem; categoria: string; detalles?: Record<string, string>; maxPorEspacio?: number; /** Unidades que se compran juntas (munición). */ cantidad?: number; /** Objeto de la biblioteca de la partida (completo). */ item?: Item }
let baseObjetos: Promise<ObjetoBase[]> | null = null;
let baseLista: ObjetoBase[] | null = null;
/** La base de objetos si ya se ha cargado (sin esperar). */
export const baseCargada = () => baseLista;
export function cargarObjetos(): Promise<ObjetoBase[]> {
  if (!baseObjetos) baseObjetos = Promise.all([cargar<(Arma | Armadura)[]>('armas'), cargar<Equipo[]>('gear')]).then(([aa, gg]) => {
    const out: ObjetoBase[] = [];
    for (const a of aa) {
      if ('dano' in a) out.push({ nombre: a.nombre, precio: a.precio, tipo: 'arma', categoria: a.categoria, descripcion: a.nota ?? '',
        detalles: { 'Daño': a.dano, 'Propiedades': a.propiedades, 'Maestría': a.maestria } });
      else out.push({ nombre: a.nombre, precio: a.precio, tipo: a.categoria === 'escudos' ? 'escudo' : 'armadura', categoria: a.categoria, descripcion: a.nota ?? '',
        detalles: { 'Clase de armadura': a.ca, 'Fuerza': a.fuerza, 'Sigilo': a.sigilo } });
    }
    for (const g of gg) {
      const contenedor = CONTENEDORES_MUNICION.some((c) => c.nombre === g.nombre);
      const tipo = contenedor ? 'contenedorMunicion' : g.categoria === 'pociones' ? 'consumible' : g.categoria === 'herramientas' ? 'herramienta' : g.categoria === 'pergaminos' ? 'consumible' : 'otro';
      out.push({ nombre: g.nombre, precio: g.precio, tipo, categoria: contenedor ? 'contenedores de munición' : g.categoria, descripcion: g.descripcion });
    }
    // Contenedores que no vienen en el manual (los crea la mesa).
    for (const c of CONTENEDORES_MUNICION) if (!c.manual)
      out.push({ nombre: c.nombre, precio: c.precio, tipo: 'contenedorMunicion', categoria: 'contenedores de munición', descripcion: c.descripcion });
    // Munición: tabla «Lista de munición para armas a distancia» del manual (cantidad que se compra y precio).
    for (const m of MUNICION)
      out.push({ nombre: m.nombre, precio: m.precio, tipo: 'municion', categoria: 'munición', descripcion: m.descripcion, maxPorEspacio: 20, cantidad: m.cantidad });
    baseLista = out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return baseLista;
  });
  return baseObjetos;
}

export const normalizarTexto = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
