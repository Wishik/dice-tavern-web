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
                  <label>Ataque<input className="campo" value={a.ataque} placeholder="+5" onChange={(e) => upd((x) => { x.ataques[i].ataque = e.target.value; })} /></label>
                  <button className="btn" disabled={isNaN(bon)} onClick={() => tirarD20(`Ataque: ${a.nombre || 'arma'}`, bon)}>🎲 d20</button>
                  <label>Daño<input className="campo" value={a.dano} placeholder="1d6+3" onChange={(e) => upd((x) => { x.ataques[i].dano = e.target.value; })} /></label>
                  <button className="btn" disabled={!danoOk} onClick={() => tirar(`Daño: ${a.nombre || 'arma'}`, a.dano)}>🎲 Daño</button>
                  <button className="btn icono peligro-suave" title="Quitar" onClick={() => upd((x) => { x.ataques.splice(i, 1); })}>✕</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="fila-botones">
          <BotonAnadir onClick={() => upd((x) => { x.ataques.push({ nombre: '', ataque: '', dano: '' }); })}>Añadir ataque</BotonAnadir>
          {armas.map((it) => it && !p.ataques.some((a) => a.nombre === it.nombre) && (
            <button key={it.id} className="btn" onClick={() => upd((x) => { x.ataques.push({ nombre: it.nombre, ataque: '', dano: (it.detalles?.['Daño'] ?? '').match(/^\d*d\d+/)?.[0] ?? '' }); })}>+ {it.nombre}</button>
          ))}
        </div>
        <p className="nota">Escribe tu bonificador de ataque y el daño tú mismo (p. ej. «+5» y «1d6+3»): así sale igual que en el cuaderno.</p>
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
