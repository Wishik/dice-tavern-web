import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Modal({ titulo, onClose, children, pie }: { titulo: ReactNode; onClose: () => void; children: ReactNode; pie?: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal hoja" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-cabecera"><h3>{titulo}</h3><button className="cerrar" onClick={onClose} aria-label="Cerrar">✕</button></div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}

export function Seccion({ titulo, aviso, children, extra, className = '' }: { titulo: ReactNode; aviso?: number | boolean; children: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <section className={`tarjeta ${className}`}>
      <div className="cinta"><span>{titulo}</span>{aviso ? <PuntoRojo n={typeof aviso === 'number' ? aviso : undefined} /> : null}{extra && <span className="cinta-extra">{extra}</span>}</div>
      {children}
    </section>
  );
}

export function PuntoRojo({ n, titulo }: { n?: number; titulo?: string }) {
  return <span className="punto-rojo" title={titulo ?? 'Puedes añadir algo aquí'}>{n && n > 1 ? n : ''}</span>;
}

export function BotonAnadir({ onClick, aviso, children = 'Añadir' }: { onClick: () => void; aviso?: boolean; children?: ReactNode }) {
  return (
    <button className={`btn anadir ${aviso ? 'con-aviso' : ''}`} onClick={onClick}>
      <span className="mas">+</span> {children}{aviso && <PuntoRojo />}
    </button>
  );
}

export function Texto({ valor, set, placeholder, multilinea, filas = 3, className = '' }: { valor: string; set: (s: string) => void; placeholder?: string; multilinea?: boolean; filas?: number; className?: string }) {
  return multilinea
    ? <textarea className={`campo ${className}`} value={valor} placeholder={placeholder} rows={filas} onChange={(e) => set(e.target.value)} />
    : <input className={`campo ${className}`} value={valor} placeholder={placeholder} onChange={(e) => set(e.target.value)} />;
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
  return <label className="etiqueta"><span>{texto}</span>{children}</label>;
}

export function Check({ valor, set, titulo }: { valor: boolean; set: (b: boolean) => void; titulo?: string }) {
  return <button type="button" className={`check ${valor ? 'marcado' : ''}`} title={titulo} onClick={() => set(!valor)} aria-pressed={valor} />;
}

export function Buscador<T>({ items, texto, onElegir, placeholder, render, filtro, vacio }: {
  items: T[]; texto: (t: T) => string; onElegir: (t: T | string) => void; placeholder: string; render?: (t: T) => ReactNode; filtro?: (t: T) => boolean; vacio?: string;
}) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(q.trim());
  const res = items.filter((i) => (!filtro || filtro(i)) && (!nq || norm(texto(i)).includes(nq))).slice(0, 60);
  return (
    <div className="buscador">
      <input className="campo" autoFocus value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} />
      <ul className="resultados">
        {res.map((i, k) => <li key={k}><button onClick={() => onElegir(i)}>{render ? render(i) : texto(i)}</button></li>)}
        {q.trim() && !res.some((i) => norm(texto(i)) === nq) && (
          <li><button className="nuevo" onClick={() => onElegir(q.trim())}>➕ Crear «{q.trim()}» (no está en la base)</button></li>
        )}
        {!q.trim() && res.length === 0 && <li className="vacio">{vacio ?? 'Nada que mostrar.'}</li>}
      </ul>
    </div>
  );
}

export function ListaDatos({ datos }: { datos: Record<string, string> }) {
  const e = Object.entries(datos).filter(([, v]) => v && v !== '--');
  if (!e.length) return null;
  return <dl className="lista-datos">{e.map(([k, v]) => <div key={k} className="par"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

export function TextoLargo({ texto }: { texto: string }) {
  return <div className="texto-largo">{texto.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>;
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
    img.onerror = () => mal(new Error('No se pudo leer la imagen.'));
    img.src = url;
  });
}
