import { describe, it, expect } from 'vitest';
import { MOCHILA_MAX, valorHabilidad, avisosTirada, bonoArma, calcularCA, caracteristicaConjuros, dadosConjuro, embolsarExceso, espaciosUsados, idiomasDeTexto, pgPorDefecto, cambiarNivel, pgSubida } from '../rules';
import { nuevoPersonaje, normalizar } from '../personaje';
import type { Item } from '../types';

const arma = (nombre: string, dano: string, props: string): Item => ({ id: nombre, nombre, descripcion: '', precio: '', cantidad: 1, tipo: 'arma', detalles: { 'Daño': dano, 'Propiedades': props } });
const armadura = (nombre: string, ca: string, sigilo = '--'): Item => ({ id: nombre, nombre, descripcion: '', precio: '', cantidad: 1, tipo: 'armadura', detalles: { 'Clase de armadura': ca, 'Fuerza': '--', 'Sigilo': sigilo } });

describe('mochila de 22 como máximo', () => {
  it('las bolsas de monedas no pasan de 22 espacios', () => {
    const p = nuevoPersonaje('Mir');
    p.monedas.PM = 900000;
    embolsarExceso(p);
    expect(espaciosUsados(p.mochila)).toBe(MOCHILA_MAX);
  });
});

describe('CA automática', () => {
  it('sin armadura 10 + DES', () => {
    const p = nuevoPersonaje(); p.caracteristicas.DES = 16;
    expect(calcularCA(p).total).toBe(13);
  });
  it('armadura media con tope de DES y escudo', () => {
    const p = nuevoPersonaje(); p.caracteristicas.DES = 18;
    p.equipo.armadura = armadura('Coraza', '14 + modificador de Destreza (máx.2)');
    p.equipo.manoTorpe = { ...armadura('Escudo', '+2'), tipo: 'escudo' };
    expect(calcularCA(p).total).toBe(18);
  });
  it('armadura pesada e aviso de sigilo', () => {
    const p = nuevoPersonaje(); p.caracteristicas.DES = 14;
    p.equipo.armadura = armadura('Cota de malla', '16', 'Desventaja');
    expect(calcularCA(p).total).toBe(16);
    expect(avisosTirada(p, 'habilidad', 'DES', 'sigilo').join()).toMatch(/Sigilo/);
  });
  it('el ajuste de CA mal migrado se limpia', () => {
    const viejo = { ...nuevoPersonaje(), ca: '3', bonusCA: -9, caV2: undefined };
    expect(calcularCA(normalizar(viejo)).total).toBe(10);
  });
});

describe('PG, conjuros y armas', () => {
  it('PG por defecto: dado máximo + CON y luego la media', () => {
    const p = nuevoPersonaje(); p.caracteristicas.CON = 14;
    expect(pgPorDefecto(p, 'd8')).toBe(11);
    cambiarNivel(p, 3);
    expect(p.subidasPendientes).toBe(2);
    expect(pgSubida(1, 6)).toBe(1);
  });
  it('característica de conjuros automática por clase', () => {
    const p = nuevoPersonaje(); p.clase = 'Druida';
    expect(caracteristicaConjuros(p)).toBe('SAB');
    p.conjuroCaracteristica = 'INT';
    expect(caracteristicaConjuros(p)).toBe('INT');
  });
  it('trucos suben de dados por nivel y conjuros por espacio', () => {
    const descarga = 'Si acierta, el objetivo recibe 1d10 de daño de fuego.\n\nMejora de truco. El daño aumenta en 1d10 cuando alcanzas los niveles 5 (2d10), 11 (3d10) y 17 (4d10).';
    expect(dadosConjuro(descarga, 0, 1, 0)).toEqual(['1d10']);
    expect(dadosConjuro(descarga, 0, 11, 0)).toEqual(['3d10']);
    const bola = 'sufrirán 8d6 de daño de fuego.\n\nCon un espacio de conjuro de nivel superior. El daño aumenta en 1d6 por cada nivel por encima de 3 que tenga el espacio.';
    expect(dadosConjuro(bola, 3, 5, 5)).toEqual(['10d6']);
  });
  it('arma sutil usa la mejor de FUE/DES; arco usa DES', () => {
    const p = nuevoPersonaje(); p.caracteristicas.FUE = 10; p.caracteristicas.DES = 16;
    expect(bonoArma(p, arma('Espada corta', '1d6 Perforante', 'Ligera, Sutil'))).toMatchObject({ ataque: 5, mod: 3, atr: 'DES' });
    expect(bonoArma(p, arma('Arco corto', '1d6 Perforante', 'A dos manos, Munición(flecha), Alcance(80/320)')).atr).toBe('DES');
    expect(bonoArma(p, arma('Maza', '1d6 Contundente', '--')).atr).toBe('FUE');
  });
  it('idiomas de la raza', () => {
    expect(idiomasDeTexto('Élfico, Silvano y Común')).toEqual(['Élfico', 'Silvano', 'Común']);
    expect(idiomasDeTexto('Élfico e Infracomún')).toEqual(['Élfico', 'Infracomún']);
    expect(idiomasDeTexto('Común y Otro a tu elección')).toEqual(['Común']);
  });
});

describe('bonos automáticos de rasgos y dotes', () => {
  it('Defensa de los pequeños: +1 CA y +2 Sigilo (Medianos)', () => {
    const p = nuevoPersonaje(); p.raza = 'Medianos'; p.caracteristicas.DES = 15;
    expect(calcularCA(p).total).toBe(13);
    p.habilidades.sigilo.comp = true;
    expect(valorHabilidad(p, 'sigilo')).toBe(2 + 2 + 2);
  });
  it('Sentidos Élficos da competencia o +2 si ya la tenías', () => {
    const p = nuevoPersonaje(); p.raza = 'Altos Elfos'; p.rasgosRaza = ['Sentidos Élficos'];
    expect(valorHabilidad(p, 'percepcion')).toBe(2);
    p.habilidades.percepcion.comp = true;
    expect(valorHabilidad(p, 'percepcion')).toBe(4);
  });
  it('Defensa sin armadura del Bárbaro', () => {
    const p = nuevoPersonaje(); p.clase = 'Bárbaro'; p.caracteristicas.DES = 14; p.caracteristicas.CON = 16;
    expect(calcularCA(p).total).toBe(15);
  });
});
