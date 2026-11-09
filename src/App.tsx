import { useEffect, useState } from 'react';
import { backend, supabase, type Resumen, type Usuario } from './store';
import { nuevoPersonaje } from './personaje';
import { DiceProvider, PanelDados, DadoIcono } from './dice';
import { Ficha } from './views/Ficha';
import { Modal } from './ui';
import { L, RU_CLASES, RU_RAZAS, T, cambiarIdioma, useIdioma } from './i18n';

export default function App() {
  const idioma = useIdioma();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [recuperando, setRecuperando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(() => new URLSearchParams(location.search).get('p'));

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
    history.replaceState(null, '', url);
  }, [abierto]);

  if (usuario === undefined) return <div className="cargando">{L('Cargando la taberna…', 'Открываем таверну…')}</div>;
  return (
    <DiceProvider key={idioma}>
      {recuperando && usuario ? <NuevaClave onListo={() => setRecuperando(false)} />
        : !usuario ? <Entrada onOk={setUsuario} /> : abierto
        ? <Ficha id={abierto} onVolver={() => setAbierto(null)} />
        : <Lista usuario={usuario} onUsuario={setUsuario} onAbrir={setAbierto} onSalir={async () => { await backend.salir(); setUsuario(null); }} />}
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

function Lista({ usuario, onUsuario, onAbrir, onSalir }: { usuario: Usuario; onUsuario: (u: Usuario) => void; onAbrir: (id: string) => void; onSalir: () => void }) {
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [error, setError] = useState('');
  const [dados, setDados] = useState(false);
  const [pedirAlias, setPedirAlias] = useState(backend.modo === 'nube' && !usuario.alias);
  const recargar = () => backend.listar().then(setLista).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);
  const [creando, setCreando] = useState(false);
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
            <button key={r.id} className="tarjeta-personaje" onClick={() => onAbrir(r.id)}>
              <div className="retrato">{r.foto ? <img src={r.foto} alt="" /> : <span>{(r.nombre || '?')[0]}</span>}</div>
              <div className="tp-texto"><strong>{r.nombre || L('Sin nombre', 'Без имени')}</strong><span>{[T(RU_RAZAS, r.raza), T(RU_CLASES, r.clase)].filter(Boolean).join(' · ') || L('Sin raza ni clase', 'Без расы и класса')}</span><span className="nivel">{L('Nivel', 'Уровень')} {r.nivel}</span></div>
            </button>
          ))}
          <button type="button" className="tarjeta-personaje nuevo" onClick={crear} disabled={creando}><span className="mas-grande">+</span><span>{creando ? L('Creando…', 'Создаём…') : L('Nuevo personaje', 'Новый персонаж')}</span></button>
        </div>
      </main>
      <button className="fab" onClick={() => setDados(true)} aria-label={L('Dados', 'Кубики')}><DadoIcono caras={20} size={40} /></button>
      {dados && <Modal titulo={L('Dados', 'Кубики')} onClose={() => setDados(false)}><PanelDados /></Modal>}
      {pedirAlias && <ModalAlias onListo={(a) => { setPedirAlias(false); if (a) onUsuario({ ...usuario, alias: a }); }} />}
    </div>
  );
}
