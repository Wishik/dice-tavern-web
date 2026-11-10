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
