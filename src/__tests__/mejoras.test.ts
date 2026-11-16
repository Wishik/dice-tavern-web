import { describe, expect, it } from 'vitest';
import dotesJson from '../../public/data/dotes.json';
import type { Dote } from '../data';
import { nuevoPersonaje } from '../personaje';
import { aumentosDotes, mejoraDe, mejoraPendiente, opcionesMejora, requisitoDote } from '../mejoras';
import { car, desgloseCar } from '../rules';

const D = dotesJson as unknown as Dote[];
const dote = (n: string) => D.find((d) => d.nombre === n)!;

describe('mejoras de característica', () => {
  it('lee las opciones de todas las dotes', () => {
    expect(opcionesMejora({ nombre: 'Atleta', texto: dote('Atleta').descripcion })).toEqual({ atrs: ['FUE', 'DES'], cantidad: 1, max: 20 });
    expect(opcionesMejora({ nombre: 'Resiliente', texto: dote('Resiliente').descripcion })!.atrs).toEqual(['CON']);
    expect(opcionesMejora({ nombre: 'Combatiente montado', texto: dote('Combatiente montado').descripcion })!.atrs).toEqual(['FUE', 'DES', 'SAB']);
    expect(opcionesMejora({ nombre: 'Don de la fortaleza', texto: dote('Don de la fortaleza').descripcion })).toMatchObject({ cantidad: 1, max: 30 });
    expect(opcionesMejora({ nombre: 'Mejora de Característica', texto: '' })!.cantidad).toBe(2);
    for (const d of D.filter((x) => x.categoria === 'general' || x.categoria === 'don épico')) {
      if (d.nombre === 'Lanzador ritual') continue;
      expect(opcionesMejora({ nombre: d.nombre, texto: d.descripcion }), d.nombre).not.toBeNull();
    }
    expect(opcionesMejora({ nombre: 'Alerta', texto: dote('Alerta').descripcion })).toBeNull();
  });
  it('suma solo, pregunta si hay varias opciones y respeta el máximo', () => {
    const p = nuevoPersonaje(); p.caracteristicas.CON = 15; p.caracteristicas.FUE = 19;
    p.dotes = [{ nombre: 'Resiliente', texto: dote('Resiliente').descripcion }, { nombre: 'Atleta', texto: dote('Atleta').descripcion }];
    expect(car(p, 'CON')).toBe(16);
    expect(mejoraPendiente(p.dotes[1])).toBe(true);
    p.dotes[1].mejora = ['FUE'];
    expect(car(p, 'FUE')).toBe(20);
    p.dotes.push({ nombre: 'Mejora de Característica', texto: '', mejora: ['FUE', 'FUE'] });
    expect(car(p, 'FUE')).toBe(20); // máximo 20
    expect(aumentosDotes(p, 'FUE')).toEqual([{ texto: 'Atleta', valor: 1 }]);
    expect(desgloseCar(p, 'CON').map((x) => x.texto)).toContain('Resiliente');
    expect(mejoraDe(p.dotes[0])).toEqual(['CON']);
  });
  it('requisitos de nivel y características', () => {
    const p = nuevoPersonaje(); p.nivel = 3;
    const v = (a: string) => (a === 'DES' ? 14 : 10);
    expect(requisitoDote(p, dote('Atleta'), v as never).ok).toBe(false);
    p.nivel = 4;
    expect(requisitoDote(p, dote('Atleta'), v as never).ok).toBe(true);
    expect(requisitoDote(p, dote('Actor'), v as never).ok).toBe(false);
    expect(requisitoDote(p, dote('Lanzador ritual'), v as never).ok).toBe(false);
    expect(requisitoDote(p, dote('Don de la fortaleza'), v as never).ok).toBe(false);
    expect(requisitoDote(p, dote('Alerta'), v as never).ok).toBe(true);
  });
});
