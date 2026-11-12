import { chipsEfectosCar } from '../efectosCar';
import { setPersonajeActivo } from '../tiradasPartida';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Atributo, Personaje } from '../types';
import { backend } from '../store';
import { useDatos, type Clase, type Conjuro, type Dote, type Razas, type Trasfondo } from '../data';
import { calcularAvisos, manaMaximo, type Avisos } from '../avisos';
import { DadoIcono, PanelDados, useDados } from '../dice';
import { car, conSigno, modificador } from '../rules';
import { Etiqueta, Modal, PuntoRojo } from '../ui';
import { GANAS_MULTICLASE, asignarNivel, clasesDe, cumpleRequisito, fijarClases, textoClases, textoRequisito } from '../multiclase';
import { TabPersonaje } from './TabPersonaje';
import { TabAtributos } from './TabAtributos';
import { TabHabilidades } from './TabHabilidades';
import { TabCombate } from './TabCombate';
import { TabMagia } from './TabMagia';
import { TabRasgos } from './TabRasgos';
import { TabInventario } from './TabInventario';
import { TabNotas } from './TabNotas';
import { TabMonturas } from './TabMonturas';
import { TabMaster } from './TabMaster';
import { ChipsEstados } from '../estados';
import { L, T, RU_ATRIBUTOS, RU_CLASES, RU_RAZAS, } from '../i18n';
import { eleccionesPendientes, sincronizarConjuros } from '../conjurosRasgos';

interface FichaCtx {
  p: Personaje;
  upd: (f: (p: Personaje) => void) => void;
  clases: Clase[] | null;
  razas: Razas | null;
  trasfondos: Trasfondo[] | null;
  dotes: Dote[] | null;
  avisos: Avisos;
  /** Datos de creación bloqueados (personaje en partida). */
  bloqueado: boolean;
  /** El máster tiene abierta la hoja de otro jugador. */
  ajeno?: boolean;
}
const Ctx = createContext<FichaCtx | null>(null);
export const useFicha = () => useContext(Ctx)!;

/** Envuelve campos que no se pueden cambiar durante la partida (raza, clase, características…). si=false lo deja libre. */
export function Bloq({ children, si = true }: { children: React.ReactNode; si?: boolean }) {
  const { bloqueado } = useFicha();
  return <fieldset className="bloq" disabled={bloqueado && si} title={bloqueado && si ? L('Bloqueado durante la partida (lápiz en la lista de personajes para editar)', 'Заблокировано во время игры (карандаш в списке персонажей — чтобы править)') : undefined}>{children}</fieldset>;
}

const TABS_MASTER = [
  { id: 'master', nombre: () => L('Vida y estados', 'Хиты и состояния'), C: TabMaster, aviso: () => 0 },
  { id: 'inventario', nombre: () => L('Inventario', 'Инвентарь'), C: TabInventario, aviso: () => 0 },
] as const;

const TABS = [
  { id: 'personaje', nombre: () => L('Personaje', 'Персонаж'), C: TabPersonaje, aviso: (a: Avisos) => a.total.general },
  { id: 'atributos', nombre: () => L('Atributos', 'Характеристики'), C: TabAtributos, aviso: () => 0 },
  { id: 'habilidades', nombre: () => L('Habilidades', 'Навыки'), C: TabHabilidades, aviso: (a: Avisos) => a.total.habilidades },
  { id: 'combate', nombre: () => L('Combate', 'Бой'), C: TabCombate, aviso: () => 0 },
  { id: 'magia', nombre: () => L('Conjuros', 'Заклинания'), C: TabMagia, aviso: (a: Avisos) => a.total.magia },
  { id: 'rasgos', nombre: () => L('Rasgos y dotes', 'Особенности и черты'), C: TabRasgos, aviso: (a: Avisos) => a.total.rasgos },
  { id: 'inventario', nombre: () => L('Inventario', 'Инвентарь'), C: TabInventario, aviso: () => 0 },
  { id: 'monturas', nombre: () => L('Monturas', 'Скакуны'), C: TabMonturas, aviso: () => 0 },
  { id: 'notas', nombre: () => L('Notas', 'Заметки'), C: TabNotas, aviso: () => 0 },
] as const;

/** volverTexto: texto del botón de volver; ajeno: el máster abre la hoja de otro jugador (no se puede borrar). */
export function Ficha({ id, onVolver, volverTexto, ajeno }: { id: string; onVolver: () => void; volverTexto?: string; ajeno?: boolean }) {
  const [p, setP] = useState<Personaje | null>(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<'guardado' | 'pendiente' | 'guardando' | 'error'>('guardado');
  const [tab, setTab] = useState<string>(() => { try { return localStorage.getItem('dicetavern.tab') || 'personaje'; } catch { return 'personaje'; } });
  const [dados, setDados] = useState(false);
  const clases = useDatos<Clase[]>('clases');
  fijarClases(clases);
  const razas = useDatos<Razas>('razas');
  const trasfondos = useDatos<Trasfondo[]>('trasfondos');
  const dotes = useDatos<Dote[]>('dotes');
  const timer = useRef<number>();
  const ultimo = useRef<Personaje | null>(null);
  /** Cuenta las ediciones locales, para descartar recargas que empezaron antes de una edición. */
  const cambios = useRef(0);
  // Las tiradas de mi propia hoja se apuntan en el historial de mis partidas.
  useEffect(() => { if (ajeno) return; setPersonajeActivo(id); return () => setPersonajeActivo(null); }, [id, ajeno]);

  useEffect(() => { backend.cargar(id).then((x) => x ? setP(x) : setError(L('No se encontró el personaje.', 'Персонаж не найден.'))).catch((e) => setError(e.message)); }, [id]);
  // En partida, el máster (o el jugador) puede cambiar la hoja desde otro dispositivo: se recarga si no hay cambios pendientes.
  const estadoRef = useRef(estado); estadoRef.current = estado;
  useEffect(() => {
    if (backend.modo !== 'nube') return;
    const mirar = async () => {
      if (document.visibilityState !== 'visible' || estadoRef.current !== 'guardado' || ultimo.current) return;
      const gen = cambios.current;
      try {
        const x = await backend.cargar(id);
        // Si se ha tocado algo mientras llegaba la respuesta, esa copia ya es vieja.
        if (x && gen === cambios.current && !ultimo.current && estadoRef.current === 'guardado') setP((prev) => (prev && x.actualizado !== prev.actualizado ? x : prev));
      } catch { /* sin red: se intentará luego */ }
    };
    const t = setInterval(mirar, 4000);
    document.addEventListener('visibilitychange', mirar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', mirar); };
  }, [id]);
  useEffect(() => { try { localStorage.setItem('dicetavern.tab', tab); } catch { /* sin almacenamiento */ } }, [tab]);

  const guardar = useCallback(async () => {
    if (!ultimo.current) return;
    setEstado('guardando');
    const enviado = ultimo.current;
    try { await (ajeno ? backend.guardarMaster(enviado) : backend.guardar(enviado)); if (ultimo.current === enviado) { ultimo.current = null; setEstado('guardado'); } } catch { setEstado('error'); }
  }, [ajeno]);

  const upd = useCallback((f: (p: Personaje) => void) => {
    cambios.current++;
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
    const f = () => { if (ultimo.current) (ajeno ? backend.guardarMaster(ultimo.current) : backend.guardar(ultimo.current)); };
    window.addEventListener('pagehide', f);
    return () => { window.removeEventListener('pagehide', f); clearTimeout(timer.current); f(); };
  }, []);

  const avisos = useMemo(() => {
    if (!p) return null;
    const a = calcularAvisos(p, clases, razas, trasfondos);
    // Conjuros de raza o dote que faltan por elegir.
    const pend = eleccionesPendientes(p, razas).length;
    return pend ? { ...a, conjurosElegir: pend, total: { ...a.total, magia: a.total.magia + pend } } : a;
  }, [p, clases, razas, trasfondos]);

  if (error) return <div className="contenido"><p className="error">{error}</p><button className="btn" onClick={onVolver}>{L('Volver', 'Назад')}</button></div>;
  if (!p || !avisos) return <div className="cargando">{L('Abriendo el cuaderno…', 'Открываю тетрадь…')}</div>;
  const tabs = ajeno ? TABS_MASTER : TABS;
  const Tab = tabs.find((t) => t.id === tab) ?? tabs[0];
  const bloqueado = !ajeno && !!p.bloqueado;

  const borrar = async () => {
    if (!confirm(L(`¿Borrar a ${p.nombre || 'este personaje'} para siempre?`, `Удалить ${p.nombre || 'этого персонажа'} навсегда?`))) return;
    clearTimeout(timer.current); ultimo.current = null;
    await backend.borrar(p.id); onVolver();
  };

  return (
    <Ctx.Provider value={{ p, upd, clases, razas, trasfondos, dotes, avisos, bloqueado, ajeno }}>
      <div className="pantalla-ficha">
        <div className="cabecera-fija">
        <header className="barra">
          <button className="btn enlace volver" onClick={onVolver}>‹ {volverTexto ?? L('Personajes', 'Персонажи')}</button>
          <div className="titulo-ficha">
            <strong>{p.nombre || L('Sin nombre', 'Без имени')}</strong>
            <span>{[T(RU_RAZAS, p.raza), p.clase && textoClases(p)].filter(Boolean).join(' · ')}</span>
          </div>
          {ajeno && <span className="sello-master">👑</span>}
          <span className={`estado-guardado ${estado}`}>{estado === 'guardado' ? L('✓ Guardado', '✓ Сохранено') : estado === 'error' ? L('⚠ Sin guardar', '⚠ Не сохранено') : '…'}</span>
        </header>
        {(p.estados?.length > 0 || p.agotamiento > 0 || p.iniciativaActual !== null || (p.efectosCar?.length ?? 0) > 0) && (
          <div className="franja-estados">
            <ChipsEstados estados={p.estados} agotamiento={p.agotamiento} detalles={p.estadosDetalle} quien={p.nombre} set={(e, a, d) => upd((x) => { x.estados = e; x.agotamiento = a; x.estadosDetalle = d; })} />
            {chipsEfectosCar(p)}
            {p.iniciativaActual !== null && <span className="chip-estado iniciativa">⚔️ {L('Iniciativa', 'Инициатива')} {p.iniciativaActual}</span>}
          </div>
        )}
        <nav className="pestanas">
          {tabs.map((t) => {
            const n = t.aviso(avisos);
            return <button key={t.id} className={Tab.id === t.id ? 'activa' : ''} onClick={() => setTab(t.id)}>{t.nombre()}{n > 0 && <PuntoRojo n={n} />}</button>;
          })}
        </nav>
        </div>
        <main className="contenido"><Tab.C /></main>
        {Tab.id === 'notas' && !ajeno && <div className="pie-borrar"><button className="btn peligro" onClick={borrar}>{L('Borrar personaje', 'Удалить персонажа')}</button></div>}
        <button className="fab" onClick={() => setDados(true)} aria-label={L('Dados', 'Кубики')}><DadoIcono caras={20} size={40} /></button>
        <SubidaNivel />
        <SincronizarMana />
        {!ajeno && <SincronizarConjuros />}
        {dados && <Modal titulo={L('Dados', 'Кубики')} onClose={() => setDados(false)}><PanelDados /></Modal>}
      </div>
    </Ctx.Provider>
  );
}

/** Al subir de nivel hay que tirar el dado de golpe de la clase: lo que salga + CON se suma a los PG máximos. */
function SubidaNivel() {
  const { p, upd, clases } = useFicha();
  const { tirar } = useDados();
  const [clase, setClase] = useState(p.clase);
  const dado = clases?.find((c) => c.nombre === clase)?.atributos.dadoGolpe ?? '';
  if (!p.subidasPendientes || !p.clase) return null;
  const con = modificador(car(p, 'CON'));
  const nivelDe = p.nivel - p.subidasPendientes + 1;
  const mias = clasesDe(p).map((c) => c.clase);
  const nueva = !mias.includes(clase);
  const valor = (a: Atributo) => car(p, a);
  const sinRequisito = nueva && (!cumpleRequisito(clase, valor) || !cumpleRequisito(p.clase, valor));
  return (
    <div className="modal-fondo">
      <div className="modal elegir-modo">
        <h3>{L(`¡Subes a nivel ${nivelDe}!`, `Новый уровень: ${nivelDe}!`)}</h3>
        <Etiqueta texto={L('¿En qué clase subes este nivel?', 'В какой класс идёт этот уровень?')}>
          <select className="campo" value={clase} onChange={(e) => setClase(e.target.value)}>
            {clasesDe(p).map((c) => <option key={c.clase} value={c.clase}>{T(RU_CLASES, c.clase)} {c.clase === p.clase ? `${c.nivel - p.subidasPendientes} → ${c.nivel - p.subidasPendientes + 1}` : `${c.nivel} → ${c.nivel + 1}`}</option>)}
            <optgroup label={L('Nueva clase (multiclase)', 'Новый класс (мультикласс)')}>
              {(clases ?? []).filter((c) => !mias.includes(c.nombre)).map((c) => <option key={c.nombre} value={c.nombre}>{T(RU_CLASES, c.nombre)} 1</option>)}
            </optgroup>
          </select>
        </Etiqueta>
        {nueva && <p className="nota">{L(`Multiclase: ganas ${(GANAS_MULTICLASE[clase]?.[0] ?? '').toLowerCase()} Requisito: ${textoRequisito(p.clase)} (${p.clase}) y ${textoRequisito(clase)} (${clase}).`, `Мультикласс: получаешь ${(GANAS_MULTICLASE[clase]?.[1] ?? '').toLowerCase()} Требование: ${textoRequisito(p.clase)} (${T(RU_CLASES, p.clase)}) и ${textoRequisito(clase)} (${T(RU_CLASES, clase)}).`)}</p>}
        {sinRequisito && <p className="error">⚠ {L('No llegas a 13 en la característica que pide. Pregunta a tu máster.', 'Не хватает 13 в нужной характеристике. Уточни у мастера.')}</p>}
        <p>{L(`Tira tu dado de golpe de ${clase}:`, `Брось кость хитов класса ${T(RU_CLASES, clase)}:`)} <strong>1{dado} +1 {conSigno(con)} {T(RU_ATRIBUTOS, 'CON')}</strong>. {L('El total se suma a tus PG máximos y actuales.', 'Сумма прибавится к максимуму и текущим хитам.')}</p>
        {p.subidasPendientes > 1 && <p className="nota">{L(`Te quedan ${p.subidasPendientes} niveles por tirar.`, `Осталось бросков за уровни: ${p.subidasPendientes}.`)}</p>}
        <div className="fila-botones">
          <button className="btn primario" onClick={() => {
            const t = tirar(L(`PG al subir a nivel ${nivelDe}`, `Хиты за уровень ${nivelDe}`), `1${dado}+1${conSigno(con)}`);
            if (!t) return;
            const gana = Math.max(1, t.total); // ya incluye +1 y CON
            upd((x) => { x.pg.max += gana; x.pg.actual += gana; x.subidasPendientes = Math.max(0, x.subidasPendientes - 1); asignarNivel(x, clase); });
            setClase(p.clase);
          }} disabled={!dado}>🎲 {L('Tirar', 'Бросить')} 1{dado}</button>
        </div>
      </div>
    </div>
  );
}

/** El maná máximo sale de la clase y el nivel: si cambia, se ajusta solo (y lo ganado se suma al actual). */
function SincronizarMana() {
  const { p, upd, clases } = useFicha();
  const max = clases ? manaMaximo(p, clases) : p.pm.max;
  useEffect(() => {
    if (!clases || max === p.pm.max) return;
    upd((x) => { const d = max - x.pm.max; x.pm.max = max; x.pm.actual = Math.max(0, Math.min(max, x.pm.actual + Math.max(0, d))); });
  }, [max, p.pm.max, clases, upd]);
  return null;
}

/** Añade (o quita) solos los conjuros que dan los rasgos de raza y las dotes. */
function SincronizarConjuros() {
  const { p, upd, razas } = useFicha();
  const todos = useDatos<Conjuro[]>('spells');
  useEffect(() => {
    if (!razas || !todos) return;
    const prueba = structuredClone(p);
    if (sincronizarConjuros(prueba, razas, todos)) upd((x) => { sincronizarConjuros(x, razas, todos); });
  }, [p, razas, todos, upd]);
  return null;
}
