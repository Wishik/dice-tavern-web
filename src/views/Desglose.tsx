import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Modal, Numero } from '../ui';
import { conSigno, uid, type LineaDesglose } from '../rules';
import type { Personaje } from '../types';
import { L } from '../i18n';

/** Cada número con su origen (los puestos a mano, en cursiva). */
export function ListaDesglose({ lineas }: { lineas: LineaDesglose[] }) {
  return (
    <ul className="lista-desglose">
      {lineas.map((x, i) => <li key={i} className={x.id ? 'propio' : ''}><span>{x.texto}{x.nota ? <small> · {x.nota}</small> : null}</span><strong>{x.base ? x.valor : conSigno(x.valor)}</strong></li>)}
    </ul>
  );
}

/** Desglose de un número (CA, característica, habilidad, salvación) con bonus a mano.
 *  Se edita un borrador: solo «Guardar» lo guarda; cerrar (✕, fuera o Esc) lo descarta. */
export function ModalDesglose({ donde, titulo, calcular, onClose, nota, conSignoTotal }: {
  donde: string; titulo: string; onClose: () => void; nota?: string; conSignoTotal?: boolean;
  calcular: (p: Personaje) => { lineas: LineaDesglose[]; total: number };
}) {
  const { p, upd } = useFicha();
  const [borr, setBorr] = useState(() => (p.bonosExtra ?? []).filter((b) => b.donde === donde).map((b) => ({ ...b })));
  const prev = { ...p, bonosExtra: [...(p.bonosExtra ?? []).filter((b) => b.donde !== donde), ...borr] };
  const { lineas, total } = calcular(prev);
  const cambiar = (id: string, c: Partial<{ origen: string; valor: number }>) => setBorr((l) => l.map((b) => (b.id === id ? { ...b, ...c } : b)));
  const guardar = () => {
    upd((x) => { x.bonosExtra = [...(x.bonosExtra ?? []).filter((b) => b.donde !== donde), ...borr.filter((b) => b.valor !== 0 || b.origen.trim()).map((b) => ({ ...b, origen: b.origen.trim() || L('Bonus', 'Бонус') }))]; });
    onClose();
  };
  return (
    <Modal titulo={`${titulo}: ${conSignoTotal ? conSigno(total) : total}`} onClose={onClose}
      pie={<><button className="btn" onClick={onClose}>{L('Cancelar', 'Отмена')}</button><button className="btn primario" onClick={guardar}>{L('Guardar', 'Сохранить')}</button></>}>
      <h4>{L('De dónde sale', 'Из чего складывается')}</h4>
      <ListaDesglose lineas={lineas.filter((x) => !x.id)} />
      {nota && <p className="nota pequena">{nota}</p>}
      <h4>{L('Bonus a mano', 'Свои бонусы')}</h4>
      {borr.length === 0 && <p className="nota pequena">{L('Ninguno. Añade, por ejemplo, un objeto mágico o una bendición.', 'Пока нет. Например, магический предмет или благословение.')}</p>}
      <ul className="bonos-propios">
        {borr.map((b) => (
          <li key={b.id}>
            <input className="campo" value={b.origen} placeholder={L('¿De dónde sale?', 'Откуда?')} onChange={(e) => cambiar(b.id, { origen: e.target.value })} />
            <Numero valor={b.valor} min={-30} max={30} ancho={64} set={(n) => cambiar(b.id, { valor: n })} />
            <button className="btn icono" title={L('Quitar', 'Убрать')} onClick={() => setBorr((l) => l.filter((y) => y.id !== b.id))}>✕</button>
          </li>
        ))}
      </ul>
      <BotonAnadir onClick={() => setBorr((l) => [...l, { id: uid(), donde, valor: 1, origen: '' }])}>{L('Añadir bonus', 'Добавить бонус')}</BotonAnadir>
      <p className="nota pequena">{L('Los cambios se guardan al pulsar «Guardar».', 'Изменения сохраняются кнопкой «Сохранить».')}</p>
    </Modal>
  );
}
