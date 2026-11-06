import { useFicha } from './Ficha';
import { BotonAnadir, Etiqueta, Numero, Seccion, Texto } from '../ui';
import { useDados } from '../dice';
import { ataqueConjuros, cdConjuros, conSigno, parseFormula } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo } from '../types';

export function TabCombate() {
  const { p, upd } = useFicha();
  const { tirar, tirarD20 } = useDados();
  const cd = cdConjuros(p), at = ataqueConjuros(p);
  const armas = [p.equipo.manoHabil, p.equipo.manoTorpe].filter(Boolean);
  return (
    <div className="tab">
      <Seccion titulo="Ataques">
        <div className="fila-2">
          <Etiqueta texto="Ataques por turno · mano hábil"><Numero valor={p.ataquesTurno.habil} min={0} set={(n) => upd((x) => { x.ataquesTurno.habil = n; })} /></Etiqueta>
          <Etiqueta texto="Mano torpe"><Numero valor={p.ataquesTurno.torpe} min={0} set={(n) => upd((x) => { x.ataquesTurno.torpe = n; })} /></Etiqueta>
        </div>
        <ul className="lista-ataques">
          {p.ataques.map((a, i) => {
            const bon = parseInt(a.ataque.replace(/\s/g, ''), 10);
            const danoOk = !!parseFormula(a.dano);
            return (
              <li key={i} className="ataque">
                <Texto valor={a.nombre} set={(s) => upd((x) => { x.ataques[i].nombre = s; })} placeholder="Nombre (p. ej. Espada corta c/c)" />
                <div className="ataque-fila">
                  <label>Ataque<span className="con-mas"><span>+</span><input className="campo" inputMode="numeric" value={isNaN(bon) ? '' : String(Math.abs(bon))} placeholder="0"
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); upd((x) => { x.ataques[i].ataque = v ? `+${v}` : ''; }); }} /></span></label>
                  <button className="btn" disabled={isNaN(bon)} onClick={() => tirarD20(`Ataque: ${a.nombre || 'arma'}`, bon)}>🎲 d20</button>
                </div>
                <div className="ataque-fila">
                  <label>Daño<SelectorDano valor={a.dano} set={(v) => upd((x) => { x.ataques[i].dano = v; })} /></label>
                  <button className="btn" disabled={!danoOk} onClick={() => tirar(`Daño: ${a.nombre || 'arma'}`, a.dano)}>🎲 Daño</button>
                </div>
                <div className="ataque-fila derecha">
                  <button className="btn icono peligro-suave" title="Quitar" onClick={() => upd((x) => { x.ataques.splice(i, 1); })}>✕ Quitar</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="fila-botones">
          <BotonAnadir onClick={() => upd((x) => { x.ataques.push({ nombre: '', ataque: '', dano: '1d6' }); })}>Añadir ataque</BotonAnadir>
          {armas.map((it) => it && !p.ataques.some((a) => a.nombre === it.nombre) && (
            <button key={it.id} className="btn" onClick={() => upd((x) => { x.ataques.push({ nombre: it.nombre, ataque: '', dano: (it.detalles?.['Daño'] ?? '').match(/^\d*d\d+/)?.[0] ?? '' }); })}>+ {it.nombre}</button>
          ))}
        </div>
        <p className="nota">Pon tu bonificador de ataque y elige el dado de daño con su bonificador (p. ej. +5 y 1d6 +3), como en el cuaderno.</p>
      </Seccion>

      <Seccion titulo="Conjuros">
        <Etiqueta texto="Característica de conjuros">
          <select className="campo" value={p.conjuroCaracteristica} onChange={(e) => upd((x) => { x.conjuroCaracteristica = e.target.value as Atributo | ''; })}>
            <option value="">— Ninguna —</option>
            {ATRIBUTOS.map((a) => <option key={a} value={a}>{NOMBRE_ATRIBUTO[a]}</option>)}
          </select>
        </Etiqueta>
        <div className="fila-2">
          <Etiqueta texto="Conjuros por turno · estándar"><Texto valor={p.conjurosTurno.estandar} set={(s) => upd((x) => { x.conjurosTurno.estandar = s; })} /></Etiqueta>
          <Etiqueta texto="Adicional"><Texto valor={p.conjurosTurno.adicional} set={(s) => upd((x) => { x.conjurosTurno.adicional = s; })} /></Etiqueta>
        </div>
        <div className="fila-2 valores-conjuro">
          <div><small>CD de conjuros</small><strong>{cd ?? '—'}</strong></div>
          <div><small>Ataque de conjuro</small>{at !== null ? <button className="lt-valor" onClick={() => tirarD20('Ataque de conjuro', at)}>{conSigno(at)}</button> : <strong>—</strong>}</div>
        </div>
      </Seccion>
    </div>
  );
}

const CARAS = [4, 6, 8, 10, 12, 20];
/** Daño como «NdX + B»: número de dados, tipo de dado y un + fijo con el bonificador. */
function SelectorDano({ valor, set }: { valor: string; set: (v: string) => void }) {
  const m = valor.replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/);
  if (valor && !m) {
    return (
      <span className="selector-dano libre">
        <input className="campo" value={valor} onChange={(e) => set(e.target.value)} />
        <button type="button" className="btn pequeno" onClick={() => set('1d6')}>Usar selector</button>
      </span>
    );
  }
  const n = m ? parseInt(m[1] || '1', 10) : 1;
  const caras = m ? parseInt(m[2], 10) : 6;
  const bono = m && m[4] ? (m[3] === '-' ? -1 : 1) * parseInt(m[4], 10) : 0;
  const armar = (nn: number, cc: number, bb: number) => set(`${nn}d${cc}${bb ? (bb > 0 ? `+${bb}` : `${bb}`) : ''}`);
  return (
    <span className="selector-dano">
      <select className="campo" value={n} onChange={(e) => armar(+e.target.value, caras, bono)}>{Array.from({ length: 12 }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}</select>
      <select className="campo" value={caras} onChange={(e) => armar(n, +e.target.value, bono)}>{CARAS.map((c) => <option key={c} value={c}>d{c}</option>)}</select>
      <span className="mas-fijo">+</span>
      <input className="campo" inputMode="numeric" value={bono ? String(bono) : ''} placeholder="0"
        onChange={(e) => { const t = e.target.value.replace(/[^\d-]/g, ''); const b = parseInt(t, 10); armar(n, caras, isNaN(b) ? 0 : b); }} />
    </span>
  );
}
