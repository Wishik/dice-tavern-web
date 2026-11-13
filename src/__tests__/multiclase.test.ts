import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nuevoPersonaje } from '../personaje';
import { ajustarMulticlase, asignarNivel, clasesDe, fijarClases, nivelLanzador, textoClasesBreve } from '../multiclase';
import { calcularAvisos, manaMaximo } from '../avisos';
import { recursosClase } from '../recursos';
import { bonoCompetencia, cambiarNivel } from '../rules';
import { potenciadoresDisponibles } from '../potenciadores';
import type { Clase } from '../data';

const clases = JSON.parse(readFileSync('public/data/clases.json', 'utf8')) as Clase[];
fijarClases(clases);
const cl = (n: string) => clases.find((c) => c.nombre === n)!;

describe('multiclase', () => {
  it('niveles por clase, total y subida en otra clase', () => {
    const p = nuevoPersonaje(); p.clase = 'Pícaro'; p.nivel = 3;
    cambiarNivel(p, 4); asignarNivel(p, 'Guerrero');
    expect(clasesDe(p)).toEqual([{ clase: 'Pícaro', subclase: '', nivel: 3 }, { clase: 'Guerrero', subclase: '', nivel: 1 }]);
    cambiarNivel(p, 5); asignarNivel(p, 'Guerrero');
    expect(clasesDe(p)[1].nivel).toBe(2);
    expect(textoClasesBreve(p)).toBe('Pícaro 3 / Guerrero 2');
    cambiarNivel(p, 2); // bajar: la principal se queda al menos con 1
    expect(clasesDe(p)).toEqual([{ clase: 'Pícaro', subclase: '', nivel: 1 }, { clase: 'Guerrero', subclase: '', nivel: 1 }]);
    ajustarMulticlase(p);
  });
  it('recursos y potenciadores salen de cada clase a su nivel', () => {
    const p = nuevoPersonaje(); p.clase = 'Pícaro'; p.nivel = 5; p.multiclase = [{ clase: 'Bárbaro', subclase: '', nivel: 2 }];
    expect(recursosClase(p, cl('Pícaro')).map((r) => r.id)).toContain('furia');
    const pots = potenciadoresDisponibles(p, cl('Pícaro'), clases);
    expect(pots.find((x) => x.id === 'furtivo')!.dano).toBe('+2d6'); // Pícaro 3
    expect(pots.some((x) => x.id === 'furia')).toBe(true);
  });
  it('maná por nivel de lanzador conjunto y límites de conjuros por clase', () => {
    const p = nuevoPersonaje(); p.clase = 'Clérigo'; p.nivel = 5; p.multiclase = [{ clase: 'Mago', subclase: '', nivel: 2 }];
    expect(nivelLanzador(p)).toBe(5);
    const mago5 = Number(cl('Mago').tabla[4]['Maná']);
    expect(manaMaximo(p, clases)).toBe(mago5);
    const a = calcularAvisos(p, clases, null, null);
    expect(a.magia.map((m) => [m.clase, m.nivel])).toEqual([['Clérigo', 3], ['Mago', 2]]);
    expect(bonoCompetencia(p.nivel)).toBe(3);
  });
});
