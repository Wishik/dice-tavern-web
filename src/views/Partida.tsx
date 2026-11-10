import { useEffect, useState } from 'react';
import { backend, type Resumen, type Usuario } from '../store';
import { borrarPartida, cargarPartida, crearPartida, elegirPersonaje, enlaceInvitacion, quitarMiembro, unirse, type Miembro, type Partida } from '../partidas';
import { L, RU_CLASES, RU_RAZAS, T } from '../i18n';
import { Modal } from '../ui';
import { Ficha } from './Ficha';
import { ChipsEstados } from '../estados';
import { PanelCombate } from './Combate';

/** true en pantallas anchas (portátil del máster): la hoja se abre al lado de la lista de jugadores. */
function useAncho(min = 1000) {
  const q = `(min-width: ${min}px)`;
  const [a, setA] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const f = () => setA(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [q]);
  return a;
}

/** Con combate (alguien tiene iniciativa), los jugadores se ordenan por iniciativa. */
const ordenar = (ms: Miembro[]): Miembro[] => [...ms].sort((a, b) => (b.pj?.iniciativaActual ?? -1000) - (a.pj?.iniciativaActual ?? -1000));
const linea = (pj: NonNullable<Miembro['pj']>) => [T(RU_RAZAS, pj.raza), pj.clase && `${T(RU_CLASES, pj.clase)} ${pj.nivel}`].filter(Boolean).join(' · ');

/** Pantalla de una partida: código para invitar, jugadores y sus personajes. */
export function PantallaPartida({ id, usuario, onVolver, onAbrirFicha }: { id: string; usuario: Usuario; onVolver: () => void; onAbrirFicha: (pj: string) => void }) {
  const [d, setD] = useState<{ partida: Partida; miembros: Miembro[] } | null>(null);
  const [error, setError] = useState('');
  const [mios, setMios] = useState<Resumen[]>([]);
  const [copiado, setCopiado] = useState(false);
  const ancho = useAncho();
  const [sel, setSel] = useState<string | null>(null);
  // La pestaña elegida (Jugadores / Combate) se recuerda al recargar la página.
  const claveVista = `dicetavern.vista.${id}`;
  const [combate, setCombateE] = useState(() => { try { return localStorage.getItem(claveVista) === 'combate'; } catch { return false; } });
  const setCombate = (b: boolean) => { setCombateE(b); try { localStorage.setItem(claveVista, b ? 'combate' : 'jugadores'); } catch { /* sin almacenamiento */ } };
  const recargar = () => cargarPartida(id).then((x) => { setD(x); setError(''); }).catch((e) => setError(e.message));
  useEffect(() => { recargar(); backend.listar().then(setMios).catch(() => {}); }, [id]);
  // Los cambios de los demás (PG, nivel…) se ven al volver a la pantalla o cada 20 s.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') recargar(); }, 4000);
    const v = () => { if (document.visibilityState === 'visible') recargar(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [id]);

  if (error && !d) return <div className="contenido"><p className="error">{error}</p><button className="btn" onClick={onVolver}>‹ {L('Volver', 'Назад')}</button></div>;
  if (!d) return <div className="cargando">{L('Abriendo la partida…', 'Открываем партию…')}</div>;
  const { partida, miembros } = d;
  const soyMaster = partida.master === usuario.id;
  const yo = miembros.find((m) => m.usuario === usuario.id);
  const enlace = enlaceInvitacion(partida.codigo);

  const invitar = async () => {
    const texto = L(`Únete a mi partida «${partida.nombre}» en Dice Tavern. Código: ${partida.codigo}`, `Присоединяйся к моей партии «${partida.nombre}» в Dice Tavern. Код: ${partida.codigo}`);
    try {
      if (navigator.share) { await navigator.share({ title: 'Dice Tavern', text: texto, url: enlace }); return; }
    } catch { /* cancelado: probamos a copiar */ }
    try { await navigator.clipboard.writeText(`${texto}\n${enlace}`); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { prompt(L('Copia este enlace:', 'Скопируй ссылку:'), enlace); }
  };
  const accion = async (f: () => Promise<unknown>) => { try { await f(); await recargar(); } catch (e) { alert((e as Error).message); } };

  return (
    <div className={`pantalla-lista ${ancho ? 'partida-escritorio' : ''}`}>
      <header className="barra">
        <button className="btn enlace volver" onClick={onVolver}>‹ {L('Inicio', 'Главная')}</button>
        <div className="titulo-ficha"><strong>{partida.nombre}</strong><span>{soyMaster ? L('Eres el máster', 'Ты мастер') : L('Partida', 'Партия')}</span></div>
      </header>
      <div className="partida-cuerpo">
      <main className="contenido partida-lado">
        {error && <p className="error">{error}</p>}
        {soyMaster && (
          <div className="segmentado vista-partida">
            <button className={!combate ? 'activo' : ''} onClick={() => { setCombate(false); }}>👥 {L('Jugadores', 'Игроки')}</button>
            <button className={combate ? 'activo' : ''} onClick={() => { setCombate(true); setSel(null); }}>⚔️ {L('Combate', 'Бой')}</button>
          </div>
        )}
        {combate && !ancho ? <PanelCombate partida={partida} miembros={miembros} onRecargar={recargar} onAbrirPj={onAbrirFicha} /> : <>
        <section className="tarjeta invitacion">
          <span className="etq-pequena">{L('Código de invitación', 'Код приглашения')}</span>
          <div className="codigo-partida">{partida.codigo}</div>
          <button className="btn primario" onClick={invitar}>{copiado ? L('✓ Copiado', '✓ Скопировано') : L('Invitar amigos', 'Пригласить друзей')}</button>
          <p className="nota">{L('Tus amigos abren el enlace o escriben el código en «Unirse a una partida».', 'Друзья открывают ссылку или вводят код в «Войти в партию».')}</p>
        </section>

        {yo && !soyMaster && (
          <section className="tarjeta">
            <label className="etiqueta"><span>{L('Tu personaje en esta partida', 'Твой персонаж в этой партии')}</span>
              <select className="campo" value={yo.personaje ?? ''} onChange={(e) => accion(async () => {
                const pj = e.target.value || null;
                await elegirPersonaje(partida.id, pj);
                // Al entrar en juego, los datos de creación quedan bloqueados (el lápiz de la lista los desbloquea).
                if (pj) { const x = await backend.cargar(pj); if (x && !x.bloqueado) await backend.guardar({ ...x, bloqueado: true, actualizado: new Date().toISOString() }); }
              })}>
                <option value="">{L('— Elige —', '— Выбери —')}</option>
                {mios.map((r) => <option key={r.id} value={r.id}>{r.nombre || L('Sin nombre', 'Без имени')} ({T(RU_CLASES, r.clase)} {r.nivel})</option>)}
              </select>
            </label>
          </section>
        )}

        <h2 className="titulo-seccion espacio-arriba">{L('Jugadores', 'Игроки')} ({miembros.filter((m) => m.usuario !== partida.master).length})</h2>
        <div className="rejilla-personajes">
          {ordenar(miembros).map((m) => {
            const esMaster = m.usuario === partida.master;
            const puedeAbrir = !!m.pj && !!m.personaje && (soyMaster || m.usuario === usuario.id);
            return (
              <div key={m.usuario} className={`tarjeta-personaje miembro ${ancho && sel && sel === m.personaje ? 'elegido' : ''}`}>
                <button className="miembro-cuerpo" disabled={!puedeAbrir} onClick={() => m.personaje && (ancho ? setSel(m.personaje) : onAbrirFicha(m.personaje))}>
                  {m.pj?.iniciativaActual != null && <span className="insignia-ini" title={L('Iniciativa', 'Инициатива')}>{m.pj.iniciativaActual}</span>}
                  <div className="retrato">{m.pj?.foto ? <img src={m.pj.foto} alt="" /> : <span>{esMaster ? '👑' : (m.pj?.nombre || m.alias || '?')[0]}</span>}</div>
                  <div className="tp-texto">
                    <strong>{esMaster ? L('Máster', 'Мастер') : m.pj ? (m.pj.nombre || L('Sin nombre', 'Без имени')) : L('Sin personaje', 'Без персонажа')}</strong>
                    <span>@{m.alias}{m.usuario === usuario.id ? ` (${L('tú', 'ты')})` : ''}</span>
                    {m.pj && <span>{linea(m.pj)}</span>}
                    {m.pj && <span className="nivel">❤️ {m.pj.pg?.actual ?? 0}/{m.pj.pg?.max ?? 0}{m.pj.pg?.temp ? ` (+${m.pj.pg.temp} ${L('temp.', 'врем.')})` : ''} · 🛡 {m.pj.ca}{m.pj.pm?.max ? ` · 🔷 ${m.pj.pm.actual}/${m.pj.pm.max}` : ''}</span>}
                    {m.pj && <ChipsEstados estados={m.pj.estados} agotamiento={m.pj.agotamiento} detalles={m.pj.estadosDetalle} />}
                    {m.pj && m.pj.pg?.max > 0 && <div className="barra-vida mini"><div style={{ width: `${Math.max(0, Math.min(100, (100 * m.pj.pg.actual) / m.pj.pg.max))}%` }} /></div>}
                  </div>
                </button>
                {soyMaster && !esMaster && (
                  <button className="btn enlace quitar" aria-label={L('Expulsar', 'Исключить')} onClick={() => confirm(L(`¿Expulsar a @${m.alias} de la partida?`, `Исключить @${m.alias} из партии?`)) && accion(() => quitarMiembro(partida.id, m.usuario))}>✕</button>
                )}
              </div>
            );
          })}
        </div>
        {soyMaster && <p className="nota">{L('Como máster puedes abrir y editar la hoja de cualquier jugador.', 'Как мастер ты можешь открыть и править лист любого игрока.')}</p>}

        <div className="pie-partida">
          {soyMaster
            ? <button className="btn peligro" onClick={async () => { if (confirm(L(`¿Borrar la partida «${partida.nombre}»? Los personajes no se borran.`, `Удалить партию «${partida.nombre}»? Персонажи останутся.`))) { try { await borrarPartida(partida.id); onVolver(); } catch (e) { alert((e as Error).message); } } }}>{L('Borrar partida', 'Удалить партию')}</button>
            : <button className="btn peligro" onClick={async () => { if (confirm(L('¿Salir de esta partida?', 'Выйти из этой партии?'))) { try { await quitarMiembro(partida.id, usuario.id); onVolver(); } catch (e) { alert((e as Error).message); } } }}>{L('Salir de la partida', 'Выйти из партии')}</button>}
        </div>
        </>}
      </main>
      {ancho && (
        <section className="partida-panel">
          {!sel && combate ? <div className="contenido"><PanelCombate partida={partida} miembros={miembros} onRecargar={recargar} onAbrirPj={setSel} /></div>
            : sel ? <Ficha key={sel} id={sel} ajeno={miembros.find((m) => m.personaje === sel)?.usuario !== usuario.id} volverTexto={L('Cerrar', 'Закрыть')} onVolver={() => { setSel(null); recargar(); }} />
            : <div className="panel-vacio"><span>📜</span><p>{soyMaster ? L('Elige a un jugador de la lista para ver y editar su hoja aquí.', 'Выбери игрока слева, чтобы открыть и править его лист здесь.') : L('Elige tu personaje de la lista para abrir su hoja aquí.', 'Выбери своего персонажа слева, чтобы открыть его лист здесь.')}</p></div>}
        </section>
      )}
      </div>
    </div>
  );
}

/** Ventana para crear una partida nueva. */
export function ModalCrearPartida({ onClose, onCreada }: { onClose: () => void; onCreada: (id: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const crear = async () => {
    if (!nombre.trim()) { setMsg(L('Ponle un nombre.', 'Дай ей название.')); return; }
    setOcupado(true); setMsg('');
    try { const p = await crearPartida(nombre); onCreada(p.id); } catch (e) { setMsg((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={L('Nueva partida', 'Новая партия')} onClose={onClose} pie={<button className="btn primario" disabled={ocupado} onClick={crear}>{ocupado ? '…' : L('Crear', 'Создать')}</button>}>
      <p className="nota">{L('Serás el máster. Luego podrás invitar a tus amigos con un código.', 'Ты будешь мастером. Потом сможешь пригласить друзей по коду.')}</p>
      <input className="campo" autoFocus maxLength={60} placeholder={L('Nombre de la partida', 'Название партии')} value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crear()} />
      {msg && <p className="error">{msg}</p>}
    </Modal>
  );
}

/** Ventana para entrar en una partida con el código (también se abre sola desde el enlace de invitación). */
export function ModalUnirse({ codigoInicial = '', onClose, onUnido }: { codigoInicial?: string; onClose: () => void; onUnido: (id: string) => void }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const entrar = async () => {
    if (codigo.trim().length < 4) { setMsg(L('Escribe el código que te ha dado el máster.', 'Введи код, который дал мастер.')); return; }
    setOcupado(true); setMsg('');
    try { onUnido(await unirse(codigo)); } catch (e) { setMsg((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={L('Unirse a una partida', 'Войти в партию')} onClose={onClose} pie={<button className="btn primario" disabled={ocupado} onClick={entrar}>{ocupado ? '…' : L('Entrar', 'Войти')}</button>}>
      <input className="campo codigo-entrada" autoFocus maxLength={10} autoCapitalize="characters" autoComplete="off" placeholder="ABC123" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && entrar()} />
      {msg && <p className="error">{msg}</p>}
    </Modal>
  );
}
