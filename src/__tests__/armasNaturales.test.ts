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

import { bonoArma } from '../rules';
describe('característica elegida por arma', () => {
  it('ataque con CAR y daño con FUE', () => {
    const p = nuevoPersonaje(); p.nivel = 1;
    p.caracteristicas = { FUE: 14, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 18 };
    const it = { id: 'x', nombre: 'Espada', descripcion: '', precio: '', cantidad: 1, tipo: 'arma' as const, detalles: { 'Daño': '1d8 cortante', 'Propiedades': '' } };
    expect(bonoArma(p, it)).toMatchObject({ ataque: 4, mod: 2, atr: 'FUE' });
    p.atrArmas = { x: { ataque: 'CAR' } };
    expect(bonoArma(p, it)).toMatchObject({ ataque: 6, mod: 2, atr: 'CAR' });
    p.atrArmas = { x: { ataque: 'CAR', dano: 'CAR' } };
    expect(bonoArma(p, it).mod).toBe(4);
  });
});

import { esArmaMonje } from '../rules';
import { dadoMayor } from '../armasNaturales';
describe('armas de monje', () => {
  const arma = (nombre: string, props: string) => ({ id: nombre, nombre, descripcion: '', precio: '', cantidad: 1, tipo: 'arma' as const, detalles: { 'Daño': '1d4 perforante', 'Propiedades': props } });
  it('sencillas c/c y marciales ligeras sí; arcos y pesadas no', () => {
    expect(esArmaMonje(arma('Daga', 'Arrojadiza (20/60), Ligera, Sutil'))).toBe(true);
    expect(esArmaMonje(arma('Bastón +1', 'Versátil (1d8)'))).toBe(true);
    expect(esArmaMonje(arma('Cimitarra', 'Ligera, Sutil'))).toBe(true);
    expect(esArmaMonje(arma('Espadón', 'Pesada, Dos manos'))).toBe(false);
    expect(esArmaMonje(arma('Arco corto', 'Munición (alcance 80/320), Dos manos'))).toBe(false);
  });
  it('daga de monje: dado de artes marciales, DES y +1 mágico', () => {
    expect(dadoMayor('1d4', '1d8')).toBe('1d8');
    expect(dadoMayor('1d10', '1d6')).toBe('1d10');
    const p = nuevoPersonaje(); p.clase = 'Monje'; p.nivel = 1;
    p.caracteristicas = { FUE: 10, DES: 16, CON: 10, INT: 10, SAB: 10, CAR: 10 };
    expect(bonoArma(p, arma('Bastón +1', 'Versátil (1d8)'))).toMatchObject({ atr: 'DES', ataque: 6, mod: 4 });
  });
});
