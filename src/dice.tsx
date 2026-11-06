import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { conSigno, parseFormula } from './rules';

export type Modo = 'normal' | 'ventaja' | 'desventaja';
export interface Tirada {
  id: number;
  etiqueta: string;
  formula: string;
  dados: { caras: number; valor: number; descartado?: boolean }[];
  mod: number;
  total: number;
  modo: Modo;
  critico?: 'exito' | 'fallo';
  hora: number;
}

interface Ctx {
  tirar: (etiqueta: string, formula: string, modo?: Modo) => Tirada | null;
  /** `avisos`: motivos de ventaja/desventaja que se muestran antes de tirar. */
  tirarD20: (etiqueta: string, mod: number, avisos?: string[]) => void;
  historial: Tirada[];
  limpiar: () => void;
}
const DiceCtx = createContext<Ctx | null>(null);
export const useDados = () => useContext(DiceCtx)!;

const d = (caras: number) => 1 + Math.floor(Math.random() * caras);
let contador = 0;

export function DiceProvider({ children }: { children: ReactNode }) {
  const [historial, setHistorial] = useState<Tirada[]>([]);
  const [actual, setActual] = useState<Tirada | null>(null);
  const [pendiente, setPendiente] = useState<{ etiqueta: string; mod: number; avisos: string[] } | null>(null);

  const tirar = useCallback((etiqueta: string, formula: string, modo: Modo = 'normal') => {
    const f = parseFormula(formula);
    if (!f) return null;
    const dados: Tirada['dados'] = [];
    for (const g of f.dados) {
      const n = Math.abs(g.n);
      if (g.caras === 20 && n === 1 && modo !== 'normal') {
        const a = d(20), b = d(20);
        const keepA = modo === 'ventaja' ? a >= b : a <= b;
        dados.push({ caras: 20, valor: a, descartado: !keepA }, { caras: 20, valor: b, descartado: keepA });
      } else for (let i = 0; i < n; i++) dados.push({ caras: g.caras, valor: d(g.caras) * Math.sign(g.n) });
    }
    const total = dados.filter((x) => !x.descartado).reduce((s, x) => s + x.valor, 0) + f.mod;
    const d20 = dados.find((x) => x.caras === 20 && !x.descartado);
    const t: Tirada = { id: ++contador, etiqueta, formula, dados, mod: f.mod, total, modo, hora: Date.now(),
      critico: d20 && f.dados.length === 1 ? (d20.valor === 20 ? 'exito' : d20.valor === 1 ? 'fallo' : undefined) : undefined };
    setHistorial((h) => [t, ...h].slice(0, 50));
    setActual(t);
    return t;
  }, []);

  const tirarD20 = useCallback((etiqueta: string, mod: number, avisos: string[] = []) => setPendiente({ etiqueta, mod, avisos }), []);

  return (
    <DiceCtx.Provider value={{ tirar, tirarD20, historial, limpiar: () => setHistorial([]) }}>
      {children}
      {pendiente && (
        <div className="modal-fondo" onClick={() => setPendiente(null)}>
          <div className="modal elegir-modo" onClick={(e) => e.stopPropagation()}>
            <h3>{pendiente.etiqueta}</h3>
            <p className="formula-grande">1d20 {conSigno(pendiente.mod)}</p>
            {pendiente.avisos.map((a, i) => <p key={i} className="aviso-tirada">⚠️ {a}</p>)}
            <div className="fila-botones">
              {(['desventaja', 'normal', 'ventaja'] as Modo[]).map((m) => (
                <button key={m} className={`${m === 'normal' ? 'btn primario' : 'btn'}${m !== 'normal' && pendiente.avisos.some((a) => a.toLowerCase().startsWith(m)) ? ' sugerido' : ''}`}
                  onClick={() => { tirar(pendiente.etiqueta, `1d20${conSigno(pendiente.mod)}`, m); setPendiente(null); }}>
                  {m === 'normal' ? 'Tirar' : m === 'ventaja' ? 'Ventaja' : 'Desventaja'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {actual && <ResultadoTirada t={actual} onClose={() => setActual(null)} />}
    </DiceCtx.Provider>
  );
}

function ResultadoTirada({ t, onClose }: { t: Tirada; onClose: () => void }) {
  const [rodando, setRodando] = useState(true);
  const [mostrado, setMostrado] = useState(0);
  const timer = useRef<number>();
  useEffect(() => {
    setRodando(true);
    const max = Math.max(...t.dados.map((x) => x.caras), 6);
    const iv = window.setInterval(() => setMostrado(d(max)), 55);
    timer.current = window.setTimeout(() => { clearInterval(iv); setRodando(false); }, 650);
    return () => { clearInterval(iv); clearTimeout(timer.current); };
  }, [t]);
  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className={`modal resultado ${!rodando && t.critico ? 'critico-' + t.critico : ''}`} onClick={onClose}>
        <div className="resultado-etiqueta">{t.etiqueta}</div>
        <div className={`dado-grande ${rodando ? 'rodando' : ''}`}><span>{rodando ? mostrado : t.total}</span></div>
        {!rodando && (
          <>
            <div className="desglose">
              {t.dados.map((x, i) => <span key={i} className={`chip-dado ${x.descartado ? 'descartado' : ''}`}>d{x.caras}: {x.valor}</span>)}
              {t.mod !== 0 && <span className="chip-dado mod">{conSigno(t.mod)}</span>}
            </div>
            {t.modo !== 'normal' && <div className="nota">{t.modo === 'ventaja' ? 'Con ventaja' : 'Con desventaja'}</div>}
            {t.critico === 'exito' && <div className="critico-texto">¡CRÍTICO!</div>}
            {t.critico === 'fallo' && <div className="critico-texto">Pifia…</div>}
          </>
        )}
        <div className="nota pequena">Toca para cerrar</div>
      </div>
    </div>
  );
}

const CARAS = [4, 6, 8, 10, 12, 20, 100];
export function PanelDados() {
  const { tirar, historial, limpiar } = useDados();
  const [cant, setCant] = useState(1);
  const [mod, setMod] = useState(0);
  const [modo, setModo] = useState<Modo>('normal');
  return (
    <div className="panel-dados">
      <div className="tarjeta">
        <h2 className="titulo-seccion">Mesa de dados</h2>
        <div className="rejilla-dados">
          {CARAS.map((c) => (
            <button key={c} className="boton-dado" onClick={() => tirar(`${cant}d${c}${mod ? conSigno(mod) : ''}`, `${cant}d${c}${mod ? conSigno(mod) : ''}`, c === 20 && cant === 1 ? modo : 'normal')}>
              <DadoIcono caras={c} /><span>d{c}</span>
            </button>
          ))}
        </div>
        <div className="fila-controles">
          <label>Cantidad <Contador valor={cant} set={setCant} min={1} max={20} /></label>
          <label>Modificador <Contador valor={mod} set={setMod} min={-20} max={20} signo /></label>
        </div>
        <div className="segmentado">
          {(['desventaja', 'normal', 'ventaja'] as Modo[]).map((m) => (
            <button key={m} className={modo === m ? 'activo' : ''} onClick={() => setModo(m)}>{m === 'normal' ? 'Normal' : m === 'ventaja' ? 'Ventaja' : 'Desventaja'}</button>
          ))}
        </div>
        <p className="nota pequena">Ventaja y desventaja se aplican a 1d20.</p>
      </div>
      <div className="tarjeta">
        <div className="cabecera-fila"><h3>Historial</h3>{historial.length > 0 && <button className="btn enlace" onClick={limpiar}>Borrar</button>}</div>
        {historial.length === 0 && <p className="vacio">Aún no has tirado nada.</p>}
        <ul className="historial">
          {historial.map((t) => (
            <li key={t.id}><span className="h-etiqueta">{t.etiqueta}</span><span className="h-detalle">{t.dados.filter((x) => !x.descartado).map((x) => x.valor).join(' + ')}{t.mod ? ` ${conSigno(t.mod)}` : ''}</span><strong className={t.critico ? 'crit-' + t.critico : ''}>{t.total}</strong></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Contador({ valor, set, min = -999, max = 999, signo }: { valor: number; set: (n: number) => void; min?: number; max?: number; signo?: boolean }) {
  return (
    <span className="contador">
      <button type="button" onClick={() => set(Math.max(min, valor - 1))}>−</button>
      <span>{signo ? conSigno(valor) : valor}</span>
      <button type="button" onClick={() => set(Math.min(max, valor + 1))}>+</button>
    </span>
  );
}

export function DadoIcono({ caras, size = 34 }: { caras: number; size?: number }) {
  const formas: Record<number, string> = {
    4: '32,6 60,56 4,56', 6: '8,8 56,8 56,56 8,56', 8: '32,3 60,32 32,61 4,32', 10: '32,3 60,26 32,61 4,26',
    12: '32,3 58,20 50,54 14,54 6,20', 20: '32,3 58,18 58,46 32,61 6,46 6,18', 100: '32,3 60,26 32,61 4,26',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <polygon points={formas[caras]} className="dado-forma" />
      <text x="32" y={caras === 4 ? 46 : 38} textAnchor="middle" className="dado-num">{caras === 100 ? '%' : caras}</text>
    </svg>
  );
}
