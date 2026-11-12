import { useState } from 'react';
import { useFicha } from './Ficha';
import { Etiqueta, Modal, Seccion, Texto } from '../ui';
import { L } from '../i18n';
import { td } from '../datosRu';
import { buscarClase, buscarRaza } from '../avisos';
import { uid } from '../rules';
import { TIPOS_COMP, claveComp, competenciasAuto, textoAntiguoClase, type TipoComp } from '../competencias';
import { eleccionesDe, faltan } from '../elecciones';

type Editando = { tipo: TipoComp; nombre: string; idPropia?: string; claveAuto?: string; origen?: string };

/** Competencias con armas, armaduras y herramientas: salen solas de la clase, la multiclase, las elecciones y las dotes;
 *  se pueden quitar, cambiar o añadir a mano. */
export function Competencias() {
  const { p, upd, clases, razas } = useFicha();
  const [editar, setEditar] = useState<Editando | null>(null);
  const ocultas = new Set(p.compOcultas ?? []);
  const auto = competenciasAuto(p);
  const propias = p.compPropias ?? [];
  const nOcultas = auto.filter((a) => ocultas.has(a.clave)).length;
  const clase = buscarClase(clases, p.clase);
  const viejo = p.competencias?.trim() && (!clase || p.competencias.trim() !== textoAntiguoClase(clase.atributos)) ? p.competencias : '';
  // Elecciones pendientes que dan competencias (instrumentos, herramientas, Orden divina…).
  const pendientes = eleccionesDe(p, clases, buscarRaza(razas, p.raza))
    .filter((e) => faltan(p, e) > 0 && /:(instrumentos|herramienta|orden)$|^dote:/.test(e.id));

  const guardar = (e: Editando) => upd((x) => {
    const nombre = e.nombre.trim();
    if (e.idPropia) {
      x.compPropias = (x.compPropias ?? []).map((c) => (c.id === e.idPropia ? { ...c, tipo: e.tipo, nombre } : c)).filter((c) => c.nombre);
      return;
    }
    if (e.claveAuto) {
      x.compOcultas = [...new Set([...(x.compOcultas ?? []), e.claveAuto])];
      const a = auto.find((y) => y.clave === e.claveAuto);
      // Si no la ha cambiado de verdad, no hace falta copia.
      if (a && claveComp(e.tipo, nombre) === a.clave) { x.compOcultas = x.compOcultas.filter((k) => k !== e.claveAuto); return; }
    }
    if (nombre) x.compPropias = [...(x.compPropias ?? []), { id: uid(), tipo: e.tipo, nombre }];
  });
  const quitar = (e: Editando) => upd((x) => {
    if (e.idPropia) x.compPropias = (x.compPropias ?? []).filter((c) => c.id !== e.idPropia);
    else if (e.claveAuto) x.compOcultas = [...new Set([...(x.compOcultas ?? []), e.claveAuto])];
  });

  return (
    <Seccion titulo="Competencias" aviso={pendientes.reduce((s, e) => s + faltan(p, e), 0)}>
      {TIPOS_COMP.map((t) => {
        const a = auto.filter((c) => c.tipo === t.id && !ocultas.has(c.clave));
        const pr = propias.filter((c) => c.tipo === t.id);
        if (t.id === 'otras' && !a.length && !pr.length) return null;
        return (
          <div key={t.id} className="comp-grupo">
            <h4>{t.icono} {L(t.es, t.ru)}</h4>
            <ul className="chips-comp">
              {a.map((c) => (
                <li key={c.clave}><button className="chip-comp" onClick={() => setEditar({ tipo: c.tipo, nombre: L(c.es, c.ru), claveAuto: c.clave, origen: c.origenes.join(', ') })}>
                  {L(c.es, c.ru)}<small>{c.origenes.join(', ')}</small>
                </button></li>
              ))}
              {pr.map((c) => (
                <li key={c.id}><button className="chip-comp propia" onClick={() => setEditar({ tipo: c.tipo, nombre: c.nombre, idPropia: c.id })}>{td(c.nombre)}<small>✎</small></button></li>
              ))}
              {!a.length && !pr.length && <li className="vacio-comp">{L('Ninguna', 'Нет')}</li>}
              <li><button className="chip-comp anadir" onClick={() => setEditar({ tipo: t.id, nombre: '' })} title={L('Añadir', 'Добавить')}>＋</button></li>
            </ul>
          </div>
        );
      })}
      {!clase && !propias.length && <p className="nota pequena">{L('Elige clase para que salgan solas.', 'Выбери класс — владения появятся сами.')}</p>}
      {pendientes.length > 0 && (
        <p className="aviso-eleccion">⚠ {L('Falta elegir', 'Нужно выбрать')}: {pendientes.map((e) => `${L(e.es, e.ru)} (${e.origen})`).join('; ')}. {L('Arriba, en «Por elegir».', 'Выше, в блоке «Нужно выбрать».')}</p>
      )}
      <div className="fila-botones-comp">
        {!propias.some((c) => c.tipo === 'otras') && !auto.some((c) => c.tipo === 'otras') && <button className="btn enlace pequeno" onClick={() => setEditar({ tipo: 'otras', nombre: '' })}>{L('＋ Otra competencia', '＋ Другое владение')}</button>}
        {nOcultas > 0 && <button className="btn enlace pequeno" onClick={() => upd((x) => { x.compOcultas = []; })}>{L(`Recuperar ${nOcultas} quitada${nOcultas > 1 ? 's' : ''}`, `Вернуть убранные (${nOcultas})`)}</button>}
      </div>
      {viejo && (
        <details className="comp-viejas">
          <summary>{L('Notas antiguas', 'Старые заметки')}</summary>
          <Texto multilinea filas={3} valor={p.competencias} set={(s) => upd((x) => { x.competencias = s; })} />
          <button className="btn enlace pequeno" onClick={() => upd((x) => { x.competencias = ''; })}>{L('Borrar notas', 'Удалить заметки')}</button>
        </details>
      )}
      {editar && <EditarCompetencia e={editar} onClose={() => setEditar(null)} guardar={(e) => { guardar(e); setEditar(null); }} quitar={() => { quitar(editar); setEditar(null); }} />}
    </Seccion>
  );
}

function EditarCompetencia({ e, onClose, guardar, quitar }: { e: Editando; onClose: () => void; guardar: (e: Editando) => void; quitar: () => void }) {
  const [x, setX] = useState(e);
  const nueva = !e.idPropia && !e.claveAuto;
  return (
    <Modal titulo={nueva ? L('Nueva competencia', 'Новое владение') : L('Competencia', 'Владение')} onClose={onClose}
      pie={<>
        {!nueva && <button className="btn peligro-suave" onClick={quitar}>{L('Quitar', 'Убрать')}</button>}
        <button className="btn primario" disabled={!x.nombre.trim()} onClick={() => guardar(x)}>{L('Guardar', 'Сохранить')}</button>
      </>}>
      <Etiqueta texto="Nombre"><input className="campo" autoFocus={nueva} value={x.nombre} placeholder={L('p. ej. Herramientas de herrero', 'напр. Инструменты кузнеца')} onChange={(ev) => setX({ ...x, nombre: ev.target.value })} /></Etiqueta>
      <div className="opciones-chips">
        {TIPOS_COMP.map((t) => <button key={t.id} type="button" className={`opcion-eleccion ${x.tipo === t.id ? 'activo' : ''}`} onClick={() => setX({ ...x, tipo: t.id })}><strong>{t.icono} {L(t.es, t.ru)}</strong></button>)}
      </div>
      {e.origen && <p className="nota pequena">{L(`Viene de: ${e.origen}. Si la cambias, se guarda como tuya; si la quitas, puedes recuperarla luego.`, `Источник: ${e.origen}. Если изменишь — сохранится как своя; если уберёшь — можно вернуть.`)}</p>}
    </Modal>
  );
}
