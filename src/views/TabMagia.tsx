import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Check, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { useDatos, type Conjuro } from '../data';
import type { ConjuroPersonaje } from '../types';
import { useDados } from '../dice';
import { ataqueConjuros, cdConjuros, conSigno, dadosConjuro, multiplicadorTruco } from '../rules';

const NIVELES = ['Trucos', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9'];

export function TabMagia() {
  const { p, upd, avisos } = useFicha();
  const todos = useDatos<Conjuro[]>('spells');
  const [anadir, setAnadir] = useState<null | 'truco' | 'conjuro' | 'adicional'>(null);
  const [todasClases, setTodasClases] = useState(false);
  const [ver, setVer] = useState<{ c: ConjuroPersonaje; def?: Conjuro } | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; nivel: number; adicional: boolean; base?: Conjuro; descripcion: string } | null>(null);
  const [elegirBase, setElegirBase] = useState(false);
  const claseMin = p.clase.toLowerCase();
  const nTrucos = p.conjuros.filter((c) => c.nivel === 0 && !c.adicional).length;
  const nConj = p.conjuros.filter((c) => c.nivel > 0 && !c.adicional).length;
  const def = (n: string) => todos?.find((x) => x.nombre === n);

  const ListaConjuros = ({ lista, preparar }: { lista: { c: ConjuroPersonaje; idx: number }[]; preparar: boolean }) => (
    <ul className="lista-conjuros">
      {lista.map(({ c, idx }) => {
        const d = def(c.nombre);
        return (
          <li key={idx}>
            {preparar && <Check valor={!!c.preparado} set={(b) => upd((x) => { x.conjuros[idx].preparado = b; })} titulo="Preparado" />}
            <button className="conjuro-nombre" onClick={() => setVer({ c, def: d })}>
              <strong>{c.nombre}{c.adicional ? <small className="etq-nivel"> · {c.nivel ? `Nv ${c.nivel}` : 'Truco'}</small> : null}</strong>
              {c.base && <small>Propio, basado en {c.base}</small>}
              {d && <small>{d.escuela} · {d.tiempo} · {d.alcance}{/concentración/i.test(d.duracion) ? ' · Conc.' : ''}</small>}
            </button>
          </li>
        );
      })}
    </ul>
  );
  const conIdx = p.conjuros.map((c, idx) => ({ c, idx }));
  const porNivel = NIVELES.map((_, i) => conIdx.filter(({ c }) => c.nivel === i && !c.adicional));
  const adicionales = conIdx.filter(({ c }) => c.adicional).sort((a, b) => a.c.nivel - b.c.nivel);

  return (
    <div className="tab">
      <Seccion titulo="Trucos" aviso={avisos.trucos} extra={avisos.limiteTrucos !== null && <span className="contador-limite">{nTrucos}/{avisos.limiteTrucos}</span>}>
        <BotonAnadir aviso={avisos.trucos > 0} onClick={() => setAnadir('truco')}>Añadir truco</BotonAnadir>
        {porNivel[0].length > 0 && <ListaConjuros lista={porNivel[0]} preparar={false} />}
      </Seccion>
      <Seccion titulo="Conjuros" aviso={avisos.conjuros} extra={avisos.limiteConjuros !== null && <span className="contador-limite">{nConj}/{avisos.limiteConjuros}</span>}>
        <BotonAnadir aviso={avisos.conjuros > 0} onClick={() => setAnadir('conjuro')}>Añadir conjuro</BotonAnadir>
        {avisos.nivelMaxConjuro !== null && <p className="nota">Nivel máximo de conjuro: {avisos.nivelMaxConjuro}</p>}
        {porNivel.slice(1).map((lista, k) => lista.length > 0 && (
          <div key={k}>
            <h4 className="nivel-conjuro">{NIVELES[k + 1]}</h4>
            <ListaConjuros lista={lista} preparar />
          </div>
        ))}
        {nConj > 0 && <p className="nota pequena">● = preparado: los que tienes listos para lanzar hoy. Márcalos tras un descanso largo si tu clase prepara conjuros.</p>}
      </Seccion>
      <Seccion titulo="Conjuros adicionales">
        <p className="nota pequena">De tu raza, dotes, objetos o rasgos (p. ej. Taumaturgia de los Trols). No cuentan para el límite de tu clase.</p>
        <BotonAnadir onClick={() => setAnadir('adicional')}>Añadir conjuro adicional</BotonAnadir>
        {adicionales.length > 0 && <ListaConjuros lista={adicionales} preparar={false} />}
      </Seccion>
      {!p.clase && <p className="nota">Elige una clase en «Personaje» para ver cuántos trucos y conjuros te tocan.</p>}

      {p.conjuros.length === 0 && <p className="vacio">Aún no tienes conjuros.</p>}

      {anadir && (
        <Modal titulo={anadir === 'truco' ? 'Añadir truco' : anadir === 'adicional' ? 'Añadir conjuro adicional' : 'Añadir conjuro'} onClose={() => setAnadir(null)}>
          {claseMin && anadir !== 'adicional' && (
            <label className="interruptor"><input type="checkbox" checked={todasClases} onChange={(e) => setTodasClases(e.target.checked)} /> Mostrar {anadir === 'truco' ? 'trucos' : 'conjuros'} de todas las clases</label>
          )}
          {!todos ? <p>Cargando…</p> : (
            <Buscador<Conjuro>
              items={todos}
              texto={(c) => c.nombre}
              placeholder={anadir === 'truco' ? 'Escribe el nombre del truco…' : 'Escribe el nombre del conjuro…'}
              filtro={(c) => (anadir === 'adicional' || (anadir === 'truco' ? c.nivel === 0 : c.nivel > 0))
                && (anadir === 'adicional' || todasClases || !claseMin || c.clases.includes(claseMin))
                && !p.conjuros.some((x) => x.nombre === c.nombre)}
              render={(c) => <span className="res-conjuro"><strong>{c.nombre}</strong><small>{c.nivel ? `Nivel ${c.nivel}` : 'Truco'} · {c.escuela} · {c.clases.join(', ')}</small></span>}
              onElegir={(c) => {
                if (typeof c === 'string') { setNuevo({ nombre: c, nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '' }); setAnadir(null); return; }
                upd((x) => { x.conjuros.push({ nombre: c.nombre, nivel: c.nivel, ...(anadir === 'adicional' ? { adicional: true } : {}) }); });
                setAnadir(null);
              }}
            />
          )}
          <button className="btn crear-propio" onClick={() => { setNuevo({ nombre: '', nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '' }); setAnadir(null); }}>✏️ Crear conjuro propio (puede basarse en otro)</button>
          {anadir === 'conjuro' && avisos.limiteConjuros !== null && nConj >= avisos.limiteConjuros && <p className="nota">Ya tienes los {avisos.limiteConjuros} que marcan las reglas, pero puedes añadir más.</p>}
        </Modal>
      )}
      {nuevo && (
        <Modal titulo="Crear conjuro propio" onClose={() => setNuevo(null)}
          pie={<button className="btn primario" disabled={!nuevo.nombre.trim()} onClick={() => {
            upd((x) => { x.conjuros.push({ nombre: nuevo.nombre.trim(), nivel: nuevo.nivel, ...(nuevo.adicional ? { adicional: true } : {}), ...(nuevo.base ? { base: nuevo.base.nombre } : {}), descripcion: nuevo.descripcion }); });
            setNuevo(null);
          }}>Guardar conjuro</button>}>
          <label className="etiqueta"><span>Nombre de tu conjuro</span>
            <input className="campo" value={nuevo.nombre} placeholder="p. ej. Bola de hielo de Wishik" onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </label>
          <label className="etiqueta"><span>Basado en (opcional)</span>
            <button type="button" className="campo boton-exp" onClick={() => setElegirBase(true)}>{nuevo.base ? nuevo.base.nombre : 'Elegir un conjuro base…'}</button>
          </label>
          <label className="etiqueta"><span>Nivel</span>
            <select className="campo" value={nuevo.nivel} onChange={(e) => setNuevo({ ...nuevo, nivel: +e.target.value })}>{NIVELES.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
          </label>
          <label className="etiqueta"><span>Descripción{nuevo.base ? ` (copiada de ${nuevo.base.nombre}: cámbiala como quieras)` : ''}</span>
            <Texto multilinea filas={10} valor={nuevo.descripcion} set={(v) => setNuevo((n) => n && { ...n, descripcion: v })} placeholder="Qué hace, daño, alcance, duración…" />
          </label>
          {elegirBase && todos && (
            <Modal titulo="Conjuro base" onClose={() => setElegirBase(false)}>
              <Buscador<Conjuro> items={todos} texto={(c) => c.nombre} placeholder="Busca el conjuro base…"
                render={(c) => <span className="res-conjuro"><strong>{c.nombre}</strong><small>{c.nivel ? `Nivel ${c.nivel}` : 'Truco'} · {c.escuela}</small></span>}
                onElegir={(c) => {
                  if (typeof c !== 'string') setNuevo((n) => n && { ...n, base: c, nivel: c.nivel, descripcion: `${c.tiempo} · ${c.alcance} · ${c.componentes} · ${c.duracion}\n\n${c.descripcion}` });
                  setElegirBase(false);
                }} />
            </Modal>
          )}
        </Modal>
      )}
      {ver && (
        <Modal titulo={ver.c.nombre} onClose={() => setVer(null)}
          pie={<button className="btn peligro" onClick={() => { upd((x) => { const i = x.conjuros.findIndex((c) => c.nombre === ver.c.nombre && c.nivel === ver.c.nivel); if (i >= 0) x.conjuros.splice(i, 1); }); setVer(null); }}>Quitar de la lista</button>}>
          {(() => {
            const mio = p.conjuros.find((c) => c.nombre === ver.c.nombre);
            if (mio && mio.descripcion !== undefined) return <>
              <Lanzar texto={mio.descripcion} nivel={mio.nivel} nombre={mio.nombre} />
              <p className="subtitulo">Conjuro propio{mio.base ? ` basado en ${mio.base}` : ''}</p>
              <label className="etiqueta"><span>Descripción (puedes cambiarla)</span>
                <Texto multilinea filas={8} valor={mio.descripcion} set={(v) => upd((x) => { const c = x.conjuros.find((c) => c.nombre === ver.c.nombre); if (c) c.descripcion = v; })} />
              </label>
            </>;
            return <>
              <Lanzar texto={ver.def?.descripcion ?? ''} nivel={ver.c.nivel} nombre={ver.c.nombre} />
              {ver.def ? <FichaConjuro c={ver.def} /> : <p className="nota">Conjuro personalizado (no está en la base).</p>}
            </>;
          })()}
          <label className="etiqueta"><span>Mis notas</span>
            <Texto multilinea filas={3} valor={p.conjuros.find((c) => c.nombre === ver.c.nombre)?.notas ?? ''} set={(v) => upd((x) => { const c = x.conjuros.find((c) => c.nombre === ver.c.nombre); if (c) c.notas = v; })} />
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

/** Botones para usar el conjuro: tirada de ataque, CD de la salvación y dados de daño/curación (con la mejora por nivel). */
function Lanzar({ texto, nivel, nombre }: { texto: string; nivel: number; nombre: string }) {
  const { p, avisos } = useFicha();
  const { tirar, tirarD20 } = useDados();
  const at = ataqueConjuros(p), cd = cdConjuros(p);
  const maxEsp = Math.max(nivel, Math.min(9, avisos.nivelMaxConjuro ?? 9));
  const [espacio, setEspacio] = useState(nivel);
  const pideAtaque = /tirada de ataque|ataque de conjuro/i.test(texto);
  const pideSalvacion = /tirada de salvaci[oó]n/i.test(texto);
  const sube = nivel > 0 && /aumenta en \d+d\d+ por cada nivel por encima/i.test(texto);
  const dados = dadosConjuro(texto, nivel, p.nivel, espacio);
  const mejoraTruco = nivel === 0 && /mejora de truco/i.test(texto) && multiplicadorTruco(p.nivel) > 1;
  if (at === null && dados.length === 0) {
    return <p className="nota">Para lanzar con ataque, elige la «Característica de conjuros» en la pestaña Combate.</p>;
  }
  return (
    <div className="lanzar">
      {sube && (
        <label className="etiqueta espacio-conjuro"><span>Espacio de conjuro</span>
          <select className="campo" value={espacio} onChange={(e) => setEspacio(+e.target.value)}>
            {Array.from({ length: maxEsp - nivel + 1 }, (_, k) => nivel + k).map((n) => <option key={n} value={n}>Nivel {n}{n === nivel ? ' (base)' : ''}</option>)}
          </select>
        </label>
      )}
      {at !== null && (pideAtaque || !pideSalvacion) && <button className="btn primario" onClick={() => tirarD20(`Ataque: ${nombre}`, at)}>🎲 Ataque {conSigno(at)}</button>}
      {cd !== null && pideSalvacion && <span className="cd-chip">El objetivo salva contra CD <strong>{cd}</strong></span>}
      {dados.map((d) => <button key={d} className="btn" onClick={() => tirar(`${nombre} (${d})`, d)}>🎲 {d}</button>)}
      {mejoraTruco && <p className="nota pequena">Daño mejorado por tu nivel {p.nivel} (trucos: ×2 a nivel 5, ×3 a nivel 11, ×4 a nivel 17).</p>}
      {at === null && (pideAtaque || pideSalvacion) && <p className="nota">Elige la «Característica de conjuros» en Combate para ver tu ataque y CD.</p>}
    </div>
  );
}
