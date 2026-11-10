import { describe, expect, it } from 'vitest';
import { alternarPotenciador, apagarDeUnGolpe, aplicaArma, potenciadoresDisponibles, sumarDano } from '../potenciadores';
import { descansoLargo } from '../recursos';
import { nuevoPersonaje } from '../personaje';
import type { Clase } from '../data';
import type { Item } from '../types';

const tabla = (cols: Record<string, string>) => Array.from({ length: 20 }, (_, i) => ({ nivel: i + 1, rasgos: '', ...cols }));
const barbaro = { nombre: 'Bárbaro', tabla: tabla({ 'Furias': '2', 'Daño de furia': '+2' }) } as unknown as Clase;
const picaro = { nombre: 'Pícaro', tabla: tabla({ 'Ataque furtivo': '3d6' }) } as unknown as Clase;
const arma = (props: string): Item => ({ id: 'a', nombre: 'x', tipo: 'arma', detalles: { 'Propiedades': props } } as unknown as Item);

describe('potenciadores', () => {
  it('Furia: gasta una furia, suma daño con armas de Fuerza y se apaga en descanso largo', () => {
    const p = nuevoPersonaje(); p.clase = 'Bárbaro'; p.nivel = 3;
    const furia = potenciadoresDisponibles(p, barbaro).find((x) => x.id === 'furia')!;
    expect(furia.dano).toBe('+2');
    expect(aplicaArma(furia, arma('Pesada'), 'FUE', false)).toBe(true);
    expect(aplicaArma(furia, arma('Munición'), 'DES', true)).toBe(false);
    expect(alternarPotenciador(p, furia, barbaro)).toBeNull();
    expect(p.recursosUsados.furia).toBe(1);
    alternarPotenciador(p, furia, barbaro); // apagar no devuelve el uso
    expect(alternarPotenciador(p, furia, barbaro)).toBeNull();
    expect(p.recursosUsados.furia).toBe(2);
    alternarPotenciador(p, furia, barbaro);
    expect(alternarPotenciador(p, furia, barbaro)).toBe('furia'); // sin usos
    expect(p.potenciadores).toEqual([]);
    p.potenciadores = ['furia']; descansoLargo(p);
    expect(p.potenciadores).toEqual([]);
  });
  it('Ataque furtivo: arma sutil o a distancia, un solo golpe', () => {
    const p = nuevoPersonaje(); p.clase = 'Pícaro'; p.nivel = 5;
    const f = potenciadoresDisponibles(p, picaro).find((x) => x.id === 'furtivo')!;
    expect(f.dano).toBe('+3d6');
    expect(aplicaArma(f, arma('Sutil, Ligera'), 'DES', false)).toBe(true);
    expect(aplicaArma(f, arma('Pesada'), 'FUE', false)).toBe(false);
    alternarPotenciador(p, f, picaro);
    expect(sumarDano('1d6+3', ['+3d6'])).toBe('1d6+3+3d6');
    apagarDeUnGolpe(p, [f]);
    expect(p.potenciadores).toEqual([]);
  });
});
