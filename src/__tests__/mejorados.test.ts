import { describe, expect, it } from 'vitest';
import { nuevoPersonaje } from '../personaje';
import { fijarTextoMejorado, quitarCopia, resolverMejorados, textoMejorado } from '../conjurosMejorados';

describe('conjuros mejorados (Bola de fuego +)', () => {
  it('se ve una vez, en la copia con mejor ataque/CD, y quitar vuelve atrás', () => {
    const p = nuevoPersonaje('x');
    p.conjuros = [{ nombre: 'Bola de fuego', nivel: 3 }, { nombre: 'Bola de fuego', nivel: 3, clase: 'Brujo' }, { nombre: 'Escudo', nivel: 1 }];
    const pot = (i: number) => (i === 1 ? [7, 15] : [5, 13]) as [number, number];
    let r = resolverMejorados(p, pot);
    expect([...r.ocultos]).toEqual([0]); expect(r.plus.get(1)).toBe(1);
    fijarTextoMejorado(p, 'Bola de fuego', 1, 'mejorada');
    expect(textoMejorado(p, 'Bola de fuego', 1, 'base')).toBe('mejorada');
    p.conjuros.push({ nombre: 'Bola de fuego', nivel: 3, adicional: true });
    r = resolverMejorados(p, pot);
    expect(r.plus.get(1)).toBe(2); expect(textoMejorado(p, 'Bola de fuego', 2, 'base')).toBe('base');
    quitarCopia(p, 'Bola de fuego');
    expect(p.conjuros.length).toBe(3); expect(resolverMejorados(p, pot).plus.get(1)).toBe(1);
    quitarCopia(p, 'Bola de fuego');
    expect(resolverMejorados(p, pot).plus.size).toBe(0); expect(p.mejorasConjuro?.['bola de fuego']).toBeUndefined();
  });
});
