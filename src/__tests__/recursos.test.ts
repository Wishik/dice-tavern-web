import { describe, expect, it } from 'vitest';
import clases from '../../public/data/clases.json';
import { nuevoPersonaje } from '../personaje';
import { descansoCorto, descansoLargo, recursosClase, recursosPersonaje } from '../recursos';
import type { Clase } from '../data';

const C = clases as unknown as Clase[];
const clase = (n: string) => C.find((c) => c.nombre === n)!;

describe('recursos de clase', () => {
  it('saca los usos de la tabla de la clase al nivel del personaje', () => {
    const p = nuevoPersonaje(); p.clase = 'Bárbaro'; p.nivel = 3;
    expect(recursosClase(p, clase('Bárbaro'))).toEqual([{ id: 'furia', es: 'Furia', ru: 'Ярость', max: 3, corto: 'uno' }]);
    p.clase = 'Monje'; p.nivel = 1;
    expect(recursosClase(p, clase('Monje'))).toEqual([]); // «--» a nivel 1
    p.nivel = 2;
    expect(recursosClase(p, clase('Monje'))[0].max).toBeGreaterThan(0);
    p.clase = 'Bardo'; p.caracteristicas.CAR = 8;
    expect(recursosClase(p, clase('Bardo'))[0]).toMatchObject({ id: 'inspiracionBardica', max: 1 });
    p.clase = 'Paladín'; p.nivel = 4;
    expect(recursosClase(p, clase('Paladín')).find((r) => r.id === 'imponerManos')!.max).toBe(20);
  });
  it('el descanso largo recupera la mitad de los DG (mín. 1) y todo lo demás', () => {
    const p = nuevoPersonaje(); p.nivel = 5; p.dgUsados = 5; p.pg = { max: 40, actual: 3, temp: 4 }; p.pm = { max: 6, actual: 0 };
    p.recursosUsados = { furia: 2 }; p.agotamiento = 2; p.estados = ['inconsciente', 'envenenado'];
    descansoLargo(p);
    expect(p.dgUsados).toBe(3);
    expect(p.pg).toEqual({ max: 40, actual: 40, temp: 0 });
    expect(p.pm.actual).toBe(6);
    expect(p.recursosUsados).toEqual({});
    expect(p.agotamiento).toBe(1);
    expect(p.estados).toEqual(['envenenado']);
    const q = nuevoPersonaje(); q.nivel = 1; q.dgUsados = 1; descansoLargo(q); expect(q.dgUsados).toBe(0);
  });

  it('el descanso corto devuelve lo que dice el manual', () => {
    const p = nuevoPersonaje(); p.clase = 'Bárbaro'; p.nivel = 6; p.raza = 'Trol zandalari';
    p.recursosUsados = { furia: 3, trance: 2 };
    expect(recursosPersonaje(p, clase('Bárbaro')).map((r) => r.id)).toEqual(['furia', 'trance']);
    descansoCorto(p, clase('Bárbaro'));
    expect(p.recursosUsados).toEqual({ furia: 2, trance: 1 });
    const m = nuevoPersonaje(); m.clase = 'Monje'; m.nivel = 4; m.recursosUsados = { ki: 3 };
    descansoCorto(m, clase('Monje')); expect(m.recursosUsados.ki).toBe(0);
    const h = nuevoPersonaje(); h.clase = 'Hechicero'; h.nivel = 4; h.recursosUsados = { puntosHechiceria: 2 };
    descansoCorto(h, clase('Hechicero')); expect(h.recursosUsados.puntosHechiceria).toBe(2);
    const e = nuevoPersonaje(); e.clase = 'Explorador'; e.nivel = 10; e.agotamiento = 2;
    descansoCorto(e, clase('Explorador')); expect(e.agotamiento).toBe(1);
  });
});
