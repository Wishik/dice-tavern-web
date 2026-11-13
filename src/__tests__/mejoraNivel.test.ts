import { describe, expect, it } from 'vitest';
import { mejoraCalculada, dadosConjuro } from '../rules';
import spells from '../../public/data/spells.json';

const t = (n: string) => (spells as { nombre: string; descripcion: string }[]).find((s) => s.nombre === n)!.descripcion;

describe('mejora por nivel de espacio', () => {
  it('Proyectil mágico: dardos', () => {
    expect(mejoraCalculada(t('Proyectil mágico'), 1, 3)).toEqual({ texto: '+2 dardos: 5 dardos en total', proyectiles: { n: 5, nombre: 'dardos' } });
  });
  it('Rayo abrasador: rayos', () => {
    expect(mejoraCalculada(t('Rayo abrasador'), 2, 5)?.proyectiles).toEqual({ n: 6, nombre: 'rayos' });
  });
  it('objetivos adicionales', () => {
    expect(mejoraCalculada(t('Inmovilizar persona'), 2, 4)?.texto).toBe('+2 humanoides');
    expect(mejoraCalculada(t('Bendición'), 1, 2)?.texto).toBe('+1 criatura');
  });
  it('cantidades numéricas', () => {
    expect(mejoraCalculada(t('Curar'), 6, 8)?.texto).toMatch(/\+20$/);
    expect(mejoraCalculada(t('Confusión'), 4, 6)?.texto).toMatch(/\+3 m$/);
    expect(mejoraCalculada(t('Falsa vida'), 1, 3)?.texto).toMatch(/\+10/);
  });
  it('Bola de fuego sube dados', () => {
    expect(dadosConjuro(t('Bola de fuego'), 3, 5, 5)[0]).toBe('10d6');
  });
  it('sin texto de pie de foto en Rayo abrasador', () => {
    expect(t('Rayo abrasador')).not.toMatch(/BRUJO MEDIANO/);
    expect(t('Rayo abrasador').startsWith('Lanzas tres rayos')).toBe(true);
  });
});
