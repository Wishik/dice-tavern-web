import { describe, expect, it } from 'vitest';
import clases from '../../public/data/clases.json';
import { nuevoPersonaje } from '../personaje';
import { descansoLargo, recursosClase } from '../recursos';
import type { Clase } from '../data';

const C = clases as unknown as Clase[];
const clase = (n: string) => C.find((c) => c.nombre === n)!;

describe('recursos de clase', () => {
  it('saca los usos de la tabla de la clase al nivel del personaje', () => {
    const p = nuevoPersonaje(); p.clase = 'Bárbaro'; p.nivel = 3;
    expect(recursosClase(p, clase('Bárbaro'))).toEqual([{ id: 'furia', es: 'Furia', ru: 'Ярость', max: 3 }]);
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
});
