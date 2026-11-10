import { useState } from 'react';
import type { Atributo, EfectoCar, Personaje } from './types';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from './types';
import { conSigno } from './rules';
import { L, T, RU_NOMBRE_ATRIBUTO, RU_ATRIBUTOS } from './i18n';
import { Numero } from './ui';

const nombre = (a: Atributo) => T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a]);

/** Lista de efectos temporales sobre las características (lo ve el jugador; el máster puede quitarlos). */
export function ListaEfectosCar({ efectos, quitar }: { efectos: EfectoCar[] | undefined; quitar?: (id: string) => void }) {
  if (!efectos?.length) return null;
  return (
    <ul className="efectos-car">
      {efectos.map((e) => (
        <li key={e.id} className={e.valor < 0 ? 'debuff' : 'buff'}>
          <span className="ef-valor">{e.valor < 0 ? '⬇' : '⬆'} {nombre(e.atributo)} {conSigno(e.valor)}</span>
          {e.nota && <span className="ef-nota">💡 {e.nota}</span>}
          {quitar && <button type="button" className="quitar-recurso" title={L('Quitar', 'Убрать')} onClick={() => quitar(e.id)}>✕</button>}
        </li>
      ))}
    </ul>
  );
}

/** Chips cortos para la franja de arriba de la hoja. */
export const chipsEfectosCar = (p: Personaje) => (p.efectosCar ?? []).map((e) => (
  <span key={e.id} className={`chip-estado ${e.valor < 0 ? 'debuff' : 'buff'}`} title={e.nota}>{e.valor < 0 ? '⬇' : '⬆'} {T(RU_ATRIBUTOS, e.atributo)} {conSigno(e.valor)}</span>
));

/** Formulario del máster para poner un efecto temporal. */
export function NuevoEfectoCar({ onAnadir }: { onAnadir: (e: EfectoCar) => void }) {
  const [atributo, setAtributo] = useState<Atributo>('FUE');
  const [valor, setValor] = useState(-2);
  const [nota, setNota] = useState('');
  return (
    <div className="form-efecto">
      <select className="campo" value={atributo} onChange={(e) => setAtributo(e.target.value as Atributo)}>
        {ATRIBUTOS.map((a) => <option key={a} value={a}>{nombre(a)}</option>)}
      </select>
      <Numero valor={valor} min={-20} max={20} set={setValor} ancho={70} />
      <input className="campo" value={nota} onChange={(e) => setNota(e.target.value)} placeholder={L('Cómo se quita (ej.: con un descanso largo)', 'Как снять (напр.: долгим отдыхом)')} />
      <button type="button" className="btn primario" disabled={!valor} onClick={() => { onAnadir({ id: `ef-${Date.now()}`, atributo, valor, nota: nota.trim() }); setNota(''); }}>{L('Aplicar', 'Применить')}</button>
    </div>
  );
}
