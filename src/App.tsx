import { useEffect, useState } from 'react';
import { backend, supabase, type Resumen, type Usuario } from './store';
import { nuevoPersonaje } from './personaje';
import { DiceProvider, PanelDados, DadoIcono } from './dice';
import { Ficha } from './views/Ficha';
import { Modal } from './ui';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<string | null>(() => new URLSearchParams(location.search).get('p'));

  useEffect(() => {
    backend.usuario().then(setUsuario).catch(() => setUsuario(null));
    const sub = supabase?.auth.onAuthStateChange(() => backend.usuario().then(setUsuario));
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const url = new URL(location.href);
    if (abierto) url.searchParams.set('p', abierto); else url.searchParams.delete('p');
    history.replaceState(null, '', url);
  }, [abierto]);

  if (usuario === undefined) return <div className="cargando">Cargando la taberna…</div>;
  return (
    <DiceProvider>
      {!usuario ? <Entrada onOk={setUsuario} /> : abierto
        ? <Ficha id={abierto} onVolver={() => setAbierto(null)} />
        : <Lista usuario={usuario} onAbrir={setAbierto} onSalir={async () => { await backend.salir(); setUsuario(null); }} />}
    </DiceProvider>
  );
}

function Entrada({ onOk }: { onOk: (u: Usuario) => void }) {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [msg, setMsg] = useState<{ t: 'error' | 'ok'; s: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setOcupado(true); setMsg(null);
    try {
      if (modo === 'registro') {
        const r = await backend.registrar(email.trim(), clave);
        if (r === 'confirmar') { setMsg({ t: 'ok', s: 'Te hemos enviado un correo. Confírmalo y luego inicia sesión.' }); setModo('entrar'); return; }
      } else await backend.entrar(email.trim(), clave);
      const u = await backend.usuario(); if (u) onOk(u);
    } catch (err) { setMsg({ t: 'error', s: (err as Error).message }); } finally { setOcupado(false); }
  };
  return (
    <div className="pantalla-entrada">
      <div className="logo"><DadoIcono caras={20} size={72} /><h1>Dice Tavern</h1><p>Tu hoja de personaje y tus dados, sin cuaderno.</p></div>
      <form className="tarjeta formulario" onSubmit={enviar}>
        <div className="segmentado">
          <button type="button" className={modo === 'entrar' ? 'activo' : ''} onClick={() => setModo('entrar')}>Entrar</button>
          <button type="button" className={modo === 'registro' ? 'activo' : ''} onClick={() => setModo('registro')}>Crear cuenta</button>
        </div>
        <label className="etiqueta"><span>Correo</span><input className="campo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="etiqueta"><span>Contraseña</span><input className="campo" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={6} value={clave} onChange={(e) => setClave(e.target.value)} /></label>
        {msg && <p className={msg.t === 'error' ? 'error' : 'exito'}>{msg.s}</p>}
        <button className="btn primario grande" disabled={ocupado}>{ocupado ? '…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
    </div>
  );
}

function Lista({ usuario, onAbrir, onSalir }: { usuario: Usuario; onAbrir: (id: string) => void; onSalir: () => void }) {
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [error, setError] = useState('');
  const [dados, setDados] = useState(false);
  const recargar = () => backend.listar().then(setLista).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);
  const [creando, setCreando] = useState(false);
  const crear = async () => {
    if (creando) return;
    setCreando(true); setError('');
    try {
      const p = nuevoPersonaje('Nuevo personaje');
      await backend.guardar(p); onAbrir(p.id);
    } catch (e) {
      setError(`No se pudo crear el personaje: ${(e as Error).message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setCreando(false); }
  };
  return (
    <div className="pantalla-lista">
      <header className="barra">
        <div className="marca"><DadoIcono caras={20} size={30} /><span>Dice Tavern</span></div>
        <div className="barra-derecha">
          <span className="usuario">{usuario.email}</span>
          {backend.modo === 'nube' && <button className="btn enlace" onClick={onSalir}>Salir</button>}
        </div>
      </header>
      <main className="contenido">
        {backend.modo === 'local' && <p className="aviso-local">Modo local: los personajes se guardan solo en este navegador.</p>}
        <h2 className="titulo-seccion">Tus personajes</h2>
        {error && <p className="error">{error}</p>}
        {!lista && !error && <p className="vacio">Cargando…</p>}
        <div className="rejilla-personajes">
          {lista?.map((r) => (
            <button key={r.id} className="tarjeta-personaje" onClick={() => onAbrir(r.id)}>
              <div className="retrato">{r.foto ? <img src={r.foto} alt="" /> : <span>{(r.nombre || '?')[0]}</span>}</div>
              <div className="tp-texto"><strong>{r.nombre || 'Sin nombre'}</strong><span>{[r.raza, r.clase].filter(Boolean).join(' · ') || 'Sin raza ni clase'}</span><span className="nivel">Nivel {r.nivel}</span></div>
            </button>
          ))}
          <button type="button" className="tarjeta-personaje nuevo" onClick={crear} disabled={creando}><span className="mas-grande">+</span><span>{creando ? 'Creando…' : 'Nuevo personaje'}</span></button>
        </div>
      </main>
      <button className="fab" onClick={() => setDados(true)} aria-label="Dados"><DadoIcono caras={20} size={40} /></button>
      {dados && <Modal titulo="Dados" onClose={() => setDados(false)}><PanelDados /></Modal>}
    </div>
  );
}
