import { describe, expect, it } from 'vitest';
import clasesJson from '../../public/data/clases.json';
import type { Clase } from '../data';
import { nuevoPersonaje } from '../personaje';
import { fijarClases } from '../multiclase';
import { aplicarClase, aplicarSubclase } from '../creacion';
import { car, carPermanente } from '../rules';

const C = clasesJson as unknown as Clase[];
fijarClases(C);
const pj = () => {
  const p = nuevoPersonaje(); p.raza = 'Humano'; p.clase = 'Guerrero'; p.subclase = 'Arquero arcano'; p.nivel = 5;
  delete p.asistente;
  p.elecciones = { 'Guerrero:estilo': ['Defensa'], 'Guerrero:sub:disparos': ['a', 'b'], 'raza:x': ['y'] };
  return p;
};

describe('cambiar clase o subclase en un personaje ya creado', () => {
  it('subclase: borra lo elegido de la anterior y abre los pasos', () => {
    const p = pj();
    aplicarSubclase(p, 'Guerrero', 'Campeón');
    expect(p.elecciones!['Guerrero:sub:disparos']).toBeUndefined();
    expect(p.elecciones!['Guerrero:estilo']).toEqual(['Defensa']);
    expect(p.subida?.cambio).toEqual(['Guerrero']);
  });
  it('clase: borra lo elegido de la clase anterior y empieza desde 0', () => {
    const p = pj();
    aplicarClase(p, 'Mago', C);
    expect(Object.keys(p.elecciones!)).toEqual(['raza:x']);
    expect(p.subida?.antes).toEqual({ Mago: 0 });
  });
  it('en el asistente de creación no abre los pasos', () => {
    const p = pj(); p.asistente = 3;
    aplicarSubclase(p, 'Guerrero', 'Campeón');
    expect(p.subida).toBeUndefined();
  });
});

describe('características permanentes', () => {
  it('la raza cuenta como de por vida; los efectos del máster no', () => {
    const p = pj(); p.caracteristicas.FUE = 14; p.bonoRaza = ['FUE', 'DES'];
    expect(car(p, 'FUE')).toBe(16); expect(carPermanente(p, 'FUE')).toBe(16);
    p.efectosCar = [{ atributo: 'FUE', valor: 2 } as never];
    expect(car(p, 'FUE')).toBe(18); expect(carPermanente(p, 'FUE')).toBe(16);
  });
});
