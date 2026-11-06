import { useFicha } from './Ficha';
import { BotonAnadir, Etiqueta, Numero, Seccion, Texto } from '../ui';
import { useDados } from '../dice';
import { CARACTERISTICA_CONJUROS, MAX_MUNICION, ataqueConjuros, avisosTirada, bonoArma, cdConjuros, conSigno, parseFormula, usaMunicion } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo, type Item, type Personaje } from '../types';

type ArmaLlevada = { it: Item; donde: string; ref: (x: Personaje) => Item | null | undefined };
/** Armas que llevas en las manos o en el cinturón: salen solas en Combate. */
function armasLlevadas(p: Personaje): ArmaLlevada[] {
  const out: ArmaLlevada[] = [];
  if (p.equipo.manoHabil?.tipo === 'arma') out.push({ it: p.equipo.manoHabil, donde: 'Mano hábil', ref: (x) => x.equipo.manoHabil });
  if (p.equipo.manoTorpe?.tipo === 'arma') out.push({ it: p.equipo.manoTorpe, donde: 'Mano torpe', ref: (x) => x.equipo.manoTorpe });
  p.cinturon.items.forEach((it) => { if (it.tipo === 'arma') out.push({ it, donde: 'Cinturón', ref: (x) => x.cinturon.items.find((y) => y.id === it.id) }); });
  return out;
}

export function TabCombate() {
  const { p, upd } = useFicha();
  const { tirar, tirarD20 } = useDados();
  const cd = cdConjuros(p), at = ataqueConjuros(p);
  const llevadas = armasLlevadas(p);
  const auto = CARACTERISTICA_CONJUROS[p.clase];
  return (
    <div className="tab">
      <Seccion titulo="Ataques por turno">
        <div className="fila-2 alineada">
          <Etiqueta texto="Mano hábil"><Numero valor={p.ataquesTurno.habil} min={0} set={(n) => upd((x) => { x.ataquesTurno.habil = n; })} /></Etiqueta>
          <Etiqueta texto="Mano torpe"><Numero valor={p.ataquesTurno.torpe} min={0} set={(n) => upd((x) => { x.ataquesTurno.torpe = n; })} /></Etiqueta>
        </div>
      </Seccion>

      <Seccion titulo="Armas que llevas">
        {llevadas.length === 0 && <p className="nota">Equipa un arma en la mano hábil o torpe, o ponla en el cinturón (Inventario), y aparecerá aquí con su ataque y daño.</p>}
        <ul className="lista-ataques">
          {llevadas.map(({ it, donde, ref }) => {
            const { ataque, mod, atr } = bonoArma(p, it);
            const danoTxt = it.detalles?.['Daño'] ?? '';
            const dado = danoTxt.match(/^\s*(\d+d\d+|\d+)/i)?.[1] ?? '';
            const tipo = danoTxt.replace(/^\s*(\d+d\d+|\d+)\s*/i, '');
            const versatil = (it.detalles?.['Propiedades'] ?? '').match(/vers[aá]til\s*\((\d+d\d+)\)/i)?.[1];
            const formula = (d: string) => /d/.test(d) ? `${d}${mod ? conSigno(mod) : ''}` : `${Math.max(1, parseInt(d, 10) + mod)}`;
            const municion = usaMunicion(it);
            const sinMunicion = municion && !(it.municion ?? 0);
            return (
              <li key={it.id} className="ataque auto">
                <div className="ataque-titulo"><strong>{it.nombre}</strong><small>{donde}{tipo ? ` · ${tipo}` : ''}</small></div>
                <div className="ataque-fila">
                  <button className="btn primario" disabled={sinMunicion} onClick={() => {
                    if (municion) upd((x) => { const y = ref(x); if (y) y.municion = Math.max(0, (y.municion ?? 0) - 1); });
                    tirarD20(`Ataque: ${it.nombre}`, ataque, avisosTirada(p, 'ataque', atr));
                  }}>🎲 Ataque {conSigno(ataque)}</button>
                  {dado && <button className="btn" onClick={() => tirar(`Daño: ${it.nombre}`, formula(dado))}>🎲 {formula(dado)}</button>}
                  {versatil && <button className="btn" onClick={() => tirar(`Daño a dos manos: ${it.nombre}`, formula(versatil))}>🎲 A dos manos {formula(versatil)}</button>}
                </div>
                {municion && (
                  <div className="ataque-fila">
                    <span className={sinMunicion ? 'error' : 'nota'}>🏹 Munición: {it.municion ?? 0}/{MAX_MUNICION}{sinMunicion ? ' · ¡sin munición!' : ''}</span>
                    <button className="btn pequeno" onClick={() => upd((x) => { const y = ref(x); if (y) y.municion = MAX_MUNICION; })}>Llenar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {llevadas.length > 0 && <p className="nota pequena">Ataque = competencia + FUE (DES si es a distancia; la mejor si es sutil). Daño = dado del arma + el mismo modificador. Cada ataque con arco o ballesta gasta 1 de munición.</p>}
      </Seccion>

      <Seccion titulo="Otros ataques">
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
                  <button className="btn" disabled={isNaN(bon)} onClick={() => tirarD20(`Ataque: ${a.nombre || 'arma'}`, bon, avisosTirada(p, 'ataque', null))}>🎲 d20</button>
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
        </div>
        <p className="nota">Para ataques que no son de un arma que llevas (mordisco, arma improvisada…): pon tu bonificador y el dado de daño.</p>
      </Seccion>

      <Seccion titulo="Conjuros">
        <Etiqueta texto="Característica de conjuros">
          <select className="campo" value={p.conjuroCaracteristica} onChange={(e) => upd((x) => { x.conjuroCaracteristica = e.target.value as Atributo | ''; })}>
            <option value="">{auto ? `Automática: ${NOMBRE_ATRIBUTO[auto]} (${p.clase})` : '— Ninguna —'}</option>
            {ATRIBUTOS.map((a) => <option key={a} value={a}>{NOMBRE_ATRIBUTO[a]}</option>)}
          </select>
        </Etiqueta>
        <h4 className="subtitulo-campos">Conjuros por turno</h4>
        <div className="fila-2 alineada">
          <Etiqueta texto="Estándar"><Texto valor={p.conjurosTurno.estandar} set={(s) => upd((x) => { x.conjurosTurno.estandar = s; })} /></Etiqueta>
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
