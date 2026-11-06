import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Check, Modal, PuntoRojo, Seccion, TextoLargo } from '../ui';
import { useDatos, type Conjuro } from '../data';
import type { ConjuroPersonaje } from '../types';

const NIVELES = ['Trucos', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9'];

export function TabMagia() {
  const { p, upd, avisos } = useFicha();
  const todos = useDatos<Conjuro[]>('spells');
  const [anadir, setAnadir] = useState<null | 'truco' | 'conjuro'>(null);
  const [todasClases, setTodasClases] = useState(false);
  const [ver, setVer] = useState<{ c: ConjuroPersonaje; def?: Conjuro } | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; nivel: number } | null>(null);
  const claseMin = p.clase.toLowerCase();
  const nTrucos = p.conjuros.filter((c) => c.nivel === 0).length;
  const nConj = p.conjuros.filter((c) => c.nivel > 0).length;
  const def = (n: string) => todos?.find((x) => x.nombre === n);

  const porNivel = NIVELES.map((_, i) => p.conjuros.map((c, idx) => ({ c, idx })).filter(({ c }) => c.nivel === i));

  return (
    <div className="tab">
      <div className="fila-2-tarjetas">
        <Seccion titulo="Trucos" aviso={avisos.trucos} extra={avisos.limiteTrucos !== null && <span className="contador-limite">{nTrucos}/{avisos.limiteTrucos}</span>}>
          <BotonAnadir aviso={avisos.trucos > 0} onClick={() => setAnadir('truco')}>Añadir truco</BotonAnadir>
        </Seccion>
        <Seccion titulo="Conjuros conocidos" aviso={avisos.conjuros} extra={avisos.limiteConjuros !== null && <span className="contador-limite">{nConj}/{avisos.limiteConjuros}</span>}>
          <BotonAnadir aviso={avisos.conjuros > 0} onClick={() => setAnadir('conjuro')}>Añadir conjuro</BotonAnadir>
          {avisos.nivelMaxConjuro !== null && <p className="nota">Nivel máximo de conjuro: {avisos.nivelMaxConjuro}</p>}
        </Seccion>
      </div>
      {!p.clase && <p className="nota">Elige una clase en «Personaje» para ver cuántos trucos y conjuros te tocan.</p>}

      {porNivel.map((lista, i) => lista.length > 0 && (
        <Seccion key={i} titulo={NIVELES[i]}>
          <ul className="lista-conjuros">
            {lista.map(({ c, idx }) => {
              const d = def(c.nombre);
              return (
                <li key={idx}>
                  {i > 0 && <Check valor={!!c.preparado} set={(b) => upd((x) => { x.conjuros[idx].preparado = b; })} titulo="Preparado" />}
                  <button className="conjuro-nombre" onClick={() => setVer({ c, def: d })}>
                    <strong>{c.nombre}</strong>
                    {d && <small>{d.escuela} · {d.tiempo} · {d.alcance}{/concentración/i.test(d.duracion) ? ' · Conc.' : ''}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Seccion>
      ))}
      {p.conjuros.length === 0 && <p className="vacio">Aún no tienes conjuros.</p>}

      {anadir && (
        <Modal titulo={anadir === 'truco' ? 'Añadir truco' : 'Añadir conjuro'} onClose={() => setAnadir(null)}>
          {claseMin && (
            <label className="interruptor"><input type="checkbox" checked={todasClases} onChange={(e) => setTodasClases(e.target.checked)} /> Mostrar conjuros de todas las clases</label>
          )}
          {!todos ? <p>Cargando…</p> : (
            <Buscador<Conjuro>
              items={todos}
              texto={(c) => c.nombre}
              placeholder="Escribe el nombre del conjuro…"
              filtro={(c) => (anadir === 'truco' ? c.nivel === 0 : c.nivel > 0)
                && (todasClases || !claseMin || c.clases.includes(claseMin))
                && !p.conjuros.some((x) => x.nombre === c.nombre)}
              render={(c) => <span className="res-conjuro"><strong>{c.nombre}</strong><small>{c.nivel ? `Nivel ${c.nivel}` : 'Truco'} · {c.escuela} · {c.clases.join(', ')}</small></span>}
              onElegir={(c) => {
                if (typeof c === 'string') { setNuevo({ nombre: c, nivel: anadir === 'truco' ? 0 : 1 }); setAnadir(null); return; }
                upd((x) => { x.conjuros.push({ nombre: c.nombre, nivel: c.nivel }); });
                setAnadir(null);
              }}
            />
          )}
          {anadir === 'conjuro' && avisos.limiteConjuros !== null && nConj >= avisos.limiteConjuros && <p className="nota">Ya tienes los {avisos.limiteConjuros} que marcan las reglas, pero puedes añadir más.</p>}
        </Modal>
      )}
      {nuevo && (
        <Modal titulo={`Nuevo conjuro: ${nuevo.nombre}`} onClose={() => setNuevo(null)}
          pie={<button className="btn primario" onClick={() => { upd((x) => { x.conjuros.push({ nombre: nuevo.nombre, nivel: nuevo.nivel }); }); setNuevo(null); }}>Añadir</button>}>
          <label className="etiqueta"><span>Nivel</span>
            <select className="campo" value={nuevo.nivel} onChange={(e) => setNuevo({ ...nuevo, nivel: +e.target.value })}>{NIVELES.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
          </label>
        </Modal>
      )}
      {ver && (
        <Modal titulo={ver.c.nombre} onClose={() => setVer(null)}
          pie={<button className="btn peligro" onClick={() => { upd((x) => { const i = x.conjuros.findIndex((c) => c.nombre === ver.c.nombre && c.nivel === ver.c.nivel); if (i >= 0) x.conjuros.splice(i, 1); }); setVer(null); }}>Quitar de la lista</button>}>
          {ver.def ? <FichaConjuro c={ver.def} /> : <p className="nota">Conjuro personalizado (no está en la base).</p>}
          <label className="etiqueta"><span>Mis notas</span>
            <textarea className="campo" rows={3} defaultValue={ver.c.notas ?? ''} onChange={(e) => { const v = e.target.value; upd((x) => { const c = x.conjuros.find((c) => c.nombre === ver.c.nombre); if (c) c.notas = v; }); }} />
          </label>
        </Modal>
      )}
      {(avisos.trucos > 0 || avisos.conjuros > 0) && <p className="aviso-rojo"><PuntoRojo /> Según tu clase y nivel puedes aprender {[avisos.trucos && `${avisos.trucos} truco(s)`, avisos.conjuros && `${avisos.conjuros} conjuro(s)`].filter(Boolean).join(' y ')} más.</p>}
    </div>
  );
}

export function FichaConjuro({ c }: { c: Conjuro }) {
  return (
    <>
      <p className="subtitulo">{c.nivel ? `${c.escuela[0].toUpperCase() + c.escuela.slice(1)} de nivel ${c.nivel}` : `Truco de ${c.escuela}`} ({c.clases.join(', ')})</p>
      <dl className="lista-datos">
        <dt>Tiempo de lanzamiento</dt><dd>{c.tiempo}</dd><dt>Alcance</dt><dd>{c.alcance}</dd>
        <dt>Componentes</dt><dd>{c.componentes}</dd><dt>Duración</dt><dd>{c.duracion}</dd>
      </dl>
      <TextoLargo texto={c.descripcion} />
    </>
  );
}
