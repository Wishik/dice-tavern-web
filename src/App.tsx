import { useEffect, useState } from 'react';
import { backend, supabase, type Resumen, type Usuario } from './store';
import { nuevoPersonaje } from './personaje';
import { cargarRu } from './datosRu';
import { DiceProvider, PanelDados, DadoIcono } from './dice';
import { Ficha } from './views/Ficha';
import { Modal } from './ui';
import { misPartidas, type Partida } from './partidas';
import { ModalCrearPartida, ModalUnirse, PantallaPartida } from './views/Partida';
import { L, RU_CLASES, RU_RAZAS, T, cambiarIdioma, useIdioma, trClases } from './i18n';

// Código del enlace de invitación (?unirse=…). Se lee una sola vez al cargar: la pantalla puede montarse varias veces
// (al cambiar de idioma), y hasta entrar en la cuenta hay que conservarlo.
let codigoInvitacion: string | null = new URLSearchParams(location.search).get('unirse');

export default function App() {
  const idioma = useIdioma();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [recuperando, setRecuperando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(() => new URLSearchParams(location.search).get('p'));
  // Partida abierta (?g=…). Si además hay una ficha abierta desde ella, «volver» regresa a la partida.
  const [partida, setPartida] = useState<string | null>(() => new URLSearchParams(location.search).get('g'));
  // En ruso hay que cargar antes las traducciones del manual; la clave de DiceProvider fuerza a repintar todo.
  const [ruListo, setRuListo] = useState(false);
  useEffect(() => { if (idioma === 'ru') cargarRu().then(() => setRuListo(true)); }, [idioma]);

  useEffect(() => {
    let listo = false;
    backend.usuario().then((u) => { listo = true; setUsuario(u); }).catch(() => { listo = true; setUsuario(null); });
    // Si la sesión tarda demasiado, mostramos la pantalla de entrada en vez de quedarnos colgados.
    const t = setTimeout(() => { if (!listo) setUsuario((u) => (u === undefined ? null : u)); }, 8000);
    // Importante: no llamar a Supabase dentro de este callback (provoca un bloqueo); usar la sesión que llega.
    const sub = supabase?.auth.onAuthStateChange((ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') setRecuperando(true);
      setUsuario(s?.user ? { id: s.user.id, email: s.user.email ?? '', alias: (s.user.user_metadata?.alias as string) ?? '' } : null);
    });
    return () => { clearTimeout(t); sub?.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const url = new URL(location.href);
    if (abierto) url.searchParams.set('p', abierto); else url.searchParams.delete('p');
    if (partida) url.searchParams.set('g', partida); else url.searchParams.delete('g');
    url.searchParams.delete('unirse');
    history.replaceState(null, '', url);
  }, [abierto, partida]);
  const [ajeno, setAjeno] = useState(false);
  useEffect(() => {
    if (!abierto || !usuario || backend.modo !== 'nube') { setAjeno(false); return; }
    backend.listar().then((l) => setAjeno(!l.some((r) => r.id === abierto))).catch(() => setAjeno(false));
  }, [abierto, usuario?.id]);

  if (usuario === undefined) return <div className="cargando">{L('Cargando la taberna…', 'Открываем таверну…')}</div>;
  return (
    <DiceProvider key={idioma + (ruListo ? '1' : '0')}>
      {recuperando && usuario ? <NuevaClave onListo={() => setRecuperando(false)} />
        : !usuario ? <Entrada onOk={setUsuario} /> : abierto
        ? <Ficha key={abierto} id={abierto} ajeno={ajeno} volverTexto={partida ? L('Partida', 'Партия') : undefined} onVolver={() => setAbierto(null)} />
        : partida ? <PantallaPartida id={partida} usuario={usuario} onVolver={() => setPartida(null)} onAbrirFicha={setAbierto} />
        : <Lista usuario={usuario} onUsuario={setUsuario} onAbrir={setAbierto} onPartida={setPartida} onSalir={async () => { await backend.salir(); setUsuario(null); }} />}
    </DiceProvider>
  );
}

/** Botones ES / RU para cambiar el idioma de la interfaz. */
export function SelectorIdioma() {
  const i = useIdioma();
  return (
    <div className="selector-idioma" role="group" aria-label="Idioma / Язык">
      <button type="button" className={i === 'es' ? 'activo' : ''} onClick={() => cambiarIdioma('es')}>ES</button>
      <button type="button" className={i === 'ru' ? 'activo' : ''} onClick={() => cambiarIdioma('ru')}>RU</button>
    </div>
  );
}

function CampoClave({ valor, set, ver, setVer, nueva, etiqueta }: { valor: string; set: (s: string) => void; ver: boolean; setVer: (b: boolean) => void; nueva?: boolean; etiqueta: string }) {
  return (
    <label className="etiqueta"><span>{etiqueta}</span>
      <span className="campo-clave">
        <input className="campo" type={ver ? 'text' : 'password'} autoComplete={nueva ? 'new-password' : 'current-password'} required minLength={6} value={valor} onChange={(e) => set(e.target.value)} />
        <button type="button" className="ojo" onClick={() => setVer(!ver)} aria-label={ver ? L('Ocultar contraseña', 'Скрыть пароль') : L('Ver contraseña', 'Показать пароль')}>{ver ? '🙈' : '👁️'}</button>
      </span>
    </label>
  );
}

function Entrada({ onOk }: { onOk: (u: Usuario) => void }) {
  const [modo, setModo] = useState<'entrar' | 'registro' | 'olvido'>('entrar');
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState<{ t: 'error' | 'ok'; s: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setOcupado(true); setMsg(null);
    try {
      if (modo === 'olvido') {
        await backend.recuperar(email.trim());
        setMsg({ t: 'ok', s: L('Te hemos enviado un correo con un enlace para poner una contraseña nueva.', 'Мы отправили письмо со ссылкой для нового пароля.') });
        return;
      }
      if (modo === 'registro') {
        if (alias.trim().length < 2) { setMsg({ t: 'error', s: L('El alias debe tener al menos 2 letras.', 'Ник должен быть не короче 2 символов.') }); return; }
        if (clave !== clave2) { setMsg({ t: 'error', s: L('Las contraseñas no coinciden.', 'Пароли не совпадают.') }); return; }
        const r = await backend.registrar(email.trim(), clave, alias.trim());
        if (r === 'confirmar') { setMsg({ t: 'ok', s: L('Te hemos enviado un correo. Confírmalo y luego inicia sesión.', 'Мы отправили письмо. Подтверди почту и войди.') }); setModo('entrar'); return; }
      } else await backend.entrar(email.trim(), clave);
      const u = await backend.usuario(); if (u) onOk(u);
    } catch (err) { setMsg({ t: 'error', s: (err as Error).message }); } finally { setOcupado(false); }
  };
  const cambiar = (m: typeof modo) => { setModo(m); setMsg(null); };
  return (
    <div className="pantalla-entrada">
      <SelectorIdioma />
      <div className="logo"><DadoIcono caras={20} size={72} /><h1>Dice Tavern</h1><p>{L('Tu hoja de personaje y tus dados, sin cuaderno.', 'Твой лист персонажа и кубики — без тетрадки.')}</p></div>
      <form className="tarjeta formulario" onSubmit={enviar}>
        {modo !== 'olvido' ? (
          <div className="segmentado">
            <button type="button" className={modo === 'entrar' ? 'activo' : ''} onClick={() => cambiar('entrar')}>{L('Entrar', 'Вход')}</button>
            <button type="button" className={modo === 'registro' ? 'activo' : ''} onClick={() => cambiar('registro')}>{L('Crear cuenta', 'Регистрация')}</button>
          </div>
        ) : <h3>{L('¿Olvidaste la contraseña?', 'Забыли пароль?')}</h3>}
        {modo === 'registro' && (
          <label className="etiqueta"><span>{L('Alias (tu nombre de jugador, único)', 'Ник (имя игрока, должно быть уникальным)')}</span>
            <input className="campo" autoComplete="nickname" required minLength={2} maxLength={24} value={alias} onChange={(e) => setAlias(e.target.value)} />
          </label>
        )}
        <label className="etiqueta"><span>{L('Correo', 'Почта')}</span><input className="campo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {modo !== 'olvido' && <CampoClave etiqueta={L('Contraseña', 'Пароль')} valor={clave} set={setClave} ver={ver} setVer={setVer} nueva={modo === 'registro'} />}
        {modo === 'registro' && <>
          <CampoClave etiqueta={L('Repite la contraseña', 'Повтори пароль')} valor={clave2} set={setClave2} ver={ver} setVer={setVer} nueva />
          {clave2 && clave !== clave2 && <small className="error">{L('No coinciden.', 'Не совпадают.')}</small>}
        </>}
        {modo === 'olvido' && <p className="nota">{L('Escribe tu correo y te enviaremos un enlace para poner una contraseña nueva.', 'Напиши почту — пришлём ссылку для нового пароля.')}</p>}
        {msg && <p className={msg.t === 'error' ? 'error' : 'exito'}>{msg.s}</p>}
        <button className="btn primario grande" disabled={ocupado}>{ocupado ? '…' : modo === 'entrar' ? L('Entrar', 'Войти') : modo === 'registro' ? L('Crear cuenta', 'Создать аккаунт') : L('Enviar enlace', 'Отправить ссылку')}</button>
        {modo === 'entrar' && <button type="button" className="btn enlace" onClick={() => cambiar('olvido')}>{L('¿Olvidaste la contraseña?', 'Забыли пароль?')}</button>}
        {modo === 'olvido' && <button type="button" className="btn enlace" onClick={() => cambiar('entrar')}>‹ {L('Volver a entrar', 'Назад ко входу')}</button>}
      </form>
    </div>
  );
}

/** Pantalla a la que se llega desde el enlace del correo «olvidé la contraseña». */
function NuevaClave({ onListo }: { onListo: () => void }) {
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    if (clave !== clave2) { setMsg(L('Las contraseñas no coinciden.', 'Пароли не совпадают.')); return; }
    setOcupado(true);
    try { await backend.nuevaClave(clave); alert(L('Contraseña cambiada.', 'Пароль изменён.')); onListo(); }
    catch (err) { setMsg((err as Error).message); } finally { setOcupado(false); }
  };
  return (
    <div className="pantalla-entrada">
      <SelectorIdioma />
      <div className="logo"><DadoIcono caras={20} size={72} /><h1>Dice Tavern</h1></div>
      <form className="tarjeta formulario" onSubmit={enviar}>
        <h3>{L('Nueva contraseña', 'Новый пароль')}</h3>
        <CampoClave etiqueta={L('Contraseña nueva', 'Новый пароль')} valor={clave} set={setClave} ver={ver} setVer={setVer} nueva />
        <CampoClave etiqueta={L('Repite la contraseña', 'Повтори пароль')} valor={clave2} set={setClave2} ver={ver} setVer={setVer} nueva />
        {msg && <p className="error">{msg}</p>}
        <button className="btn primario grande" disabled={ocupado}>{ocupado ? '…' : L('Guardar contraseña', 'Сохранить пароль')}</button>
      </form>
    </div>
  );
}

/** Para cuentas creadas antes de que existiera el alias: lo pide una vez. */
function ModalAlias({ onListo }: { onListo: (a: string) => void }) {
  const [alias, setAlias] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    if (alias.trim().length < 2) { setMsg(L('El alias debe tener al menos 2 letras.', 'Ник должен быть не короче 2 символов.')); return; }
    setOcupado(true); setMsg('');
    try { await backend.ponerAlias(alias.trim()); onListo(alias.trim()); } catch (e) { setMsg((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={L('Elige tu alias', 'Выбери ник')} onClose={() => onListo('')}
      pie={<button className="btn primario" disabled={ocupado} onClick={guardar}>{L('Guardar', 'Сохранить')}</button>}>
      <p className="nota">{L('Tu nombre de jugador. Es único: nadie más puede usarlo.', 'Твоё имя игрока. Оно уникально: никто другой не сможет его взять.')}</p>
      <input className="campo" autoFocus maxLength={24} value={alias} onChange={(e) => setAlias(e.target.value)} />
      {msg && <p className="error">{msg}</p>}
    </Modal>
  );
}

function Lista({ usuario, onUsuario, onAbrir, onPartida, onSalir }: { usuario: Usuario; onUsuario: (u: Usuario) => void; onAbrir: (id: string) => void; onPartida: (id: string) => void; onSalir: () => void }) {
  const [partidas, setPartidas] = useState<Partida[] | null>(null);
  const [errPartidas, setErrPartidas] = useState('');
  const [crearP, setCrearP] = useState(false);
  // Enlace de invitación: ?unirse=CÓDIGO abre directamente la ventana para entrar.
  const [unirseCod, setUnirseCod] = useState<string | null>(codigoInvitacion);
  useEffect(() => {
    if (backend.modo === 'nube') misPartidas().then(setPartidas).catch((e) => setErrPartidas(e.message));
  }, []);
  const cerrarUnirse = () => { codigoInvitacion = null; setUnirseCod(null); };
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [error, setError] = useState('');
  const [dados, setDados] = useState(false);
  const [pedirAlias, setPedirAlias] = useState(backend.modo === 'nube' && !usuario.alias);
  const recargar = () => backend.listar().then(setLista).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);
  const [creando, setCreando] = useState(false);
  const alternarBloqueo = async (r: Resumen) => {
    if (r.bloqueado && !confirm(L('¿Desbloquear la hoja? Podrás cambiar raza, clase, nivel, características y PG máximos. Hazlo solo si el máster está de acuerdo.', 'Разблокировать лист? Можно будет менять расу, класс, уровень, характеристики и максимум хитов. Делай это, только если мастер согласен.'))) return;
    try {
      const x = await backend.cargar(r.id); if (!x) return;
      await backend.guardar({ ...x, bloqueado: !r.bloqueado, actualizado: new Date().toISOString() });
      setLista((l) => l?.map((y) => (y.id === r.id ? { ...y, bloqueado: !r.bloqueado } : y)) ?? l);
    } catch (e) { setError((e as Error).message); }
  };
  const borrarPj = async (r: Resumen) => {
    if (!confirm(L(`¿Borrar a ${r.nombre || 'este personaje'} para siempre?`, `Удалить ${r.nombre || 'этого персонажа'} навсегда?`))) return;
    try { await backend.borrar(r.id); setLista((l) => l?.filter((x) => x.id !== r.id) ?? l); } catch (e) { setError((e as Error).message); }
  };
  const crear = async () => {
    if (creando) return;
    setCreando(true); setError('');
    try {
      const p = nuevoPersonaje(L('Nuevo personaje', 'Новый персонаж'));
      await backend.guardar(p); onAbrir(p.id);
    } catch (e) {
      setError(`${L('No se pudo crear el personaje', 'Не удалось создать персонажа')}: ${(e as Error).message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setCreando(false); }
  };
  return (
    <div className="pantalla-lista">
      <header className="barra">
        <div className="marca"><DadoIcono caras={20} size={30} /><span>Dice Tavern</span></div>
        <div className="barra-derecha">
          <SelectorIdioma />
          <span className="usuario">{usuario.alias || (usuario.id === 'local' ? L('Este dispositivo', 'Это устройство') : usuario.email)}</span>
          {backend.modo === 'nube' && <button className="btn enlace" onClick={onSalir}>{L('Salir', 'Выйти')}</button>}
        </div>
      </header>
      <main className="contenido">
        {backend.modo === 'local' && <p className="aviso-local">{L('Modo local: los personajes se guardan solo en este navegador.', 'Локальный режим: персонажи хранятся только в этом браузере.')}</p>}
        <h2 className="titulo-seccion">{L('Tus personajes', 'Твои персонажи')}</h2>
        {error && <p className="error">{error}</p>}
        {!lista && !error && <p className="vacio">{L('Cargando…', 'Загрузка…')}</p>}
        <div className="rejilla-personajes">
          {lista?.map((r) => (
            <div key={r.id} className="tarjeta-personaje miembro">
              <button className="miembro-cuerpo" onClick={() => onAbrir(r.id)}>
                <div className="retrato">{r.foto ? <img src={r.foto} alt="" /> : <span>{(r.nombre || '?')[0]}</span>}</div>
                <div className="tp-texto"><strong>{r.nombre || L('Sin nombre', 'Без имени')}</strong><span>{[T(RU_RAZAS, r.raza), trClases(r.clase)].filter(Boolean).join(' · ') || L('Sin raza ni clase', 'Без расы и класса')}</span><span className="nivel">{L('Nivel', 'Уровень')} {r.nivel}</span></div>
              </button>
              <div className="acciones-tarjeta">
                <button className="btn-icono" title={r.bloqueado ? L('Desbloquear para editar raza, clase, características…', 'Разблокировать правку расы, класса, характеристик…') : L('Terminar la creación y bloquear raza, clase, características…', 'Закончить создание и заблокировать расу, класс, характеристики…')} onClick={() => alternarBloqueo(r)}>{r.bloqueado ? '🔒' : '🔓'}</button>
                <button className="btn-icono" title={L('Borrar personaje', 'Удалить персонажа')} aria-label={L('Borrar personaje', 'Удалить персонажа')} onClick={() => borrarPj(r)}>🗑️</button>
              </div>
            </div>
          ))}
          <button type="button" className="tarjeta-personaje nuevo" onClick={crear} disabled={creando}><span className="mas-grande">+</span><span>{creando ? L('Creando…', 'Создаём…') : L('Nuevo personaje', 'Новый персонаж')}</span></button>
        </div>

        <h2 className="titulo-seccion espacio-arriba">{L('Partidas', 'Партии')}</h2>
        {backend.modo === 'local' ? <p className="nota">{L('Para jugar en partida con amigos necesitas una cuenta.', 'Чтобы играть с друзьями в партии, нужен аккаунт.')}</p> : <>
          {errPartidas && <p className="error">{errPartidas}</p>}
          <div className="rejilla-personajes">
            {partidas?.map((g) => (
              <button key={g.id} className="tarjeta-personaje" onClick={() => onPartida(g.id)}>
                <div className="retrato"><span>{g.master === usuario.id ? '👑' : '⚔️'}</span></div>
                <div className="tp-texto"><strong>{g.nombre}</strong><span>{g.master === usuario.id ? L('Eres el máster', 'Ты мастер') : L('Juegas como jugador', 'Ты игрок')}</span><span className="nivel">{L('Código', 'Код')}: {g.codigo}</span></div>
              </button>
            ))}
          </div>
          <div className="fila-botones espacio-arriba">
            <button className="btn primario" onClick={() => setCrearP(true)}>👑 {L('Crear partida', 'Создать партию')}</button>
            <button className="btn" onClick={() => setUnirseCod('')}>🔑 {L('Unirse a una partida', 'Войти в партию')}</button>
          </div>
        </>}
      </main>
      <button className="fab" onClick={() => setDados(true)} aria-label={L('Dados', 'Кубики')}><DadoIcono caras={20} size={40} /></button>
      {dados && <Modal titulo={L('Dados', 'Кубики')} onClose={() => setDados(false)}><PanelDados /></Modal>}
      {crearP && <ModalCrearPartida onClose={() => setCrearP(false)} onCreada={(id) => { setCrearP(false); onPartida(id); }} />}
      {unirseCod !== null && backend.modo === 'nube' && !pedirAlias && <ModalUnirse codigoInicial={unirseCod} onClose={cerrarUnirse} onUnido={(id) => { cerrarUnirse(); onPartida(id); }} />}
      {pedirAlias && <ModalAlias onListo={(a) => { setPedirAlias(false); if (a) onUsuario({ ...usuario, alias: a }); }} />}
    </div>
  );
}
