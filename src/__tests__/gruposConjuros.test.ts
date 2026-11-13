import { describe, expect, it } from 'vitest';
import { nuevoPersonaje } from '../personaje';
import { atributoAuto, atributoDeRasgo, atributoGrupo, grupoDe, gruposOtros } from '../gruposConjuros';

describe('grupos de conjuros', () => {
  it('lee la característica del rasgo de raza', () => {
    expect(atributoDeRasgo('Si no eres lanzador de conjuros, la Inteligencia es la característica para los conjuros de Gnomo.')).toBe('INT');
    expect(atributoDeRasgo('Si no eres lanzador de conjuros, tu característica para lanzar estos conjuros es la Sabiduría.')).toBe('SAB');
  });
  it('raciales: la de la clase principal si lanza conjuros; si no, la del rasgo', () => {
    const p = nuevoPersonaje('x'); p.clase = 'Clérigo'; p.raza = 'Gnomo';
    p.conjuros = [{ nombre: 'Escudo', nivel: 1, adicional: true, origen: 'gnomo:1' }];
    const razas = { razas: [{ nombre: 'Gnomo', rasgosFijos: [{ nombre: 'Magia Gnomica', texto: 'Si no eres lanzador de conjuros, la Inteligencia es la característica para los conjuros de Gnomo.' }], rasgosUnicos: [] }], rasgosGenericos: { excluyentes: [], noExcluyentes: [] } } as never;
    const g = grupoDe(p, p.conjuros[0]);
    expect(g.tipo).toBe('raza');
    expect(atributoAuto(p, g, ['Clérigo'], razas)).toBe('SAB');
    p.clase = 'Guerrero';
    expect(atributoAuto(p, g, [], razas)).toBe('INT');
  });
  it('agrupa adicionales por lista y deja la clase principal en conjuroCaracteristica', () => {
    const p = nuevoPersonaje('x'); p.clase = 'Mago'; p.conjuroCaracteristica = 'CAR';
    p.conjuros = [{ nombre: 'Curar heridas', nivel: 1, adicional: true, lista: 'Clérigo' }, { nombre: 'Luz', nivel: 0, adicional: true }];
    expect(gruposOtros(p).map((x) => x.g.id)).toEqual(['lista:Clérigo', 'otros']);
    expect(atributoGrupo(p, grupoDe(p, p.conjuros[0]), ['Mago'], null)).toBe('SAB');
    expect(atributoGrupo(p, { id: 'clase:Mago', tipo: 'clase', clase: 'Mago' }, ['Mago'], null)).toBe('CAR');
  });
});

import { sincronizarConjuros } from '../conjurosRasgos';
describe('conjuros de subclase', () => {
  it('el brujo celestial de nivel 5 conoce los de nivel 3 y 5, agrupados aparte', () => {
    const p = nuevoPersonaje('x'); p.clase = 'Brujo'; p.subclase = 'Patrón celestial'; p.nivel = 5;
    const todos = [{ nombre: 'Luz', nivel: 0 }, { nombre: 'Auxilio', nivel: 2 }, { nombre: 'Revivir', nivel: 3 }, { nombre: 'Muro de fuego', nivel: 4 }] as never;
    sincronizarConjuros(p, null, todos);
    const n = p.conjuros.map((c) => c.nombre);
    expect(n).toContain('Luz'); expect(n).toContain('Revivir'); expect(n).not.toContain('Muro de fuego');
    expect(p.conjuros.every((c) => c.adicional)).toBe(true);
    expect(gruposOtros(p)[0].g.tipo).toBe('subclase');
    expect(atributoGrupo(p, gruposOtros(p)[0].g, ['Brujo'], null)).toBe('CAR');
  });
});
