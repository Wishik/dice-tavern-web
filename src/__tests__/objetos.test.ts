import { describe, expect, it } from 'vitest';
import { nuevoPersonaje, normalizar } from '../personaje';
import { ajustarCinturon, bonoArma, calcularCA, capacidadCinturon, car, valorSalvacion, valorHabilidad } from '../rules';
import { bonoCdConjuro } from '../bonos';
import type { Item } from '../types';

const item = (x: Partial<Item>): Item => ({ id: Math.random().toString(36), nombre: 'X', descripcion: '', precio: '', cantidad: 1, tipo: 'otro', ...x });

describe('mejoras de objetos equipados', () => {
  it('amuleto +1 CA, +2 CON, +1 a todas las salvaciones, +2 sigilo, +1 CD', () => {
    const p = nuevoPersonaje();
    const ca0 = calcularCA(p).total, sal0 = valorSalvacion(p, 'SAB'), sig0 = valorHabilidad(p, 'sigilo');
    p.equipo.amuleto = item({ tipo: 'amuleto', nombre: 'Amuleto', bonos: [{ donde: 'CA', valor: 1 }, { donde: 'CON', valor: 2 }, { donde: 'salv:todas', valor: 1 }, { donde: 'hab:sigilo', valor: 2 }, { donde: 'cdConjuro', valor: 1 }] });
    expect(calcularCA(p).total).toBe(ca0 + 1);
    expect(car(p, 'CON')).toBe(12);
    expect(valorSalvacion(p, 'SAB')).toBe(sal0 + 1);
    expect(valorHabilidad(p, 'sigilo')).toBe(sig0 + 2);
    expect(bonoCdConjuro(p)).toBe(1);
  });
  it('en la mochila no cuenta', () => {
    const p = nuevoPersonaje();
    p.mochila.push(item({ tipo: 'amuleto', bonos: [{ donde: 'CA', valor: 1 }] }));
    expect(calcularCA(p).total).toBe(10);
  });
  it('ataque/daño: el de un arma solo para ella; el de un anillo para todas', () => {
    const p = nuevoPersonaje();
    const espada = item({ tipo: 'arma', nombre: 'Espada', detalles: { 'Daño': '1d8 Cortante', 'Propiedades': '' }, bonos: [{ donde: 'dano', valor: 2 }] });
    const daga = item({ tipo: 'arma', nombre: 'Daga', detalles: { 'Daño': '1d4 Perforante', 'Propiedades': 'Sutil' } });
    p.equipo.manoHabil = espada; p.equipo.manoTorpe = daga;
    expect(bonoArma(p, espada).mod).toBe(2);
    expect(bonoArma(p, daga).mod).toBe(0);
    p.equipo.anillo1 = item({ tipo: 'anillo', bonos: [{ donde: 'ataque', valor: 1 }, { donde: 'dano', valor: 1 }] });
    expect(bonoArma(p, daga).mod).toBe(1);
    expect(bonoArma(p, daga).ataque).toBe(bonoArma(p, espada).ataque);
  });
});

describe('cinturón', () => {
  it('sin cinturón no hay espacios; lo que sobra va a la mochila y luego al suelo', () => {
    const p = nuevoPersonaje();
    expect(capacidadCinturon(p)).toBe(0);
    p.equipo.cinto = item({ tipo: 'cinturon', cinturon: 'mediano' });
    expect(capacidadCinturon(p)).toBe(6);
    for (let i = 0; i < 6; i++) p.cinturon.items.push(item({ nombre: `C${i}` }));
    for (let i = 0; i < 20; i++) p.mochila.push(item({ nombre: `M${i}` }));
    p.equipo.cinto = null;
    const r = ajustarCinturon(p)!;
    expect(p.cinturon.items).toHaveLength(0);
    expect(r.mochila.length).toBe(2); // la mochila llega como mucho a 22
    expect(r.suelo.length).toBe(4);
    expect(p.suelo).toHaveLength(4);
  });
  it('migración: el antiguo tamaño se convierte en un cinturón equipado', () => {
    const viejo = nuevoPersonaje() as unknown as Record<string, unknown>;
    viejo.cinturon = { tamano: 'grande', items: [] };
    const p = normalizar(viejo);
    expect(p.equipo.cinto?.tipo).toBe('cinturon');
    expect(capacidadCinturon(p)).toBe(9);
    expect(p.cinturon.tamano).toBeUndefined();
  });
  it('migración: pociones a consumible y objetos de yelmo a categoría yelmo', () => {
    const viejo = nuevoPersonaje();
    viejo.mochila.push(item({ tipo: 'pocion' }));
    viejo.equipo.yelmo = item({ tipo: 'otro' });
    const p = normalizar(viejo);
    expect(p.mochila[0].tipo).toBe('consumible');
    expect(p.equipo.yelmo?.tipo).toBe('yelmo');
  });
});
