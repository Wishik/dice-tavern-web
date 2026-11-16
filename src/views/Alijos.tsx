import { useCallback, useEffect, useRef, useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Modal, Seccion } from '../ui';
import { L } from '../i18n';
import { td } from '../datosRu';
import { uid } from '../rules';
import { supabase } from '../store';
import { cargarPartida, type Miembro } from '../partidas';
import { borrarAlijo, cambiarAlijo, cambiarItems, cargarAlijos, crearAlijo, partidaDe, sueloDe, yo, type Alijo } from '../alijos';
import { nombreBotin } from '../botin';
import { esBiblioteca } from '../bibliotecaObjetos';
import type { Item, Personaje } from '../types';
import { cabe, poner } from './TabInventario';

/** Partida del personaje, sus alijos (los que puedo ver), el suelo y los miembros. Se refresca cada 8 s. */
export function useAlijos() {
  const { p } = useFicha();
  const [partida, setPartida] = useState<string | null | undefined>(undefined);
  const [alijos, setAlijos] = useState<Alijo[] | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [master, setMaster] = useState('');
  const [mio, setMio] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let vivo = true; partidaDe(p.id).then((x) => vivo && setPartida(x)); if (supabase) yo().then(setMio).catch(() => {}); return () => { vivo = false; }; }, [p.id]);
  const recargar = useCallback(async () => {
    if (!partida) return;
    try {
      await sueloDe(partida);
      const [a, d] = await Promise.all([cargarAlijos(partida), cargarPartida(partida)]);
      setAlijos(a); setMiembros(d.miembros); setMaster(d.partida.master); setError('');
    } catch (e) { setError((e as Error).message); }
  }, [partida]);
  useEffect(() => {
    recargar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') recargar(); }, 8000);
    const f = () => { recargar(); };
    window.addEventListener('alijos-cambio', f);
    return () => { clearInterval(t); window.removeEventListener('alijos-cambio', f); };
  }, [recargar]);
  const suelo = alijos?.find((a) => a.suelo) ?? null;
  const biblioteca = alijos?.find(esBiblioteca) ?? null;
  return { partida, alijos: alijos?.filter((a) => !a.suelo && !esBiblioteca(a)) ?? null, suelo, biblioteca, miembros, master, mio, error, recargar };
}

const nombreMiembro = (m: Miembro) => `${m.alias}${m.pj ? ` (${m.pj.nombre})` : ''}`;

/** Sección del inventario: el suelo (objetos tirados) y los alijos de la partida. */
export function SeccionAlijos() {
  const { p, upd, ajeno } = useFicha();
  const { partida, alijos, suelo, miembros, master, mio, error, recargar } = useAlijos();
  const [editar, setEditar] = useState<Alijo | 'nuevo' | null>(null);
  const local = p.suelo ?? [];
  // En una partida, lo que cayó al suelo «en local» (p. ej. lo que no cabía al cambiar de cinturón) pasa al suelo compartido.
  const pasando = useRef(false);
  useEffect(() => {
    if (!partida || !suelo || !local.length || pasando.current || ajeno) return;
    pasando.current = true;
    const ids = new Set(local.map((it) => it.id));
    cambiarItems(suelo.id, (l) => [...l, ...local.filter((it) => !l.some((y) => y.id === it.id))])
      .then(() => { upd((x) => { x.suelo = (x.suelo ?? []).filter((it) => !ids.has(it.id)); }); recargar(); })
      .catch(() => {})
      .finally(() => { pasando.current = false; });
  }, [partida, suelo, local, ajeno, upd, recargar]);

  /** Coger un objeto de un alijo (o del suelo) y ponerlo en la mochila. */
  const coger = async (a: Alijo, it: Item) => {
    if (!cabe(p, it, { zona: 'mochila' })) return;
    try {
      let estaba = false;
      await cambiarItems(a.id, (l) => { estaba = l.some((x) => x.id === it.id); return l.filter((x) => x.id !== it.id); });
      if (!estaba) { alert(L('Alguien lo ha cogido antes que tú.', 'Кто-то уже забрал это.')); recargar(); return; }
      upd((x) => poner(x, { ...it, id: uid() }, { zona: 'mochila' }));
      recargar();
    } catch (e) { alert((e as Error).message); }
  };
  const recogerLocal = (it: Item) => {
    if (!cabe(p, it, { zona: 'mochila' })) return;
    upd((x) => { x.suelo = (x.suelo ?? []).filter((y) => y.id !== it.id); poner(x, it, { zona: 'mochila' }); });
  };

  const listaItems = (items: Item[], onCoger: (it: Item) => void) => items.length === 0
    ? <p className="vacio">{L('Vacío.', 'Пусто.')}</p>
    : <ul className="lista-alijo">{items.map((it) => (
        <li key={it.id}><span>{it.bolsa ? nombreBotin(it) : <>{td(it.nombre)}{it.cantidad > 1 && <span className="cant"> ×{it.cantidad}</span>}</>}</span>
          <button className="btn pequeno" onClick={() => onCoger(it)}>{L('Coger', 'Взять')}</button></li>))}</ul>;

  return (
    <Seccion titulo={L('Suelo y alijos', 'Пол и тайники')} className="seccion-alijos">
      <h4 className="titulo-alijo">🪨 {L('Suelo', 'Пол')}</h4>
      <p className="nota pequena">{partida ? L('Lo que tiráis al suelo en esta partida. Cualquiera puede recogerlo.', 'То, что бросили на пол в этой партии. Подобрать может любой.') : L('Lo que has tirado. Tócalo para recogerlo.', 'То, что ты бросил. Нажми, чтобы подобрать.')}</p>
      {partida === undefined ? <p className="nota">{L('Cargando…', 'Загрузка…')}</p>
        : !partida ? listaItems(local, recogerLocal)
        : error ? <p className="error">{error}</p>
        : !suelo ? <p className="nota">{L('Cargando…', 'Загрузка…')}</p>
        : listaItems(suelo.items, (it) => coger(suelo, it))}

      <h4 className="titulo-alijo">📦 {L('Alijos', 'Тайники')}</h4>
      {!partida ? <p className="nota pequena">{L('Los alijos se comparten con la partida: entra con este personaje en una partida para crearlos.', 'Тайники общие для партии: войди этим персонажем в партию, чтобы их создавать.')}</p>
        : !alijos ? null
        : <>
          {alijos.length === 0 && <p className="nota pequena">{L('Aún no hay alijos. Crea uno y guarda cosas desde cada objeto («Dejar en un alijo»).', 'Тайников пока нет. Создай и складывай вещи из окна предмета («Оставить в тайнике»).')}</p>}
          {alijos.map((a) => {
            const puedeEditar = a.creador === mio || master === mio;
            const conAcceso = miembros.filter((m) => a.acceso.includes(m.usuario));
            const creador = miembros.find((m) => m.usuario === a.creador);
            return (
              <div key={a.id} className="alijo">
                <div className="cab-alijo">
                  <strong>{a.nombre || L('Alijo', 'Тайник')}</strong>
                  <small>{a.publico ? `🔓 ${L('Público', 'Общий')}` : `🔒 ${L('Privado', 'Личный')}: ${[creador && nombreMiembro(creador), ...conAcceso.map(nombreMiembro)].filter(Boolean).join(', ')}`}</small>
                  {puedeEditar && <button className="btn enlace pequeno" onClick={() => setEditar(a)}>{L('Editar', 'Изменить')}</button>}
                </div>
                {listaItems(a.items, (it) => coger(a, it))}
              </div>
            );
          })}
          <BotonAnadir onClick={() => setEditar('nuevo')}>{L('Crear alijo', 'Создать тайник')}</BotonAnadir>
        </>}
      {editar && partida && <ModalEditarAlijo alijo={editar === 'nuevo' ? null : editar} partida={partida} miembros={miembros.filter((m) => m.usuario !== mio && m.usuario !== master)}
        suelo={suelo} onClose={() => setEditar(null)} onCambio={recargar} />}
    </Seccion>
  );
}

function ModalEditarAlijo({ alijo, partida, miembros, suelo, onClose, onCambio }: { alijo: Alijo | null; partida: string; miembros: Miembro[]; suelo: Alijo | null; onClose: () => void; onCambio: () => void }) {
  const [nombre, setNombre] = useState(alijo?.nombre ?? '');
  const [publico, setPublico] = useState(alijo?.publico ?? true);
  const [acceso, setAcceso] = useState<string[]>(alijo?.acceso ?? []);
  const [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    if (!nombre.trim()) { alert(L('Ponle un nombre.', 'Дай ему название.')); return; }
    setOcupado(true);
    try {
      if (alijo) await cambiarAlijo(alijo.id, { nombre: nombre.trim(), publico, acceso: publico ? [] : acceso });
      else await crearAlijo(partida, nombre.trim(), publico, publico ? [] : acceso);
      onCambio(); onClose();
    } catch (e) { alert((e as Error).message); } finally { setOcupado(false); }
  };
  const borrar = async () => {
    if (!alijo) return;
    if (!confirm(L(`¿Borrar «${alijo.nombre}»?${alijo.items.length ? ' Lo que tenga dentro caerá al suelo.' : ''}`, `Удалить «${alijo.nombre}»?${alijo.items.length ? ' Всё, что внутри, упадёт на пол.' : ''}`))) return;
    try {
      if (alijo.items.length && suelo) await cambiarItems(suelo.id, (l) => [...l, ...alijo.items]);
      await borrarAlijo(alijo.id); onCambio(); onClose();
    } catch (e) { alert((e as Error).message); }
  };
  return (
    <Modal titulo={alijo ? L('Editar alijo', 'Изменить тайник') : L('Nuevo alijo', 'Новый тайник')} onClose={onClose}
      pie={<div className="acciones-item">
        {alijo && <button className="btn peligro" onClick={borrar}>{L('Borrar', 'Удалить')}</button>}
        <button className="btn primario" disabled={ocupado} onClick={guardar}>{L('Guardar', 'Сохранить')}</button>
      </div>}>
      <label className="etiqueta"><span>{L('Nombre', 'Название')}</span>
        <input className="campo" autoFocus value={nombre} maxLength={60} placeholder={L('p. ej. Cofre de la posada', 'напр. Сундук в таверне')} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <div className="segmentado">
        <button className={publico ? 'activo' : ''} onClick={() => setPublico(true)}>🔓 {L('Público', 'Общий')}</button>
        <button className={!publico ? 'activo' : ''} onClick={() => setPublico(false)}>🔒 {L('Privado', 'Личный')}</button>
      </div>
      {publico ? <p className="nota">{L('Lo ve y lo usa toda la partida.', 'Видит и пользуется вся партия.')}</p> : <>
        <p className="nota">{L('Solo tú (y el máster) y las personas que marques:', 'Только ты (и мастер) и те, кого отметишь:')}</p>
        {miembros.length === 0 ? <p className="nota pequena">{L('No hay más jugadores en la partida.', 'В партии больше нет игроков.')}</p>
          : miembros.map((m) => (
            <label key={m.usuario} className="interruptor"><input type="checkbox" checked={acceso.includes(m.usuario)} onChange={(e) => setAcceso((l) => e.target.checked ? [...l, m.usuario] : l.filter((x) => x !== m.usuario))} /> {nombreMiembro(m)}</label>
          ))}
      </>}
    </Modal>
  );
}

/** Desde un objeto: tirarlo al suelo o dejarlo en un alijo. `sacar(n)` lo quita de la hoja y devuelve la parte que se deja. */
export function ModalDejar({ it, sacar, onClose }: { it: Item; sacar: (x: Personaje, n: number) => Item | null; onClose: () => void }) {
  const { upd } = useFicha();
  const { partida, alijos, suelo, error } = useAlijos();
  const [txt, setTxt] = useState(String(it.cantidad));
  const n = Math.max(1, Math.min(it.cantidad, parseInt(txt, 10) || 0));
  const dejar = async (a: Alijo | 'local') => {
    if (a === 'local') { upd((x) => { const parte = sacar(x, n); if (parte) x.suelo = [...(x.suelo ?? []), parte]; }); onClose(); return; }
    const copia: Item = { ...structuredClone(it), id: uid(), cantidad: n };
    try {
      await cambiarItems(a.id, (l) => [...l, copia]);
      upd((x) => { sacar(x, n); });
      window.dispatchEvent(new Event('alijos-cambio'));
      onClose();
    } catch (e) { alert((e as Error).message); }
  };
  return (
    <Modal titulo={L(`Dejar ${td(it.nombre)}`, `Оставить: ${td(it.nombre)}`)} onClose={onClose}>
      {it.cantidad > 1 && <label className="etiqueta"><span>{L(`Cuántos (de ${it.cantidad})`, `Сколько (из ${it.cantidad})`)}</span>
        <input className="campo" inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, ''))} /></label>}
      {partida === undefined ? <p className="nota">{L('Cargando…', 'Загрузка…')}</p>
        : !partida ? <button className="btn primario ancho" onClick={() => dejar('local')}>🪨 {L('Tirar al suelo', 'Бросить на пол')}</button>
        : error ? <p className="error">{error}</p>
        : <div className="lista-opciones">
          {suelo && <button className="btn primario" onClick={() => dejar(suelo)}>🪨 {L('Tirar al suelo', 'Бросить на пол')}</button>}
          {(alijos ?? []).map((a) => <button key={a.id} className="btn" onClick={() => dejar(a)}>📦 {a.nombre || L('Alijo', 'Тайник')} <small>{a.publico ? '🔓' : '🔒'}</small></button>)}
          {alijos && alijos.length === 0 && <p className="nota pequena">{L('No hay alijos. Créalos abajo del inventario, en «Suelo y alijos».', 'Тайников нет. Создай их внизу инвентаря, в «Пол и тайники».')}</p>}
        </div>}
    </Modal>
  );
}
