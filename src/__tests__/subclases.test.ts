import { describe, expect, it } from 'vitest';
import clasesJson from '../../public/data/clases.json';
import type { Clase } from '../data';
import { nuevoPersonaje } from '../personaje';
import { fijarClases } from '../multiclase';
import { recursosPersonaje } from '../recursos';
import { eleccionesDe } from '../elecciones';
import { competenciasAuto } from '../competencias';
import { compSalvacionAuto } from '../rules';
import { bonosActivos } from '../bonos';
import { concesionesActivas } from '../conjurosRasgos';

const C = clasesJson as unknown as Clase[];
fijarClases(C);
const pj = (clase: string, sub: string, nivel: number) => {
  const p = nuevoPersonaje(); p.raza = 'Humano'; p.clase = clase; p.subclase = sub; p.nivel = nivel;
  p.caracteristicas = { FUE: 14, DES: 16, CON: 14, INT: 14, SAB: 14, CAR: 14 };
  return p;
};
const cl = (n: string) => C.find((c) => c.nombre === n)!;

describe('subclases', () => {
  it('Arquero arcano: recurso, elecciones, habilidades y truco', () => {
    const p = pj('Guerrero', 'Arquero arcano', 3);
    const r = recursosPersonaje(p, cl('Guerrero')).find((x) => x.id === 'disparoArcano')!;
    expect(r.max).toBe(2); expect(r.es).toMatch(/d6/);
    const e = eleccionesDe(p, C, null).find((x) => x.id === 'Guerrero:sub:disparos')!;
    expect(e.cantidad).toBe(2); expect(e.opciones.length).toBe(8); expect(e.opciones[0].desc).toBeTruthy();
    expect(bonosActivos(p).some((b) => b.b.competencia?.includes('arcano'))).toBe(true);
    expect(concesionesActivas(p, null).some((c) => c.id === 'sub:arquero-arcano:truco')).toBe(true);
    p.nivel = 18; expect(recursosPersonaje(p, cl('Guerrero')).find((x) => x.id === 'disparoArcano')!.es).toMatch(/d12/);
    expect(eleccionesDe(p, C, null).find((x) => x.id === 'Guerrero:sub:disparos')!.cantidad).toBe(6);
  });
  it('Maestro del combate y Guerrero psiónico', () => {
    const p = pj('Guerrero', 'Maestro del combate', 10);
    expect(recursosPersonaje(p, cl('Guerrero')).find((x) => x.id === 'dadosSupremacia')!.max).toBe(5);
    expect(eleccionesDe(p, C, null).find((x) => x.id === 'Guerrero:sub:maniobras')!.cantidad).toBe(7);
    const q = pj('Guerrero', 'Guerrero psiónico', 5);
    expect(recursosPersonaje(q, cl('Guerrero')).find((x) => x.id === 'dadosPsionicos')!.max).toBe(6);
  });
  it('Caballero de la orden: armas de la orden', () => {
    const p = pj('Guerrero', 'Caballero de la orden', 3);
    p.elecciones = { 'Guerrero:sub:orden': ['Orden del loto'] };
    expect(competenciasAuto(p).some((c) => c.es === 'Katana')).toBe(true);
    expect(eleccionesDe(p, C, null).some((x) => x.id === 'Guerrero:sub:arma')).toBe(true);
  });
  it('Acechador: Mente de hierro', () => {
    expect(compSalvacionAuto(pj('Explorador', 'Acechador en la penumbra', 7), 'SAB')).toBeTruthy();
  });
  it('todas las subclases de nivel 3 a 20: recursos válidos y opciones con texto', () => {
    const sinTexto: string[] = [];
    for (const c of C) for (const s of c.subclases ?? []) for (let n = 3; n <= 20; n++) {
      const p = pj(c.nombre, s.nombre, n);
      for (const r of recursosPersonaje(p, c)) expect(Number.isFinite(r.max) && r.max > 0, `${s.nombre} ${n} ${r.id}`).toBe(true);
      for (const e of eleccionesDe(p, C, null)) if (e.id.includes(':sub:')) {
        expect(e.opciones.length, e.id).toBeGreaterThan(0);
        for (const o of e.opciones) if (n === 20 && ['disparos', 'maniobras'].some((k) => e.id.endsWith(k)) && !o.desc) sinTexto.push(`${e.id} ${o.valor}`);
      }
    }
    expect(sinTexto).toEqual([]);
  });
});
