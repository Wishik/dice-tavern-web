import { describe, expect, it } from 'vitest';
import { nuevoPersonaje } from '../personaje';
import { descansoCorto, descansoLargo } from '../recursos';
import { recordatoriosCorto } from '../descansoCorto';

describe('descanso corto', () => {
  it('cuenta los descansos cortos y el largo los reinicia', () => {
    const p = nuevoPersonaje();
    descansoCorto(p, null); descansoCorto(p, null);
    expect(p.descansosCortos).toBe(2);
    descansoLargo(p);
    expect(p.descansosCortos).toBe(0);
  });
  it('recordatorios por clase, subclase, nivel y dote', () => {
    const p = nuevoPersonaje();
    p.clase = 'Guerrero'; p.nivel = 3; p.subclase = 'Maestro del combate';
    p.dotes = [{ nombre: 'Chef' } as never];
    const r = recordatoriosCorto(p, null, null, false);
    expect(r.some((t) => t.startsWith('Acción súbita'))).toBe(true);
    expect(r.some((t) => t.startsWith('Dados de supremacía'))).toBe(true);
    expect(r.some((t) => t.startsWith('Chef'))).toBe(true);
    p.nivel = 1;
    expect(recordatoriosCorto(p, null, null, false).some((t) => t.startsWith('Acción súbita'))).toBe(false);
  });
});

import { catalogoRecursos } from '../descansoCorto';
import { recursosPersonaje } from '../recursos';
import { limitesHabilidades, sobrantes } from '../limitesHabilidades';

describe('recursos añadidos a mano', () => {
  it('el catálogo pone primero los del personaje y los añadidos se recuperan en el descanso', () => {
    const p = nuevoPersonaje(); p.clase = 'Guerrero'; p.nivel = 3; p.subclase = 'Maestro del combate';
    const cat = catalogoRecursos(p, null);
    expect(cat[0].tuyo).toBe(true);
    const sup = cat.find((r) => r.id === 'dadosSupremacia')!;
    expect(sup.max).toBe(4);
    p.recursosExtra = [{ id: sup.id, es: sup.es, ru: sup.ru, max: sup.max, corto: sup.corto }];
    expect(recursosPersonaje(p, null).some((r) => r.id === 'dadosSupremacia' && r.extra)).toBe(true);
    p.recursosUsados = { dadosSupremacia: 3 };
    descansoCorto(p, null);
    expect(p.recursosUsados.dadosSupremacia).toBe(0);
    expect(recordatoriosCorto(p, null, null, false).some((t) => t.startsWith('Dados de supremacía'))).toBe(false);
    expect(catalogoRecursos(p, null).some((r) => r.id === 'dadosSupremacia')).toBe(false);
  });
});

describe('límites de habilidades', () => {
  it('suma rasgos y dotes y marca de más las últimas', () => {
    const p = nuevoPersonaje(); p.raza = 'Semiorco'; p.clase = 'Pícaro'; p.nivel = 1;
    p.dotes = [{ nombre: 'Experto en habilidades' } as never];
    const clase = { atributos: { habilidadesN: 4 }, tabla: [] } as never;
    const l = limitesHabilidades(p, clase, null);
    expect(l.comp).toBe(4 + 2 + 1);
    expect(l.pericia).toBe(2 + 1);
    expect([...sobrantes(['a', 'b', 'c'], 2, ['c', 'a', 'b'], [])]).toEqual(['b']);
  });
});
