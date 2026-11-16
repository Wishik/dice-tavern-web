import { useEffect, useState } from 'react';
import { Modal, Seccion, TextoLargo, ListaDatos } from '../ui';
import { L } from '../i18n';
import { td } from '../datosRu';
import { codificar, decodificar } from '../codigo';
import { guardarEnBiblioteca, quitarDeBiblioteca } from '../bibliotecaObjetos';
import { CATEGORIAS_ITEM, type Item } from '../types';
import { useAlijos } from './Alijos';
import { textoBonos } from './TabInventario';

const PREFIJO = 'DO';
const nombreCat = (t: Item['tipo']) => { const c = CATEGORIAS_ITEM.find((x) => x.id === (t === 'pocion' ? 'consumible' : t)); return c ? L(c.nombre, c.ru) : ''; };

/** Biblioteca de objetos de la partida: lo que crea cualquiera se guarda aquí; se exporta e importa con un código. */
export function SeccionBiblioteca() {
  const { partida, biblioteca, error } = useAlijos();
  const [viendo, setViendo] = useState<Item | null>(null);
  const [exportar, setExportar] = useState(false);
  const [importar, setImportar] = useState(false);
  const items = biblioteca?.items ?? [];
  return (
    <Seccion titulo={L('Biblioteca de objetos', 'Библиотека предметов')}>
      {!partida ? <p className="nota pequena">{L('La biblioteca es de la partida: entra con este personaje en una partida y los objetos que creéis se guardarán aquí.', 'Библиотека общая для партии: войди этим персонажем в партию, и созданные предметы будут сохраняться здесь.')}</p> : <>
        <p className="nota pequena">{L('Aquí se guardan los objetos que crea cualquiera de la partida. Salen primero (con 📚) al añadir un objeto. Con «Exportar» te llevas toda la biblioteca a otra partida.', 'Здесь хранятся предметы, созданные кем-либо в партии. Они идут первыми (с 📚) при добавлении предмета. «Экспорт» переносит всю библиотеку в другую партию.')}</p>
        {error && <p className="error">{error}</p>}
        {items.length === 0 ? <p className="vacio">{L('Aún no hay objetos creados.', 'Созданных предметов пока нет.')}</p> : (
          <ul className="lista-alijo">
            {items.map((it) => (
              <li key={it.id}><button className="item-boton" onClick={() => setViendo(it)}>📚 {td(it.nombre)} <small className="nota pequena">· {nombreCat(it.tipo)}{it.bonos?.length ? ` · ✨ ${textoBonos(it)}` : ''}</small></button></li>
            ))}
          </ul>
        )}
        <div className="fila-botones">
          <button className="btn" onClick={() => setImportar(true)}>📥 {L('Importar', 'Импорт')}</button>
          <button className="btn" disabled={!items.length} onClick={() => setExportar(true)}>📤 {L('Exportar todo', 'Экспорт всего')}</button>
        </div>
      </>}
      {viendo && partida && (
        <Modal titulo={td(viendo.nombre)} onClose={() => setViendo(null)}
          pie={<button className="btn peligro" onClick={async () => {
            if (!confirm(L(`¿Quitar «${viendo.nombre}» de la biblioteca? (No se lo quita a quien ya lo tenga.)`, `Убрать «${viendo.nombre}» из библиотеки? (У тех, у кого он уже есть, он останется.)`))) return;
            try { await quitarDeBiblioteca(partida, viendo.id); setViendo(null); } catch (e) { alert((e as Error).message); }
          }}>{L('Quitar de la biblioteca', 'Убрать из библиотеки')}</button>}>
          <p className="nota">{nombreCat(viendo.tipo)}{viendo.precio ? ` · ${viendo.precio}` : ''}{viendo.maxPorEspacio ? ` · ${L('máx.', 'макс.')} ${viendo.maxPorEspacio} ${L('por espacio', 'на ячейку')}` : ''}</p>
          {viendo.bonos?.length ? <p className="mejoras-item">✨ {textoBonos(viendo)}</p> : null}
          {viendo.detalles && <ListaDatos datos={viendo.detalles} />}
          {viendo.descripcion && <TextoLargo texto={viendo.descripcion} />}
        </Modal>
      )}
      {exportar && <ModalExportar items={items} onClose={() => setExportar(false)} />}
      {importar && partida && <ModalImportar partida={partida} onClose={() => setImportar(false)} />}
    </Seccion>
  );
}

function ModalExportar({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { codificar(items.map(({ id: _id, ...r }) => r), PREFIJO).then(setCodigo); }, [items]);
  const copiar = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true); } catch { /* sin permiso */ } };
  return (
    <Modal titulo={L(`Exportar ${items.length} objetos`, `Экспорт: ${items.length} предм.`)} onClose={onClose}
      pie={<button className="btn primario" disabled={!codigo} onClick={copiar}>{copiado ? '✓ ' + L('Copiado', 'Скопировано') : '📋 ' + L('Copiar código', 'Скопировать код')}</button>}>
      <p className="nota">{L('En la otra partida ve a Inventario → «Biblioteca de objetos» → «Importar» y pega este código.', 'В другой партии: Инвентарь → «Библиотека предметов» → «Импорт», вставь этот код.')}</p>
      <textarea className="campo codigo-criatura" readOnly value={codigo} rows={5} onFocus={(e) => e.target.select()} />
    </Modal>
  );
}

function ModalImportar({ partida, onClose }: { partida: string; onClose: () => void }) {
  const [texto, setTexto] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const leer = (t: string) => {
    setTexto(t); setItems(null); setError('');
    if (!t.trim()) return;
    decodificar<Item[]>(t, PREFIJO).then((l) => {
      if (!Array.isArray(l) || !l.every((x) => x && typeof x.nombre === 'string' && x.nombre)) throw new Error(L('Ese código no es válido.', 'Этот код неверный.'));
      setItems(l.map((x) => ({ ...x, descripcion: x.descripcion ?? '', precio: x.precio ?? '', tipo: x.tipo ?? 'otro', id: '', cantidad: 1 })));
    }).catch((e) => setError(e.message));
  };
  const anadir = async () => {
    if (!items) return;
    setOcupado(true);
    try {
      const n = await guardarEnBiblioteca(partida, items);
      alert(L(`Importados: ${n} nuevos${items.length - n ? `, ${items.length - n} actualizados (ya había uno con ese nombre)` : ''}.`, `Импортировано: новых ${n}${items.length - n ? `, обновлено ${items.length - n}` : ''}.`));
      onClose();
    } catch (e) { alert((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={L('Importar objetos', 'Импорт предметов')} onClose={onClose}
      pie={<button className="btn primario" disabled={!items || ocupado} onClick={anadir}>{L('Añadir a la biblioteca de esta partida', 'Добавить в библиотеку этой партии')}</button>}>
      <p className="nota">{L('Pega el código que te dio «Exportar todo» en la otra partida.', 'Вставь код из «Экспорт всего» другой партии.')}</p>
      <textarea className="campo codigo-criatura" rows={5} autoFocus value={texto} onChange={(e) => leer(e.target.value)} placeholder="DO1…" />
      {error && <p className="error">{error}</p>}
      {items && <p>✓ {L(`${items.length} objetos`, `${items.length} предм.`)}: {items.slice(0, 8).map((x) => x.nombre).join(', ')}{items.length > 8 ? '…' : ''}</p>}
    </Modal>
  );
}
