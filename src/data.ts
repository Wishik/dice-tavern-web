import { useEffect, useState } from 'react';

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
export interface ObjetoBase { nombre: string; descripcion: string; precio: string; tipo: 'pocion' | 'arma' | 'armadura' | 'escudo' | 'herramienta' | 'consumible' | 'otro'; categoria: string; detalles?: Record<string, string>; maxPorEspacio?: number }
let baseObjetos: Promise<ObjetoBase[]> | null = null;
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
      const tipo = g.categoria === 'pociones' ? 'pocion' : g.categoria === 'herramientas' ? 'herramienta' : g.categoria === 'pergaminos' ? 'consumible' : 'otro';
      out.push({ nombre: g.nombre, precio: g.precio, tipo, categoria: g.categoria, descripcion: g.descripcion });
    }
    // Munición: no está en las tablas como objeto aparte; se añade con máximo 20 por espacio.
    for (const m of ['Flechas', 'Virotes', 'Balas', 'Dardos de cerbatana', 'Proyectiles de honda'])
      out.push({ nombre: m, precio: '', tipo: 'consumible', categoria: 'munición', descripcion: 'Munición. Máximo 20 por espacio.', maxPorEspacio: 20 });
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });
  return baseObjetos;
}

export const normalizarTexto = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
