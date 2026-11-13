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
