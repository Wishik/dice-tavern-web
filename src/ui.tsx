import { useEffect, useRef, useState, type ReactNode } from 'react';
import { L, idioma } from './i18n';
import { tr, trN } from './ru';
import { td } from './datosRu';

/** Parte de la pantalla que no tapa el teclado del móvil (visualViewport). */
function useZonaVisible() {
  const leer = () => { const v = window.visualViewport; return v ? { top: v.offsetTop, alto: v.height } : null; };
  const [z, setZ] = useState(leer);
  useEffect(() => {
    const v = window.visualViewport; if (!v) return;
    const f = () => setZ(leer());
    v.addEventListener('resize', f); v.addEventListener('scroll', f);
    return () => { v.removeEventListener('resize', f); v.removeEventListener('scroll', f); };
  }, []);
  return z;
}

export function Modal({ titulo, onClose, children, pie }: { titulo: ReactNode; onClose: () => void; children: ReactNode; pie?: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  const vv = useZonaVisible();
  return (
    <div className="modal-fondo" onClick={onClose} style={vv ? { top: vv.top, height: vv.alto, bottom: 'auto' } : undefined}>
      <div className="modal hoja" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-cabecera"><h3>{trN(titulo)}</h3><button className="cerrar" onClick={onClose} aria-label={tr('Cerrar')}>✕</button></div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}

export function Seccion({ titulo, aviso, children, extra, className = '' }: { titulo: ReactNode; aviso?: number | boolean; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <section className={`tarjeta ${className}`}>
      <div className="cinta"><span>{trN(titulo)}</span>{aviso ? <PuntoRojo n={typeof aviso === 'number' ? aviso : undefined} /> : null}{extra && <span className="cinta-extra">{extra}</span>}</div>
      {children}
    </section>
  );
}

export function PuntoRojo({ n, titulo }: { n?: number; titulo?: string }) {
  return <span className="punto-rojo" title={tr(titulo ?? 'Puedes añadir algo aquí')}>{n && n > 1 ? n : ''}</span>;
}

export function BotonAnadir({ onClick, aviso, children = 'Añadir' }: { onClick: () => void; aviso?: boolean; children?: ReactNode }) {
  return (
    <button className={`btn anadir ${aviso ? 'con-aviso' : ''}`} onClick={onClick}>
      <span className="mas">+</span> {trN(children)}{aviso && <PuntoRojo />}
    </button>
  );
}

type Reconocedor = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const ClaseReconocedor = typeof window !== 'undefined'
  ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Reconocedor) | undefined
  : undefined;
export const dictadoDisponible = !!ClaseReconocedor;

/** Botón de micrófono: escucha en español y entrega cada frase reconocida. */
export function Microfono({ alTexto }: { alTexto: (frase: string) => void }) {
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<Reconocedor | null>(null);
  const cb = useRef(alTexto); cb.current = alTexto;
  useEffect(() => () => rec.current?.stop(), []);
  if (!ClaseReconocedor) return null;
  const alternar = () => {
    if (activo) { rec.current?.stop(); return; }
    const r = new ClaseReconocedor!();
    r.lang = idioma() === 'ru' ? 'ru-RU' : 'es-ES'; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) cb.current(e.results[i][0].transcript.trim());
    };
    r.onend = () => setActivo(false);
    r.onerror = (e) => { setActivo(false); setError(e.error === 'not-allowed' ? L('Permite el micrófono en el navegador.', 'Разреши микрофон в браузере.') : L('No se pudo escuchar.', 'Не удалось распознать речь.')); };
    rec.current = r; setError(''); setActivo(true);
    try { r.start(); } catch { setActivo(false); }
  };
  return (
    <span className="microfono-envoltura">
      <button type="button" className={`microfono ${activo ? 'escuchando' : ''}`} onClick={alternar} aria-label={activo ? L('Parar dictado', 'Остановить диктовку') : L('Dictar por voz', 'Диктовать голосом')} title={activo ? L('Parar', 'Стоп') : L('Dictar por voz', 'Диктовать голосом')}>
        {activo ? '■' : '🎙'}
      </button>
      {error && <small className="error-mic">{error}</small>}
    </span>
  );
}

/** Añade una frase dictada al final de un texto, con espacio o salto de línea. */
export const anadirFrase = (texto: string, frase: string, multilinea: boolean) => {
  if (!frase) return texto;
  const f = frase[0].toUpperCase() + frase.slice(1);
  if (!texto.trim()) return f;
  return texto.replace(/\s+$/, '') + (multilinea ? '\n' : ' ') + f;
};

export function Texto({ valor, set, placeholder, multilinea, filas = 3, className = '', voz }: { valor: string; set: (s: string) => void; placeholder?: string; multilinea?: boolean; filas?: number; className?: string; voz?: boolean }) {
  const actual = useRef(valor); actual.current = valor;
  const conVoz = (voz ?? multilinea) && dictadoDisponible;
  const campo = multilinea
    ? <textarea className={`campo ${className}`} value={valor} placeholder={placeholder && tr(placeholder)} rows={filas} onChange={(e) => set(e.target.value)} />
    : <input className={`campo ${className}`} value={valor} placeholder={placeholder && tr(placeholder)} onChange={(e) => set(e.target.value)} />;
  if (!conVoz) return campo;
  return (
    <div className={`con-voz ${multilinea ? 'multi' : ''}`}>
      {campo}
      <Microfono alTexto={(f) => set(anadirFrase(actual.current, f, !!multilinea))} />
    </div>
  );
}

export function Numero({ valor, set, min, max, className = '', ancho }: { valor: number; set: (n: number) => void; min?: number; max?: number; className?: string; ancho?: number }) {
  const [txt, setTxt] = useState(String(valor ?? 0));
  const foco = useRef(false);
  useEffect(() => { if (!foco.current) setTxt(String(valor ?? 0)); }, [valor]);
  return (
    <input className={`campo numero ${className}`} inputMode="numeric" value={txt} style={ancho ? { width: ancho } : undefined}
      onFocus={(e) => { foco.current = true; e.target.select(); }}
      onBlur={() => { foco.current = false; setTxt(String(valor ?? 0)); }}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n)) set(Math.max(min ?? -99999, Math.min(max ?? 99999, n)));
        else if (e.target.value === '') set(min && min > 0 ? min : 0);
      }} />
  );
}

export function Etiqueta({ texto, children }: { texto: string; children: ReactNode }) {
  return <label className="etiqueta"><span>{tr(texto)}</span>{children}</label>;
}

export function Check({ valor, set, titulo }: { valor: boolean; set: (b: boolean) => void; titulo?: string }) {
  return <button type="button" className={`check ${valor ? 'marcado' : ''}`} title={titulo && tr(titulo)} onClick={() => set(!valor)} aria-pressed={valor} />;
}

export function Buscador<T>({ items, texto, onElegir, placeholder, render, filtro, vacio }: {
  items: T[]; texto: (t: T) => string; onElegir: (t: T | string) => void; placeholder: string; render?: (t: T) => ReactNode; filtro?: (t: T) => boolean; vacio?: string;
}) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(q.trim());
  const res = items.filter((i) => (!filtro || filtro(i)) && (!nq || norm(texto(i)).includes(nq) || norm(td(texto(i))).includes(nq))).slice(0, 60);
  return (
    <div className="buscador">
      <input className="campo" autoFocus value={q} placeholder={tr(placeholder)} onChange={(e) => setQ(e.target.value)} />
      <ul className="resultados">
        {res.map((i, k) => <li key={k}><button onClick={() => onElegir(i)}>{render ? render(i) : td(texto(i))}</button></li>)}
        {q.trim() && !res.some((i) => norm(texto(i)) === nq) && (
          <li><button className="nuevo" onClick={() => onElegir(q.trim())}>➕ {L(`Crear «${q.trim()}» (no está en la base)`, `Создать «${q.trim()}» (нет в базе)`)}</button></li>
        )}
        {!q.trim() && res.length === 0 && <li className="vacio">{tr(vacio ?? 'Nada que mostrar.')}</li>}
      </ul>
    </div>
  );
}

export function ListaDatos({ datos }: { datos: Record<string, string> }) {
  const e = Object.entries(datos).filter(([, v]) => v && v !== '--');
  if (!e.length) return null;
  return <dl className="lista-datos">{e.map(([k, v]) => <div key={k} className="par"><dt>{tr(k)}</dt><dd>{td(v)}</dd></div>)}</dl>;
}

export function TextoLargo({ texto }: { texto: string }) {
  return <div className="texto-largo">{td(texto).split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>;
}

/** Comprime una foto a JPEG de como mucho `lado` px para guardarla dentro del personaje. */
export function comprimirFoto(file: File, lado = 480): Promise<string> {
  return new Promise((ok, mal) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => mal(new Error(L('No se pudo leer la imagen.', 'Не удалось прочитать картинку.')));
    img.src = url;
  });
}
