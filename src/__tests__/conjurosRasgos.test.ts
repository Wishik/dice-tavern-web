import { describe, expect, it } from 'vitest';
import razas from '../../public/data/razas.json';
import spells from '../../public/data/spells.json';
import { nuevoPersonaje } from '../personaje';
import { eleccionesPendientes, sincronizarConjuros } from '../conjurosRasgos';
import type { Conjuro, Razas } from '../data';

const R = razas as unknown as Razas, S = spells as unknown as Conjuro[];

describe('conjuros de raza y dotes', () => {
  it('añade los de la raza como adicionales según el nivel y los quita si se quita el rasgo', () => {
    const p = nuevoPersonaje(); p.raza = 'Aasimar'; p.rasgosRaza = ['Portador de Luz']; p.nivel = 2;
    p.conjuros = [{ nombre: 'Luz', nivel: 0 }];
    expect(sincronizarConjuros(p, R, S)).toBe(true);
    // Regla de la casa: el que ya tenías se queda y la copia de la raza lo convierte en «Luz +».
    expect(p.conjuros).toEqual([{ nombre: 'Luz', nivel: 0 }, { nombre: 'Luz', nivel: 0, adicional: true, origen: 'aasimar:1' }]);
    expect(sincronizarConjuros(p, R, S)).toBe(false);
    p.nivel = 5; sincronizarConjuros(p, R, S);
    expect(p.conjuros.map((c) => c.nombre)).toEqual(['Luz', 'Luz', 'Luz del día']);
    p.rasgosRaza = []; sincronizarConjuros(p, R, S);
    expect(p.conjuros).toEqual([{ nombre: 'Luz', nivel: 0 }]);
  });
  it('los rasgos fijos cuentan sin elegirlos y las elecciones quedan pendientes', () => {
    const k = nuevoPersonaje(); k.raza = 'Kitsune'; sincronizarConjuros(k, R, S);
    expect(k.conjuros.map((c) => c.nombre)).toEqual(['Crear llama']);
    const g = nuevoPersonaje(); g.raza = 'Gnomo'; g.rasgosRaza = ['Magia Gnomica'];
    expect(eleccionesPendientes(g, R).map((c) => c.id)).toEqual(['gnomo:1']);
    g.eleccionesConjuros = { 'gnomo:1': ['Dormir'] };
    expect(eleccionesPendientes(g, R)).toEqual([]);
    sincronizarConjuros(g, R, S);
    expect(g.conjuros).toMatchObject([{ nombre: 'Dormir', nivel: 1, adicional: true }]);
  });
  it('las dotes también', () => {
    const p = nuevoPersonaje(); p.dotes = [{ nombre: 'Telepático', texto: '' }]; sincronizarConjuros(p, R, S);
    expect(p.conjuros).toMatchObject([{ nombre: 'Detectar pensamientos', adicional: true }]);
  });

  it('Lanzador ritual: tantos rituales de nivel 1 como el BC', () => {
    const p = nuevoPersonaje(); p.nivel = 5; p.dotes = [{ nombre: 'Lanzador ritual', texto: '' }];
    expect(eleccionesPendientes(p, R).map((c) => c.id)).toEqual(['ritual']);
    p.eleccionesConjuros = { ritual: ['Alarma', 'Identificar'] };
    expect(eleccionesPendientes(p, R)).toHaveLength(1); // BC 3 a nivel 5
    p.eleccionesConjuros.ritual.push('Detectar magia');
    expect(eleccionesPendientes(p, R)).toHaveLength(0);
  });
  it('Espíritu sanador está en la lista', () => {
    expect(S.find((s) => s.nombre === 'Espíritu sanador')).toMatchObject({ nivel: 2 });
  });
});
