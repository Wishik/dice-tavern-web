import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nuevoPersonaje } from '../personaje';
import { fijarClases } from '../multiclase';
import { calcularAvisos } from '../avisos';
import { competenciasAuto } from '../competencias';
import { eleccionesDe, eleccionesPendientes, fijarEleccion, opcionesEquipo } from '../elecciones';
import { meterEquipoInicial, trocearEquipo } from '../equipoInicial';
import type { Clase, Razas } from '../data';

const clases = JSON.parse(readFileSync('public/data/clases.json', 'utf8')) as Clase[];
const razas = JSON.parse(readFileSync('public/data/razas.json', 'utf8')) as Razas;
fijarClases(clases);
const nombres = (p: ReturnType<typeof nuevoPersonaje>, tipo: string) => competenciasAuto(p).filter((c) => c.tipo === tipo).map((c) => c.es);

describe('competencias', () => {
  it('salen de la clase y de la multiclase sin repetir', () => {
    const p = nuevoPersonaje(); p.clase = 'Pícaro'; p.nivel = 3; p.multiclase = [{ clase: 'Mago', subclase: '', nivel: 1 }];
    expect(nombres(p, 'armaduras')).toEqual(['Armaduras ligeras']);
    expect(competenciasAuto(p).find((c) => c.es === 'Armas sencillas')!.origenes).toEqual(['Pícaro', 'Mago']);
    expect(nombres(p, 'herramientas')).toEqual(['Herramientas de ladrón']);
    p.multiclase = [{ clase: 'Guerrero', subclase: '', nivel: 1 }];
    expect(nombres(p, 'armas')).toContain('Armas marciales');
    expect(competenciasAuto(p).find((c) => c.es === 'Armaduras ligeras')!.origenes).toHaveLength(2);
  });
  it('Orden divina Protector da armas marciales y armaduras pesadas; los instrumentos del bardo salen', () => {
    const p = nuevoPersonaje(); p.clase = 'Clérigo';
    const e = eleccionesDe(p, clases, null).find((x) => x.id === 'Clérigo:orden')!;
    fijarEleccion(p, e, ['Protector']);
    expect(nombres(p, 'armaduras')).toContain('Armaduras pesadas');
    const b = nuevoPersonaje(); b.clase = 'Bardo';
    fijarEleccion(b, eleccionesDe(b, clases, null).find((x) => x.id === 'Bardo:instrumentos')!, ['Laúd', 'Lira']);
    expect(nombres(b, 'herramientas')).toEqual(['Laúd', 'Lira']);
    expect(eleccionesPendientes(b, eleccionesDe(b, clases, null).filter((x) => x.id === 'Bardo:instrumentos'))).toBe(1);
  });
  it('dotes de armadura', () => {
    const p = nuevoPersonaje(); p.clase = 'Mago'; p.dotes = [{ nombre: 'Ligeramente acorazado', texto: '' }];
    expect(nombres(p, 'armaduras')).toEqual(['Armaduras ligeras', 'Escudos']);
  });
});

describe('elecciones', () => {
  it('Guerrero 1: estilo, maestría 3 y equipo; el estilo va a dotes sin contar como dote normal', () => {
    const p = nuevoPersonaje(); p.clase = 'Guerrero';
    const l = eleccionesDe(p, clases, null);
    expect(l.map((e) => e.id)).toEqual(['Guerrero:maestria', 'Guerrero:estilo', 'Guerrero:equipo']);
    expect(l[0].cantidad).toBe(3);
    fijarEleccion(p, l[1], ['Defensa'], () => 'texto');
    expect(p.dotes).toEqual([{ nombre: 'Defensa', texto: 'texto', origen: 'Estilo de combate · Guerrero' }]);
    expect(calcularAvisos(p, clases, razas, null).dotes).toBe(0);
    fijarEleccion(p, l[1], ['Duelo']);
    expect(p.dotes.map((d) => d.nombre)).toEqual(['Duelo']);
    expect(opcionesEquipo(clases.find((c) => c.nombre === 'Guerrero')!.atributos.equipo).map((o) => o.valor)).toEqual(['A + B', 'A + C', 'D', 'Ya lo tengo']);
  });
  it('Resiliencia marca la salvación; avisos cuentan lo pendiente', () => {
    const p = nuevoPersonaje(); p.raza = 'Humano'; p.rasgosRaza = ['Resiliencia']; p.clase = 'Mago';
    const raza = razas.razas.find((r) => r.nombre === 'Humano')!;
    const e = eleccionesDe(p, clases, raza).find((x) => x.id === 'raza:resiliencia')!;
    const antes = calcularAvisos(p, clases, razas, null).elecciones;
    fijarEleccion(p, e, ['CON']);
    expect(p.salvaciones.CON.comp).toBe(true);
    expect(calcularAvisos(p, clases, razas, null).elecciones).toBe(antes - 1);
    fijarEleccion(p, e, ['FUE']);
    expect(p.salvaciones.CON.comp).toBe(false);
  });
  it('Taumaturgo: +1 truco', () => {
    const p = nuevoPersonaje(); p.clase = 'Clérigo';
    const a = calcularAvisos(p, clases, razas, null).limiteTrucos!;
    fijarEleccion(p, eleccionesDe(p, clases, null).find((x) => x.id === 'Clérigo:orden')!, ['Taumaturgo']);
    expect(calcularAvisos(p, clases, razas, null).limiteTrucos).toBe(a + 1);
  });
  it('equipo inicial a la mochila', () => {
    expect(trocearEquipo('Lanza, 5 dagas, raciones para 9 días y 11po.')).toEqual({ objetos: [{ nombre: 'Lanza', cantidad: 1 }, { nombre: 'Dagas', cantidad: 5 }, { nombre: 'Raciones', cantidad: 9 }], po: 11 });
    const p = nuevoPersonaje();
    meterEquipoInicial(p, '2 dagas, un instrumento musical y 19po', [{ nombre: 'Daga', descripcion: '', precio: '2po', tipo: 'arma', categoria: '' }], 'Laúd');
    expect(p.equipo.manoHabil?.nombre).toBe('Daga');
    expect(p.mochila.map((i) => `${i.cantidad} ${i.nombre} ${i.tipo}`)).toEqual(['1 Daga arma', '1 Laúd otro']);
    const q = nuevoPersonaje();
    meterEquipoInicial(q, 'Armadura de cuero, arco corto y 20 flechas', [
      { nombre: 'Armadura de cuero', descripcion: '', precio: '', tipo: 'armadura', categoria: '' },
      { nombre: 'Arco corto', descripcion: '', precio: '', tipo: 'arma', categoria: '', detalles: { 'Propiedades': 'Munición (alcance 80/320), Dos manos' } },
      { nombre: 'Flechas', descripcion: '', precio: '', tipo: 'consumible', categoria: '', maxPorEspacio: 20 }]);
    expect(q.equipo.armadura?.nombre).toBe('Armadura de cuero');
    expect(q.equipo.manoHabil?.municion).toBe(20);
    expect(q.mochila).toEqual([]);
    expect(p.monedas.PO).toBe(19);
  });
});

describe('efectos de lo elegido', () => {
  it('invocaciones dan conjuros, Lecciones da dote, Taumaturgo da bono', async () => {
    const { concesionesActivas } = await import('../conjurosRasgos');
    const { bonoHabilidad } = await import('../bonos');
    const p = nuevoPersonaje(); p.clase = 'Brujo'; p.nivel = 5;
    p.elecciones = { 'Brujo:invocaciones': ['Armadura de sombras', 'Pacto del grimorio', 'Lecciones de los primeros'] };
    const ids = concesionesActivas(p, razas).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['invocacion:Armadura de sombras', 'invocacion:grimorio:trucos', 'invocacion:grimorio:rituales']));
    expect(calcularAvisos(p, clases, razas, null).dotes).toBe(2);
    const c = nuevoPersonaje(); c.clase = 'Clérigo'; c.caracteristicas.SAB = 16; c.elecciones = { 'Clérigo:orden': ['Taumaturgo'] };
    expect(bonoHabilidad(c, 'religion', false).bono).toBe(3);
  });
  it('descripciones de invocaciones y metamagia', () => {
    const p = nuevoPersonaje(); p.clase = 'Hechicero'; p.nivel = 2;
    const m = eleccionesDe(p, clases, null).find((e) => e.id === 'Hechicero:metamagia')!;
    expect(m.opciones.map((o) => o.valor)).toContain('Conjuro potenciado');
    expect(m.opciones.every((o) => (o.desc ?? '').length > 50)).toBe(true);
  });
});
