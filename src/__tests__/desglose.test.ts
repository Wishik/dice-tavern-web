import { describe, expect, it } from 'vitest';
import { normalizar, nuevoPersonaje } from '../personaje';
import { desgloseHabilidad, valorHabilidad, valorSalvacion } from '../rules';

describe('desglose de habilidades y salvaciones', () => {
  it('suma modificador, competencia, pericia y bonus a mano', () => {
    const p = nuevoPersonaje(); p.clase = 'Pícaro'; p.nivel = 1; p.caracteristicas.DES = 16;
    p.habilidades.sigilo = { comp: true, pericia: true, bonus: 0 };
    p.bonosExtra = [{ id: 'a', donde: 'hab:sigilo', valor: 1, origen: 'Capa élfica' }];
    expect(desgloseHabilidad(p, 'sigilo').map((x) => x.valor)).toEqual([3, 2, 2, 1]);
    expect(valorHabilidad(p, 'sigilo')).toBe(8);
  });
  it('las casillas antiguas pasan a bonus «Ajuste» sin cambiar el total', () => {
    const p = nuevoPersonaje(); p.caracteristicas.SAB = 14;
    p.habilidades.percepcion = { comp: false, pericia: false, bonus: 2 };
    p.salvaciones.SAB = { comp: false, bonus: 1 };
    const antes = [valorHabilidad(p, 'percepcion'), valorSalvacion(p, 'SAB')];
    const q = normalizar(JSON.parse(JSON.stringify(p)));
    expect(q.habilidades.percepcion.bonus).toBe(0);
    expect(q.bonosExtra?.map((b) => [b.donde, b.valor, b.origen])).toEqual([['hab:percepcion', 2, 'Ajuste'], ['salv:SAB', 1, 'Ajuste']]);
    expect([valorHabilidad(q, 'percepcion'), valorSalvacion(q, 'SAB')]).toEqual(antes);
  });
});
