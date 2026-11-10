import { describe, expect, it } from 'vitest';
import { armasNaturales } from '../armasNaturales';
import { nuevoPersonaje } from '../personaje';
import type { Clase } from '../data';

const monje = { nombre: 'Monje', tabla: Array.from({ length: 20 }, (_, i) => ({ nivel: i + 1, rasgos: '', 'Artes marciales': i + 1 >= 5 ? '1d8' : '1d6' })) } as unknown as Clase;

describe('armas naturales y golpe sin armas', () => {
  it('todos tienen golpe sin armas (1 + FUE)', () => {
    const p = nuevoPersonaje();
    const a = armasNaturales(p, null);
    expect(a.map((x) => x.it.id)).toEqual(['nat:sinArmas']);
    expect(a[0].it.detalles?.['Daño']).toMatch(/^1 /);
  });
  it('el monje usa el dado de artes marciales y FUE o DES', () => {
    const p = nuevoPersonaje(); p.clase = 'Monje'; p.nivel = 5;
    const g = armasNaturales(p, monje).find((x) => x.it.id === 'nat:sinArmas')!;
    expect(g.it.detalles?.['Daño']).toMatch(/^1d8 /);
    expect(g.it.detalles?.['Propiedades']).toBe('Sutil');
  });
  it('Charr: mordisco y garras; Kobold con Cola elegida', () => {
    const p = nuevoPersonaje(); p.raza = 'Charr';
    expect(armasNaturales(p, null).map((x) => x.it.detalles?.['Daño'].split(' ')[0])).toEqual(['1d6', '2d4', '1']);
    const k = nuevoPersonaje(); k.raza = 'Kobold';
    expect(armasNaturales(k, null)).toHaveLength(1);
    k.rasgosRaza = ['Cola (x1)'];
    expect(armasNaturales(k, null)).toHaveLength(2);
  });
});
