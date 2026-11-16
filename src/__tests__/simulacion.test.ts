import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import clasesJson from '../../public/data/clases.json';
import razasJson from '../../public/data/razas.json';
import trasfondosJson from '../../public/data/trasfondos.json';
import { nuevoPersonaje } from '../personaje';
import type { Clase, Razas, Trasfondo } from '../data';
import { ATRIBUTOS, type Personaje } from '../types';
import { HABILIDADES, ataqueConjuros, bonoCompetencia, calcularCA, car, cdConjuros, iniciativa, pgExtra, valorHabilidad, valorSalvacion, avisosIniciativa, avisosTirada } from '../rules';
import { bonoVelocidad, velocidadRasgo, bonosActivos } from '../bonos';
import { calcularAvisos, manaMaximo } from '../avisos';
import { recursosPersonaje } from '../recursos';
import { eleccionesDe } from '../elecciones';
import { competenciasAuto } from '../competencias';
import { limitesHabilidades } from '../limitesHabilidades';
import { fijarClases } from '../multiclase';

const C = clasesJson as unknown as Clase[];
const R = razasJson as unknown as Razas;
const T = trasfondosJson as unknown as Trasfondo[];
fijarClases(C);

/** Todo lo que la ficha calcula sola, en números, para ver que nada sale NaN ni revienta. */
function numeros(p: Personaje, clase: Clase | null) {
  const n: Record<string, number> = {
    CA: calcularCA(p).total, ini: iniciativa(p), vel: bonoVelocidad(p), mana: manaMaximo(p, C), bc: bonoCompetencia(p.nivel),
    pgExtra: pgExtra(p).reduce((s, x) => s + x.valor, 0),
  };
  for (const a of ATRIBUTOS) { n[a] = car(p, a); n[`salv${a}`] = valorSalvacion(p, a); }
  for (const h of HABILIDADES) n[h.id] = valorHabilidad(p, h.id);
  const cd = cdConjuros(p), at = ataqueConjuros(p);
  if (cd !== null) n.cd = cd;
  if (at !== null) n.atq = at;
  for (const r of recursosPersonaje(p, clase)) n[`rec:${r.id}`] = r.max;
  const av = calcularAvisos(p, C, R, T);
  for (const [k, v] of Object.entries(av)) if (typeof v === 'number') n[`av:${k}`] = v;
  eleccionesDe(p, C, R.razas.find((r) => r.nombre === p.raza) ?? null);
  competenciasAuto(p);
  limitesHabilidades(p, clase, T);
  avisosIniciativa(p); avisosTirada(p, 'salvacion', 'DES');
  for (const k of ['trepar', 'nadar', 'volar'] as const) { const v = velocidadRasgo(p, k); if (v) n[k] = v.pies; }
  return n;
}
const malos = (n: Record<string, number>) => Object.entries(n).filter(([, v]) => typeof v !== 'number' || !Number.isFinite(v)).map(([k, v]) => `${k}=${v}`);

describe('simulación completa', () => {
  it('cada raza con sus rasgos: todo da números', () => {
    const informe: string[] = [];
    for (const raza of R.razas) {
      const p = nuevoPersonaje(); p.raza = raza.nombre; p.clase = 'Guerrero'; p.nivel = 1;
      p.rasgosRaza = (raza.rasgosUnicos ?? []).map((r) => r.nombre);
      const n = numeros(p, C.find((c) => c.nombre === 'Guerrero')!);
      expect(malos(n), raza.nombre).toEqual([]);
      informe.push(`${raza.nombre}: ${bonosActivos(p).map((x) => x.origen).join(', ') || '—'} | CA ${n.CA} vel+${n.vel}${n.trepar ? ` trepar ${n.trepar}` : ''}${n.nadar ? ` nadar ${n.nadar}` : ''}${n.volar ? ` volar ${n.volar}` : ''}`);
    }
    writeFileSync('/tmp/claude-0/sim_razas.txt', informe.join('\n'));
  });

  it('cada clase y subclase de nivel 1 a 20: todo da números', () => {
    const informe: string[] = [];
    for (const clase of C) {
      const subs = ['', ...(clase.subclases ?? []).map((s) => s.nombre)];
      for (const sub of subs) {
        const p = nuevoPersonaje(); p.raza = 'Humano'; p.clase = clase.nombre; p.subclase = sub;
        p.caracteristicas = { FUE: 14, DES: 14, CON: 14, INT: 14, SAB: 14, CAR: 14 };
        for (let nv = 1; nv <= 20; nv++) {
          p.nivel = nv;
          const n = numeros(p, clase);
          expect(malos(n), `${clase.nombre}/${sub} ${nv}`).toEqual([]);
          if (!sub) informe.push(`${clase.nombre} ${nv}: BC ${n.bc} maná ${n.mana} CA ${n.CA} vel+${n.vel} ini ${n.ini} ${Object.entries(n).filter(([k]) => k.startsWith('rec:')).map(([k, v]) => `${k.slice(4)} ${v}`).join(' ')} salv ${ATRIBUTOS.map((a) => n[`salv${a}`]).join('/')}${n.cd ? ` CD ${n.cd}` : ''}`);
        }
      }
    }
    writeFileSync('/tmp/claude-0/sim_clases.txt', informe.join('\n'));
  });

  it('rasgos de clase y dotes que se suman solos', () => {
    const p = nuevoPersonaje(); p.caracteristicas = { FUE: 18, DES: 14, CON: 16, INT: 10, SAB: 14, CAR: 12 };
    p.clase = 'Bárbaro'; p.nivel = 20;
    expect(car(p, 'FUE')).toBe(22); expect(car(p, 'CON')).toBe(20);
    expect(bonoVelocidad(p)).toBe(10);
    expect(avisosTirada(p, 'salvacion', 'DES').join()).toMatch(/Sentido del peligro/);
    expect(avisosIniciativa(p).join()).toMatch(/Instinto salvaje/);
    p.caracteristicas.FUE = 24; expect(car(p, 'FUE')).toBe(25);

    p.clase = 'Monje'; p.nivel = 10; expect(bonoVelocidad(p)).toBe(20);
    p.nivel = 20; expect(car(p, 'DES')).toBe(18); expect(car(p, 'SAB')).toBe(18);

    p.clase = 'Pícaro'; p.nivel = 15; expect(valorSalvacion(p, 'SAB')).toBe(modi(14) + 5);
    p.clase = 'Paladín'; p.nivel = 6; expect(valorSalvacion(p, 'FUE')).toBe(7 + 1); // FUE 24 → +7, aura CAR +1
    p.clase = 'Bardo'; p.nivel = 5; expect(valorHabilidad(p, 'historia')).toBe(0 + 1); // INT 10, ½ BC 3
    p.clase = 'Explorador'; p.nivel = 6; p.velocidad.andando = 30;
    expect(velocidadRasgo(p, 'trepar')!.pies).toBe(40);

    p.clase = 'Guerrero'; p.nivel = 8; p.dotes = [{ nombre: 'Alerta', descripcion: '' }, { nombre: 'Duro', descripcion: '' }, { nombre: 'Veloz', descripcion: '' }] as unknown as Personaje['dotes'];
    expect(iniciativa(p)).toBe(2 + 3);
    expect(pgExtra(p)[0].valor).toBe(16);
    expect(bonoVelocidad(p)).toBe(10);

    p.clase = 'Hechicero'; p.subclase = 'Hechicería dracónica'; p.nivel = 5; p.dotes = [];
    expect(pgExtra(p)).toEqual([{ texto: 'Resistencia dracónica', valor: 5 }]);
    expect(calcularCA(p).total).toBe(10 + 2 + 1);
  });
});
const modi = (v: number) => Math.floor((v - 10) / 2);
