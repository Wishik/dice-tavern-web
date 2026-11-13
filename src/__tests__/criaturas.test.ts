import { describe, expect, it } from 'vitest';
import { aCodigo, deCodigo  } from '../views/CriaturasPropias';
import { pgSegun } from '../views/Combate';
import type { Monstruo } from '../views/Combate';

const m = { id: 'p-x', en: 'Ñu feroz', es: 'Ñu feroz', ru: 'Ñu feroz', tam: ['Grande', 'Большой'], tipo: ['bestia', 'bestia'], ca: 14, pg: 30, dg: '4d10+8', vel: { walk: '40 ft.' }, car: [18, 12, 14, 2, 10, 5], vd: 2, px: 450, bc: 2, sentidos: { passive_perception: 10 }, idiomas: '', res: [], inm: ['fuego'], vul: [], inmEst: [], rasgos: [{ n: 'Carga', d: 'Texto largo con acentos: á é í ó ú ñ ü' }], acciones: [], adicionales: [], reacciones: [], legendarias: [], atq: [{ es: 'Cornada', ru: 'Cornada', bono: 6, dano: [{ d: '2d6+4', t: ['perforante', 'колющий'] }] }], salv: [6, null, null, null, null, null], hab: [{ id: 'atletismo', v: 6 }], propia: true } as Monstruo;

describe('criaturas propias', () => {
  it('exporta e importa con el mismo contenido y un id nuevo', async () => {
    const c = await aCodigo(m);
    expect(c.startsWith('DT')).toBe(true);
    const r = await deCodigo(c);
    expect(r.id).not.toBe(m.id);
    expect({ ...r, id: m.id }).toEqual(m);
    const r2 = await deCodigo('https://x.app/?criatura=' + c);
    expect(r2.es).toBe('Ñu feroz');
  });
  it('rechaza códigos rotos', async () => {
    await expect(deCodigo('hola')).rejects.toThrow();
    await expect(deCodigo('DT1abc')).rejects.toThrow();
  });
  it('PG: media, máximos y tirados', () => {
    expect(pgSegun('4d10+8', 30, 'media')).toBe(30);
    expect(pgSegun('4d10+8', 30, 'max')).toBe(48);
    for (let i = 0; i < 50; i++) { const t = pgSegun('4d10+8', 30, 'tirar'); expect(t).toBeGreaterThanOrEqual(12); expect(t).toBeLessThanOrEqual(48); }
  });
});
