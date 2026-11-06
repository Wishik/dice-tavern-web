import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Personaje } from '../types';
import { backend } from '../store';
import { useDatos, type Clase, type Dote, type Razas, type Trasfondo } from '../data';
import { calcularAvisos, type Avisos } from '../avisos';
import { DadoIcono, PanelDados } from '../dice';
import { Modal, PuntoRojo } from '../ui';
import { TabPersonaje } from './TabPersonaje';
import { TabAtributos } from './TabAtributos';
import { TabHabilidades } from './TabHabilidades';
import { TabCombate } from './TabCombate';
import { TabMagia } from './TabMagia';
import { TabRasgos } from './TabRasgos';
import { TabInventario } from './TabInventario';
import { TabNotas } from './TabNotas';

interface FichaCtx {
  p: Personaje;
  upd: (f: (p: Personaje) => void) => void;
  clases: Clase[] | null;
  razas: Razas | null;
  trasfondos: Trasfondo[] | null;
  dotes: Dote[] | null;
  avisos: Avisos;
}
const Ctx = createContext<FichaCtx | null>(null);
export const useFicha = () => useContext(Ctx)!;

const TABS = [
  { id: 'personaje', nombre: 'Personaje', C: TabPersonaje, aviso: (a: Avisos) => a.total.general },
  { id: 'atributos', nombre: 'Atributos', C: TabAtributos, aviso: () => 0 },
  { id: 'habilidades', nombre: 'Habilidades', C: TabHabilidades, aviso: (a: Avisos) => a.total.habilidades },
  { id: 'combate', nombre: 'Combate', C: TabCombate, aviso: () => 0 },
  { id: 'magia', nombre: 'Conjuros', C: TabMagia, aviso: (a: Avisos) => a.total.magia },
  { id: 'rasgos', nombre: 'Rasgos y dotes', C: TabRasgos, aviso: (a: Avisos) => a.total.rasgos },
  { id: 'inventario', nombre: 'Inventario', C: TabInventario, aviso: () => 0 },
  { id: 'notas', nombre: 'Notas', C: TabNotas, aviso: () => 0 },
] as const;

export function Ficha({ id, onVolver }: { id: string; onVolver: () => void }) {
  const [p, setP] = useState<Personaje | null>(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<'guardado' | 'pendiente' | 'guardando' | 'error'>('guardado');
  const [tab, setTab] = useState<string>(() => { try { return localStorage.getItem('dicetavern.tab') || 'personaje'; } catch { return 'personaje'; } });
  const [dados, setDados] = useState(false);
  const clases = useDatos<Clase[]>('clases');
  const razas = useDatos<Razas>('razas');
  const trasfondos = useDatos<Trasfondo[]>('trasfondos');
  const dotes = useDatos<Dote[]>('dotes');
  const timer = useRef<number>();
  const ultimo = useRef<Personaje | null>(null);

  useEffect(() => { backend.cargar(id).then((x) => x ? setP(x) : setError('No se encontró el personaje.')).catch((e) => setError(e.message)); }, [id]);
  useEffect(() => { try { localStorage.setItem('dicetavern.tab', tab); } catch { /* sin almacenamiento */ } }, [tab]);

  const guardar = useCallback(async () => {
    if (!ultimo.current) return;
    setEstado('guardando');
    try { await backend.guardar(ultimo.current); setEstado('guardado'); } catch { setEstado('error'); }
  }, []);

  const upd = useCallback((f: (p: Personaje) => void) => {
    setP((prev) => {
      if (!prev) return prev;
      const n = structuredClone(prev);
      f(n);
      n.actualizado = new Date().toISOString();
      ultimo.current = n;
      return n;
    });
    setEstado('pendiente');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(guardar, 700);
  }, [guardar]);

  useEffect(() => {
    const f = () => { if (ultimo.current) backend.guardar(ultimo.current); };
    window.addEventListener('pagehide', f);
    return () => { window.removeEventListener('pagehide', f); clearTimeout(timer.current); f(); };
  }, []);

  const avisos = useMemo(() => p ? calcularAvisos(p, clases, razas, trasfondos) : null, [p, clases, razas, trasfondos]);

  if (error) return <div className="contenido"><p className="error">{error}</p><button className="btn" onClick={onVolver}>Volver</button></div>;
  if (!p || !avisos) return <div className="cargando">Abriendo el cuaderno…</div>;
  const T = TABS.find((t) => t.id === tab) ?? TABS[0];

  const borrar = async () => {
    if (!confirm(`¿Borrar a ${p.nombre || 'este personaje'} para siempre?`)) return;
    clearTimeout(timer.current); ultimo.current = null;
    await backend.borrar(p.id); onVolver();
  };

  return (
    <Ctx.Provider value={{ p, upd, clases, razas, trasfondos, dotes, avisos }}>
      <div className="pantalla-ficha">
        <div className="cabecera-fija">
        <header className="barra">
          <button className="btn enlace volver" onClick={onVolver}>‹ Personajes</button>
          <div className="titulo-ficha">
            <strong>{p.nombre || 'Sin nombre'}</strong>
            <span>{[p.raza, p.clase && `${p.clase} ${p.nivel}`].filter(Boolean).join(' · ')}</span>
          </div>
          <span className={`estado-guardado ${estado}`}>{estado === 'guardado' ? '✓ Guardado' : estado === 'error' ? '⚠ Sin guardar' : '…'}</span>
        </header>
        <nav className="pestanas">
          {TABS.map((t) => {
            const n = t.aviso(avisos);
            return <button key={t.id} className={tab === t.id ? 'activa' : ''} onClick={() => setTab(t.id)}>{t.nombre}{n > 0 && <PuntoRojo n={n} />}</button>;
          })}
        </nav>
        </div>
        <main className="contenido"><T.C /></main>
        {T.id === 'notas' && <div className="pie-borrar"><button className="btn peligro" onClick={borrar}>Borrar personaje</button></div>}
        <button className="fab" onClick={() => setDados(true)} aria-label="Dados"><DadoIcono caras={20} size={40} /></button>
        {dados && <Modal titulo="Dados" onClose={() => setDados(false)}><PanelDados /></Modal>}
      </div>
    </Ctx.Provider>
  );
}
