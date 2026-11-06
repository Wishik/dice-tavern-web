import { aplicarConjuntoEstandar, aplicarExperiencia, caracteristicasSinTocar, embolsarExceso, leerPrecio, pxParaSubir } from '../rules';
import { describe, it, expect } from 'vitest';
import { bonoCompetencia, convertir, espaciosPorFuerza, estadoCarga, modificador, parseFormula, valorHabilidad } from '../rules';
import { nuevoPersonaje } from '../personaje';

const item = (n: string, cantidad = 1, maxPorEspacio?: number) => ({ id: n, nombre: n, descripcion: '', precio: '', cantidad, maxPorEspacio, tipo: 'otro' as const });

describe('reglas', () => {
  it('modificadores y competencia', () => {
    expect(modificador(17)).toBe(3); expect(modificador(8)).toBe(-1); expect(modificador(10)).toBe(0);
    expect(bonoCompetencia(1)).toBe(2); expect(bonoCompetencia(5)).toBe(3); expect(bonoCompetencia(17)).toBe(6);
  });
  it('habilidad del cuaderno: Sigilo de Wishik = 9', () => {
    const p = nuevoPersonaje('Wishik');
    p.caracteristicas.DES = 17;
    p.habilidades.sigilo = { comp: true, pericia: true, bonus: 2 };
    expect(valorHabilidad(p, 'sigilo')).toBe(9);
  });
  it('espacios por fuerza', () => {
    expect(espaciosPorFuerza(11)).toBe(0); expect(espaciosPorFuerza(12)).toBe(1); expect(espaciosPorFuerza(20)).toBe(5);
  });
  it('sobrecarga reduce la velocidad', () => {
    const p = nuevoPersonaje('x'); p.caracteristicas.FUE = 12; // 8 espacios libres
    p.mochila = Array.from({ length: 8 }, (_, i) => item('a' + i));
    expect(estadoCarga(p).penalizacion).toBe(0);
    p.mochila.push(item('extra'));
    expect(estadoCarga(p).penalizacion).toBe(-5);
    p.mochila.push(...Array.from({ length: 6 }, (_, i) => item('b' + i))); // exceso 7
    expect(estadoCarga(p).penalizacion).toBe(-10);
    p.mochila.push(...Array.from({ length: 5 }, (_, i) => item('c' + i))); // exceso 12
    expect(estadoCarga(p).penalizacion).toBe(-20);
  });
  it('pilas: 25 flechas con máximo 20 ocupan 2 espacios, 10 velas 1', () => {
    const p = nuevoPersonaje('x'); p.mochila = [item('flechas', 25, 20), item('velas', 10)];
    expect(estadoCarga(p).usados).toBe(3);
  });
  it('conversión de monedas', () => {
    const m = { PM: 0, PL: 0, PO: 7, PE: 0, PP: 0, PC: 96 };
    expect(convertir(m, 'PC', 'PO', 96).ok).toBe(false);
    const r = convertir(m, 'PC', 'PP', 96);
    expect(r.monedas!.PP).toBe(9); expect(r.monedas!.PC).toBe(6);
    const r2 = convertir(m, 'PO', 'PE', 2);
    expect(r2.monedas!.PE).toBe(10); expect(r2.monedas!.PO).toBe(5);
    expect(convertir(m, 'PO', 'PL', 7).monedas!.PL).toBe(1);
    expect(convertir(m, 'PO', 'PO', 1).ok).toBe(false);
    expect(convertir(m, 'PO', 'PM', 50).ok).toBe(false);
  });
  it('fórmulas', () => {
    expect(parseFormula('1d6+3')).toEqual({ dados: [{ n: 1, caras: 6 }], mod: 3 });
    expect(parseFormula('2d8 + 4')).toEqual({ dados: [{ n: 2, caras: 8 }], mod: 4 });
    expect(parseFormula('hola')).toBeNull();
  });
});

describe('experiencia', () => {
  it('sube de nivel y guarda el resto', () => {
    expect(pxParaSubir(1)).toBe(300);
    expect(aplicarExperiencia(1, 350)).toEqual({ nivel: 2, exp: 50, subidos: 1 });
    expect(aplicarExperiencia(1, 300 + 600 + 5)).toEqual({ nivel: 3, exp: 5, subidos: 2 });
    expect(aplicarExperiencia(3, 100)).toEqual({ nivel: 3, exp: 100, subidos: 0 });
    expect(aplicarExperiencia(20, 99999).nivel).toBe(20);
  });
});

describe('bolsas de monedas', () => {
  it('600 PO → bolsa de 500 y quedan 100', () => {
    const p = nuevoPersonaje(); p.monedas.PO = 600;
    expect(embolsarExceso(p)).toBe(1);
    expect(p.monedas.PO).toBe(100);
    expect(p.mochila[0].bolsa).toEqual({ moneda: 'PO', cantidad: 500 });
  });
  it('500 justas no se tocan; 1001 → dos bolsas', () => {
    const p = nuevoPersonaje(); p.monedas.PC = 500; p.monedas.PP = 1001;
    expect(embolsarExceso(p)).toBe(2);
    expect(p.monedas.PC).toBe(500); expect(p.monedas.PP).toBe(1);
  });
  it('lee precios', () => {
    expect(leerPrecio('50po')).toEqual({ cantidad: 50, moneda: 'PO' });
    expect(leerPrecio('155 pc')).toEqual({ cantidad: 155, moneda: 'PC' });
    expect(leerPrecio('gratis')).toBeNull();
  });
});

describe('conjunto estándar', () => {
  it('se aplica al elegir clase si no se ha tocado', () => {
    const p = nuevoPersonaje();
    expect(caracteristicasSinTocar(p)).toBe(true);
    aplicarConjuntoEstandar(p, 'Pícaro');
    expect(p.caracteristicas).toMatchObject({ FUE: 12, DES: 15, CON: 13, INT: 14, SAB: 10, CAR: 8 });
    expect(caracteristicasSinTocar(p)).toBe(true);
    p.caracteristicas.FUE = 17;
    expect(caracteristicasSinTocar(p)).toBe(false);
  });
});
