import { useEffect, useMemo, useRef, useState } from 'react';
import { useDatos } from '../data';
import { L, idioma } from '../i18n';
import { Modal, Numero } from '../ui';
import { ChipsEstados, estadosPorVida, muereAhora, pasarRonda } from '../estados';
import { escucharTiradas, useDados } from '../dice';
import { detalleTirada } from '../tiradasPartida';
import { HistorialTiradas } from './Historial';
import { HABILIDADES } from '../rules';
import { AvisoCriaturaRecibida, BibliotecaCriaturas } from './CriaturasPropias';
import { cambiarJugador, guardarCombate, type Combate as CombateT, type CombateUno, type TiradaMaster, type Enemigo, type Miembro, type Partida } from '../partidas';

export interface Monstruo {
  id: string; en: string; es: string; ru: string; tam: [string, string]; tipo: [string, string];
  ca: number; pg: number; dg: string; vel: Record<string, string>; car: number[]; vd: number; px: number; bc: number;
  sentidos: Record<string, string | number>; idiomas: string; res: string[]; inm: string[]; vul: string[]; inmEst: string[];
  rasgos: Accion[]; acciones: Accion[]; adicionales: Accion[]; reacciones: Accion[]; legendarias: Accion[];
  /** Ataques y efectos con tirada: bono de ataque o CD de salvación, y dados de daño (el primero es el normal). */
  atq?: { es: string; ru: string; bono?: number; cd?: number; sal?: number | null; dano: { d: string; t: [string, string] }[] }[];
  /** Solo en criaturas propias: bono de salvación por característica (null = sin competencia) y habilidades. */
  salv?: (number | null)[]; hab?: { id: string; v: number }[];
  /** Creada por el máster para esta partida. */
  propia?: boolean;
}

/** Botones para tirar el ataque y el daño de un monstruo directamente desde el combate. */
function AtaquesMonstruo({ m, quien }: { m: Monstruo; quien: string }) {
  const { tirar, tirarD20 } = useDados();
  const ru = idioma() === 'ru';
  if (!m.atq?.length) return null;
  return (
    <div className="ataques-monstruo">
      {m.atq.map((a, i) => {
        const nombre = ru ? a.ru : a.es;
        return (
          <div key={i} className="ataque-m">
            {a.bono !== undefined
              ? <button className="btn pequeno atq" onClick={() => tirarD20(`${quien}: ${nombre}`, a.bono!)}>🎯 {nombre} <strong>{signo(a.bono)}</strong></button>
              : <span className="atq-cd">✨ {nombre} · {L('CD', 'Сл')} {a.cd}{a.sal != null ? ` ${ATR()[a.sal]}` : ''}</span>}
            {a.dano.map((d, j) => (
              <button key={j} className={`btn pequeno dano ${j > 0 ? 'extra' : ''}`} title={j > 0 ? L('Daño adicional (según la descripción)', 'Доп. урон (см. описание)') : undefined}
                onClick={() => tirar(`${quien}: ${nombre} — ${L('daño', 'урон')}`, d.d)}>💥 {d.d} <small>{ru ? d.t[1] : d.t[0]}</small></button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
interface Accion { n: string; d: string }

const mod = (v: number) => Math.floor((v - 10) / 2);
const signo = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const nombreM = (m: Monstruo) => (idioma() === 'ru' ? m.ru : m.es);
const uid = () => Math.random().toString(36).slice(2, 10);
const d20 = () => 1 + Math.floor(Math.random() * 20);
const vdTexto = (v: number) => (v === 0.125 ? '1/8' : v === 0.25 ? '1/4' : v === 0.5 ? '1/2' : String(v));

const VEL: Record<string, [string, string]> = { walk: ['', ''], fly: ['volando', 'полёт'], swim: ['nadando', 'плавание'], climb: ['trepando', 'лазание'], burrow: ['excavando', 'копание'], hover: ['flota', 'парит'] };
const SENT: Record<string, [string, string]> = { darkvision: ['Visión en la oscuridad', 'Тёмное зрение'], blindsight: ['Vista ciega', 'Слепое зрение'], truesight: ['Visión verdadera', 'Истинное зрение'], tremorsense: ['Sentido de la vibración', 'Чувство вибрации'], passive_perception: ['Percepción pasiva', 'Пассивная внимательность'] };
const pies = (s: string | number) => String(s).replace(/ ?ft\.?/g, idioma() === 'ru' ? ' фт' : ' pies');
const ATR = () => (idioma() === 'ru' ? ['СИЛ', 'ЛОВ', 'ТЕЛ', 'ИНТ', 'МДР', 'ХАР'] : ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']);

// Último estado del combate de cada partida en esta sesión (la partida se recarga cada poco y podría traer uno viejo).
const cacheCombate = new Map<string, CombateT>();

/** Fila del orden de iniciativa: un jugador o un grupo de enemigos. */
type Fila = { tipo: 'pj'; clave: string; ini: number | null; m: Miembro } | { tipo: 'grupo'; clave: string; ini: number | null; enemigos: Enemigo[] };
/** Sin iniciativa (o 0) = no está en el combate. */
const enCombate = (ini: number | null) => ini !== null && ini !== 0;

/** Tiradas del máster en el combate de esta partida (las de los enemigos), lo más reciente primero. */
export const tiradasDelCombate = (partida: Partida) => (cacheCombate.get(partida.id) ?? partida.combate)?.tiradas ?? [];

const PRINCIPAL = 'principal';
/** Colores de bando (sin nombres: cada uno decide qué significa). */
export const COLORES = [
  { id: 'rojo', es: 'rojo', ru: 'красный', color: '#c0392b' },
  { id: 'naranja', es: 'naranja', ru: 'оранжевый', color: '#e67e22' },
  { id: 'amarillo', es: 'amarillo', ru: 'жёлтый', color: '#d4a20f' },
  { id: 'verde', es: 'verde', ru: 'зелёный', color: '#3f9a43' },
  { id: 'turquesa', es: 'turquesa', ru: 'бирюзовый', color: '#169a8c' },
  { id: 'azul', es: 'azul', ru: 'синий', color: '#2f6fb0' },
  { id: 'morado', es: 'morado', ru: 'фиолетовый', color: '#8344b0' },
  { id: 'rosa', es: 'rosa', ru: 'розовый', color: '#d24f8e' },
  { id: 'gris', es: 'gris', ru: 'серый', color: '#6f7b80' },
];
// Bandos de antes (con nombre) → su color.
const ANTIGUOS: Record<string, string> = { aliado: 'verde', A: 'rojo', B: 'naranja', C: 'morado', D: 'azul' };
const COLOR_CRIATURA = 'rojo';
const COLOR_JUGADOR = 'verde';
export const colorDe = (id: string | undefined, def = COLOR_CRIATURA) => { const x = ANTIGUOS[id ?? ''] ?? id ?? def; return COLORES.find((c) => c.id === x) ?? COLORES.find((c) => c.id === def)!; };
const estiloColor = (id: string) => ({ ['--c' as string]: colorDe(id).color });

/** Elegir color tocando una de las 9 muestras. */
function SelectorColor({ valor, set }: { valor: string; set: (c: string) => void }) {
  const v = colorDe(valor).id;
  return (
    <div className="selector-color" role="radiogroup" aria-label={L('Color', 'Цвет')}>
      {COLORES.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={v === c.id} aria-label={L(c.es, c.ru)} title={L(c.es, c.ru)} className={v === c.id ? 'activo' : ''} style={{ ['--c' as string]: c.color }} onClick={() => set(c.id)} />
      ))}
    </div>
  );
}
/** Punto de color que al tocarlo abre las 9 muestras. */
function ChipColor({ valor, set }: { valor: string; set: (c: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <span className="chip-color">
      <button type="button" className="punto-color" style={estiloColor(valor)} aria-label={L(`Color: ${colorDe(valor).es}. Cambiar`, `Цвет: ${colorDe(valor).ru}. Изменить`)} onClick={() => setAbierto(!abierto)} />
      {abierto && <span className="paleta-flotante"><SelectorColor valor={valor} set={(c) => { set(c); setAbierto(false); }} /></span>}
    </span>
  );
}
const aLista = (c: CombateT): CombateUno[] => [{ id: PRINCIPAL, nombre: c.nombre, ronda: c.ronda, turno: c.turno, enemigos: c.enemigos, pjs: c.pjs, desde: c.desde, colores: c.colores }, ...(c.otros ?? [])];
const deLista = (l: CombateUno[], base: CombateT): CombateT => ({ ...base, ronda: l[0].ronda, turno: l[0].turno, enemigos: l[0].enemigos, nombre: l[0].nombre, pjs: l[0].pjs, desde: l[0].desde, colores: l[0].colores, otros: l.slice(1) });
/** En qué combate está un jugador (solo si el máster lo ha añadido). */
const combateDe = (l: CombateUno[], pj: string) => l.find((k) => k.pjs?.includes(pj))?.id ?? null;

/** Combates del máster (uno o varios a la vez, uno al lado de otro). */
export function PanelCombate({ partida, miembros, onRecargar, onAbrirPj }: { partida: Partida; miembros: Miembro[]; onRecargar: () => void; onAbrirPj?: (pj: string) => void }) {
  const monstruos = useDatos<Monstruo[]>('monstruos');
  const [c, setC] = useState<CombateT>(() => cacheCombate.get(partida.id) ?? partida.combate ?? { ronda: 1, turno: null, enemigos: [] });
  useEffect(() => { cacheCombate.set(partida.id, c); }, [c, partida.id]);
  const [error, setError] = useState('');
  const primera = useRef(true);
  // Se guarda en la partida un momento después de cada cambio (solo el máster escribe aquí).
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => guardarCombate(partida.id, c).then(() => setError('')).catch((e) => setError(e.message)), 600);
    return () => clearTimeout(t);
  }, [c, partida.id]);
  // Las tiradas que hace el máster aquí (ataques y daño de los enemigos…) van al historial de la partida.
  const verRef = useRef(PRINCIPAL);
  useEffect(() => escucharTiradas((t) => setC((x) => ({ ...x, tiradas: [{ id: uid(), combate: verRef.current, quien: L('Máster', 'Мастер'), etiqueta: t.etiqueta, formula: t.formula, total: t.total, detalle: detalleTirada(t), modo: t.modo, critico: t.critico ?? null, creada: new Date().toISOString() }, ...(x.tiradas ?? [])].slice(0, 60) }))), []);

  const lista = aLista(c);
  const setLista = (f: (l: CombateUno[]) => CombateUno[]) => setC((x) => deLista(f(aLista(x)), x));
  const jugadores = miembros.filter((m) => m.usuario !== partida.master && m.pj && m.personaje);
  const jugador = async (m: Miembro, cambios: Record<string, unknown>) => {
    try { await cambiarJugador(m.personaje!, cambios); onRecargar(); } catch (e) { setError((e as Error).message); }
  };
  /** Pone a esos jugadores en `destino` (y los saca de cualquier otro combate); destino null = fuera de todos. */
  const mover = (pjs: string[], destino: string | null, colores?: Record<string, string>) => setLista((l) => l.map((k) => {
    const sin = (k.pjs ?? []).filter((x) => !pjs.includes(x));
    return { ...k, pjs: k.id === destino ? [...sin, ...pjs] : sin, colores: k.id === destino && colores ? { ...k.colores, ...colores } : k.colores };
  }));
  /** Pasa criaturas de un combate a otro tal como están (vida, estados, iniciativa…). */
  const moverCriaturas = (origen: string, ids: string[], destino: string) => setLista((l) => {
    const van = l.find((k) => k.id === origen)?.enemigos.filter((e) => ids.includes(e.id)) ?? [];
    return l.map((k) => (k.id === origen ? { ...k, enemigos: k.enemigos.filter((e) => !ids.includes(e.id)) } : k.id === destino ? { ...k, enemigos: [...k.enemigos, ...van] } : k));
  });
  // Criaturas propias de esta partida (van primero en la lista del «Encuentro»).
  const criaturas = useMemo(() => c.criaturas ?? [], [c.criaturas]);
  const setCriaturas = (f: (l: Monstruo[]) => Monstruo[]) => setC((x) => ({ ...x, criaturas: f(x.criaturas ?? []) }));
  const todosMonstruos = useMemo(() => (monstruos ? [...criaturas, ...monstruos] : null), [monstruos, criaturas]);
  const [biblio, setBiblio] = useState(false);
  const [ver, setVerE] = useState(PRINCIPAL);
  const setVer = (id: string) => { verRef.current = id; setVerE(id); };
  const activo = lista.find((k) => k.id === ver) ?? lista[0];
  verRef.current = activo.id;
  const [editando, setEditando] = useState(false);
  const borrar = (id: string, n: string) => { if (confirm(L(`¿Eliminar «${n}» de la lista?`, `Удалить «${n}» из списка?`))) { setLista((l) => l.filter((x) => x.id !== id)); if (ver === id) setVer(PRINCIPAL); } };
  const nuevo = () => { const id = uid(); setLista((l) => [...l, { id, nombre: `${L('Combate', 'Бой')} ${l.length + 1}`, ronda: 1, turno: null, enemigos: [], pjs: [] }]); setVer(id); };
  const nombres = lista.map((k, i) => ({ id: k.id, nombre: k.nombre || `${L('Combate', 'Бой')} ${i + 1}` }));

  return (
    <div className="panel-combate">
      {error && <p className="error">{error}</p>}
      <AvisoCriaturaRecibida onAnadir={(m) => setCriaturas((l) => [...l, m])} />
      <div className="pestanas-combate" role="tablist">
        {nombres.map((x) => x.id === activo.id && editando
          ? <input key={x.id} className="pestana-edit" autoFocus defaultValue={x.nombre} onBlur={(ev) => { const v = ev.target.value.trim(); setLista((l) => l.map((k) => (k.id === x.id ? { ...k, nombre: v || x.nombre } : k))); setEditando(false); }} onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); if (ev.key === 'Escape') setEditando(false); }} />
          : <span key={x.id} className={`pestana ${x.id === activo.id ? 'activo' : ''}`}>
              <button role="tab" onClick={() => (x.id === activo.id ? setEditando(true) : setVer(x.id))} title={x.id === activo.id ? L('Toca para cambiar el nombre', 'Нажми, чтобы переименовать') : undefined}>⚔️ {x.nombre}{x.id === activo.id ? ' ✎' : ''}</button>
              {x.id !== PRINCIPAL && <button className="cerrar-pestana" title={L('Eliminar este combate', 'Удалить этот бой')} aria-label={L('Eliminar este combate', 'Удалить этот бой')} onClick={() => borrar(x.id, x.nombre)}>✕</button>}
            </span>)}
        <button className="nueva" onClick={nuevo} title={L('Otro combate a la vez', 'Ещё один бой одновременно')}>＋</button>
      </div>
      <div className="combates">
        {[activo].map((k) => { const i = lista.indexOf(k); return (
          <UnCombate key={k.id} k={k} nombre={nombres[i].nombre} otros={nombres.filter((x) => x.id !== k.id)} monstruos={todosMonstruos} onBiblioteca={() => setBiblio(true)}
            jugadores={jugadores.filter((m) => combateDe(lista, m.personaje!) === k.id)}
            todos={jugadores.map((m) => ({ m, en: nombres.find((x) => x.id === combateDe(lista, m.personaje!))?.nombre ?? null }))}
            partidaId={partida.id} tiradasMaster={(c.tiradas ?? []).filter((t) => (t.combate ?? PRINCIPAL) === k.id)}
            set={(f) => setLista((l) => l.map((x) => (x.id === k.id ? f(x) : x)))}
            jugador={jugador} mover={mover} moverCriaturas={(ids, destino) => moverCriaturas(k.id, ids, destino)} onRecargar={onRecargar} onAbrirPj={onAbrirPj} />
        ); })}
      </div>
      {biblio && <BibliotecaCriaturas criaturas={criaturas} set={setCriaturas} monstruos={monstruos ?? []} onClose={() => setBiblio(false)} />}
      <p className="nota">{L('Los jugadores tiran iniciativa en su hoja (Atributos → Iniciativa) o la tiras tú con 🎲. Con iniciativa 0 no entran en el combate.', 'Игроки бросают инициативу у себя в листе (Характеристики → Инициатива) или ты бросаешь за них через 🎲. С инициативой 0 они не участвуют в бою.')}</p>
    </div>
  );
}

/** Un combate: orden de iniciativa de sus jugadores y enemigos, vida y estados de cada uno. */
function UnCombate({ k, nombre, otros, monstruos, jugadores, todos, partidaId, tiradasMaster, set, jugador, mover, moverCriaturas, onRecargar, onAbrirPj, onBiblioteca }: {
  k: CombateUno; nombre: string; otros: { id: string; nombre: string }[]; monstruos: Monstruo[] | null; jugadores: Miembro[];
  todos: { m: Miembro; en: string | null }[]; partidaId: string; tiradasMaster: TiradaMaster[];
  set: (f: (k: CombateUno) => CombateUno) => void;
  jugador: (m: Miembro, cambios: Record<string, unknown>) => Promise<void>; mover: (pjs: string[], destino: string | null, colores?: Record<string, string>) => void;
  onRecargar: () => void; onAbrirPj?: (pj: string) => void; onBiblioteca: () => void; moverCriaturas: (ids: string[], destino: string) => void;
}) {
  const [terminando, setTerminando] = useState(false);
  const colorPj = (pj: string) => colorDe(k.colores?.[pj], COLOR_JUGADOR).id;
  const [anadir, setAnadir] = useState(false);
  const [anadirPj, setAnadirPj] = useState(false);
  const [ficha, setFicha] = useState<{ m: Monstruo; quien: string } | null>(null);
  const { tirar, tirarD20 } = useDados();
  const filas: Fila[] = useMemo(() => {
    const grupos = new Map<string, Enemigo[]>();
    for (const e of k.enemigos) { const g = e.grupo ?? e.id; grupos.set(g, [...(grupos.get(g) ?? []), e]); }
    const f: Fila[] = [
      ...jugadores.map((m) => ({ tipo: 'pj' as const, clave: 'pj:' + m.personaje, ini: m.pj!.iniciativaActual, m })),
      ...[...grupos.entries()].map(([g, es]) => ({ tipo: 'grupo' as const, clave: 'g:' + g, ini: es[0].ini, enemigos: es })),
    ];
    return f.sort((a, b) => (b.ini ?? -100) - (a.ini ?? -100));
  }, [k.enemigos, jugadores]);
  // Los que aún no tienen iniciativa salen al final; los turnos van solo entre los que la tienen (si nadie la tiene, entre todos).
  const conIni = filas.filter((f) => enCombate(f.ini));
  const dentro = conIni.length ? conIni : filas;

  const setEnemigos = (f: (es: Enemigo[]) => Enemigo[]) => set((x) => ({ ...x, enemigos: f(x.enemigos) }));
  const cambiarEnemigo = (id: string, f: (e: Enemigo) => Enemigo) => setEnemigos((es) => es.map((e) => (e.id === id ? f(e) : e)));
  const cambiarGrupo = (clave: string, f: (e: Enemigo) => Enemigo) => setEnemigos((es) => es.map((e) => ('g:' + (e.grupo ?? e.id) === clave ? f(e) : e)));
  const tirarEnemigos = () => setEnemigos((es) => {
    const porGrupo = new Map<string, number>();
    return es.map((e) => {
      if (enCombate(e.ini)) return e;
      const g = e.grupo ?? e.id;
      if (!porGrupo.has(g)) porGrupo.set(g, d20() + e.bonoIni);
      return { ...e, ini: porGrupo.get(g)! };
    });
  });
  const siguiente = () => {
    const vivas = dentro.filter((f) => f.tipo === 'pj' || f.enemigos.some((e) => e.pg > 0));
    if (!vivas.length) return;
    const i = vivas.findIndex((f) => f.clave === k.turno);
    const sig = i < 0 ? 0 : (i + 1) % vivas.length;
    const nuevaRonda = i >= 0 && sig === 0;
    set((x) => ({
      ...x, turno: vivas[sig].clave, ronda: nuevaRonda ? x.ronda + 1 : x.ronda,
      // Al empezar una ronda nueva se descuenta la duración de los estados y se quitan los que terminan.
      enemigos: nuevaRonda ? x.enemigos.map((e) => { const r = pasarRonda(e.estados, e.estadosDetalle); return r ? { ...e, estados: r.estados, estadosDetalle: r.detalles } : e; }) : x.enemigos,
    }));
    if (nuevaRonda) {
      const cambios = jugadores.map((m) => [m, pasarRonda(m.pj!.estados, m.pj!.estadosDetalle)] as const).filter(([, r]) => r);
      if (cambios.length) Promise.all(cambios.map(([m, r]) => cambiarJugador(m.personaje!, { estados: r!.estados, estadosDetalle: r!.detalles }))).then(onRecargar).catch(() => {});
    }
  };
  /** Termina el combate quitando las criaturas (y sacando a los jugadores) de los colores elegidos. El resto se queda sin iniciativa. */
  const terminar = async (quitar: string[]) => {
    setTerminando(false);
    const fuera = jugadores.map((m) => m.personaje!).filter((pj) => quitar.includes(colorPj(pj)));
    set((x) => ({ ...x, ronda: 1, turno: null, desde: new Date().toISOString(),
      enemigos: x.enemigos.filter((e) => !quitar.includes(colorDe(e.bando).id)).map((e) => ({ ...e, ini: null })) }));
    if (fuera.length) mover(fuera, null);
    await Promise.all(jugadores.filter((m) => m.pj!.iniciativaActual !== null).map((m) => cambiarJugador(m.personaje!, { iniciativaActual: null }).catch(() => {})));
    onRecargar();
  };

  const tarjeta = (f: Fila) => (
    <li key={f.clave} className={`fila-combate ${f.tipo} con-color ${k.turno === f.clave ? 'turno' : ''}`}
      style={estiloColor(f.tipo === 'grupo' ? colorDe(f.enemigos[0].bando).id : colorPj(f.m.personaje!))}>
      <div className="ini-caja">
        <Numero valor={f.ini ?? 0} ancho={52} set={(n) => f.tipo === 'pj' ? jugador(f.m, { iniciativaActual: n }) : cambiarGrupo(f.clave, (e) => ({ ...e, ini: n }))} />
        {f.tipo === 'pj' && <button className="btn pequeno tirar-ini" title={L('Tirar iniciativa por el jugador', 'Бросить инициативу за игрока')}
          onClick={() => tirarD20(`${f.m.pj!.nombre || f.m.alias}: ${L('Iniciativa', 'Инициатива')}`, f.m.pj!.bonoIni, [], (t) => jugador(f.m, { iniciativaActual: t }))}>🎲</button>}
      </div>
      {f.tipo === 'pj' ? (
        <div className="combatiente">
          <div className="comb-cab">
            <ChipColor valor={colorPj(f.m.personaje!)} set={(c) => set((x) => ({ ...x, colores: { ...x.colores, [f.m.personaje!]: c } }))} />
            <button className="btn enlace nombre-comb" onClick={() => onAbrirPj?.(f.m.personaje!)}>{f.m.pj!.nombre || f.m.alias}</button>
            <span className="nota">@{f.m.alias} · 🛡 {f.m.pj!.ca}</span>
          </div>
          <VidaFila pg={f.m.pj!.pg.actual} max={f.m.pj!.pg.max} temp={f.m.pj!.pg.temp ?? 0} set={(pg, temp) => jugador(f.m, { pg: { ...f.m.pj!.pg, actual: pg, temp }, estados: estadosPorVida(f.m.pj!.estados, pg, false) })} />
          {f.m.pj!.pm.max > 0 && <ManaFila pm={f.m.pj!.pm.actual} max={f.m.pj!.pm.max} set={(n) => jugador(f.m, { pm: { ...f.m.pj!.pm, actual: n } })} />}
          <ChipsEstados estados={f.m.pj!.estados} agotamiento={f.m.pj!.agotamiento} detalles={f.m.pj!.estadosDetalle} quien={f.m.pj!.nombre || f.m.alias} vacio set={(e, a, d) => jugador(f.m, { estados: e, agotamiento: a, estadosDetalle: d, ...(muereAhora(f.m.pj!.estados, e) ? { pg: { ...f.m.pj!.pg, actual: 0, temp: 0 } } : {}) })} />
          <div className="acciones-pj">
            <select className="campo mover-pj" value="" onChange={(ev) => { const v = ev.target.value; if (v) mover([f.m.personaje!], v === '__fuera' ? null : v); }}>
              <option value="">{L('Mover…', 'Перенести…')}</option>
              {otros.map((o) => <option key={o.id} value={o.id}>→ {o.nombre}</option>)}
              <option value="__fuera">✕ {L('Sacar de este combate', 'Убрать из этого боя')}</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="combatiente">
          <div className="color-grupo">
            <ChipColor valor={colorDe(f.enemigos[0].bando).id} set={(c) => cambiarGrupo(f.clave, (e) => ({ ...e, bando: c }))} />
          </div>
          {f.enemigos.map((e) => {
            const mo = monstruos?.find((m) => m.id === e.monstruo);
            const varios = f.enemigos.length > 1;
            return (
              <div key={e.id} className={`enemigo ${e.pg <= 0 ? 'caido' : ''}`}>
                <div className="comb-cab">
                  <button className="btn enlace nombre-comb" disabled={!mo} onClick={() => mo && setFicha({ m: mo, quien: e.nombre })}>{e.nombre}{mo ? ' ⓘ' : ''}</button>
                  <span className="nota">🛡 {e.ca}</span>
                </div>
                <VidaFila pg={e.pg} max={e.pgMax} temp={e.temp ?? 0} set={(pg, temp) => cambiarEnemigo(e.id, (x) => ({ ...x, pg, temp, estados: estadosPorVida(x.estados, pg, true) }))} />
                <ChipsEstados estados={e.estados} agotamiento={e.agotamiento ?? 0} detalles={e.estadosDetalle} quien={e.nombre} vacio set={(es, a, d) => cambiarEnemigo(e.id, (x) => ({ ...x, estados: es, agotamiento: a, estadosDetalle: d, ...(muereAhora(x.estados, es) ? { pg: 0, temp: 0 } : {}) }))} />
                <div className="acciones-pj">
                  {otros.length > 0 && (
                    <select className="campo mover-pj" value="" onChange={(ev) => { const v = ev.target.value; if (!v) return; const [destino, todo] = v.split('|'); moverCriaturas(todo ? f.enemigos.map((x) => x.id) : [e.id], destino); }}>
                      <option value="">{L('Mover…', 'Перенести…')}</option>
                      {otros.map((o) => <option key={o.id} value={o.id}>→ {o.nombre}{varios ? L(' (solo este)', ' (только этого)') : ''}</option>)}
                      {varios && otros.map((o) => <option key={o.id + '|g'} value={o.id + '|g'}>→ {o.nombre} {L('(todo el grupo)', '(всю группу)')}</option>)}
                    </select>
                  )}
                  <button className="quitar-enemigo" title={L('Quitar del combate', 'Убрать из боя')} aria-label={L('Quitar del combate', 'Убрать из боя')} onClick={() => setEnemigos((es) => es.filter((x) => x.id !== e.id))}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );

  return (
    <section className="un-combate">
      <div className="cuerpo-combate">
      <div className="lado-combatientes">
      <div className="cabecera-combate">
        <div><span className="etq-pequena">{L('Ronda', 'Раунд')}</span> <strong className="ronda">{k.ronda}</strong></div>
        <div className="fila-botones">
          <button className="btn primario" onClick={siguiente}>▶ {L('Siguiente turno', 'Следующий ход')}</button>
          <button className="btn" onClick={tirarEnemigos} disabled={!k.enemigos.some((e) => !enCombate(e.ini))}>🎲 {L('Iniciativa criaturas', 'Инициатива существ')}</button>
        </div>
      </div>
      <ol className="orden-combate">{filas.map(tarjeta)}</ol>
      {!filas.length && <p className="vacio">{L('Aún no hay nadie en este combate. Añade jugadores y criaturas con el botón «Encuentro».', 'В этом бою пока никого. Добавь игроков и существ кнопкой «Встреча».')}</p>}
      <div className="fila-botones pie-combate">
        <button className="btn primario" onClick={() => setAnadirPj(true)}>⚔️ {L('Encuentro', 'Встреча')}</button>
        <button className="btn" onClick={onBiblioteca}>🐉 {L('Criaturas propias', 'Свои существа')}</button>
        <button className="btn peligro" onClick={() => setTerminando(true)}>{L('Terminar combate', 'Закончить бой')}</button>
      </div>
      </div>
      <HistorialTiradas partida={partidaId} pjs={jugadores.map((m) => m.personaje!)} master={tiradasMaster} desde={k.desde} />
      </div>
      {anadirPj && <ModalAnadirJugadores todos={todos} enEste={jugadores.map((m) => m.personaje!)} colorDe={colorPj} nombre={nombre} pestanas={<PestanasEncuentro en="jugadores" ir={() => { setAnadirPj(false); setAnadir(true); }} />} onClose={() => setAnadirPj(false)}
        onAnadir={(ids, colores) => { if (ids.length) mover(ids, k.id); set((x) => ({ ...x, colores: { ...x.colores, ...colores } })); setAnadirPj(false); }} />}
      {terminando && <ModalTerminar nombre={nombre} enemigos={k.enemigos} pjs={jugadores.map((m) => ({ id: m.personaje!, nombre: m.pj!.nombre || m.alias, color: colorPj(m.personaje!) }))} onClose={() => setTerminando(false)} onTerminar={terminar} />}
      {anadir && monstruos && <ModalAnadirEnemigos monstruos={monstruos} pestanas={<PestanasEncuentro en="criaturas" ir={() => { setAnadir(false); setAnadirPj(true); }} />} onClose={() => setAnadir(false)} onAnadir={(es) => { setEnemigos((x) => [...x, ...es]); setAnadir(false); }} onVer={(m) => setFicha({ m, quien: nombreM(m) })} />}
      {ficha && <Modal titulo={ficha.quien} onClose={() => setFicha(null)}><BloqueMonstruo m={ficha.m} quien={ficha.quien} tirar={tirar} /></Modal>}
    </section>
  );
}

/** Vida con barra y botones de daño / curación. */
/** Vida con barra, PG temporales y botones de daño / curación. El daño gasta primero los temporales. */
function VidaFila({ pg, max, temp, set }: { pg: number; max: number; temp: number; set: (pg: number, temp: number) => void }) {
  const [n, setN] = useState(0);
  const [editTemp, setEditTemp] = useState(false);
  const danar = () => { const t = Math.min(temp, n); set(Math.max(0, pg - (n - t)), temp - t); setN(0); };
  return (
    <div className="vida-fila">
      <span className="vida-num">❤️ <strong>{pg}</strong>/{max}</span>
      <div className="barra-vida mini con-temp">
        <div style={{ width: `${max ? Math.max(0, Math.min(100, (100 * pg) / max)) : 0}%` }} />
        {temp > 0 && <div className="temp" style={{ width: `${max ? Math.min(100, (100 * temp) / max) : 0}%` }} />}
      </div>
      <Numero valor={n} min={0} ancho={56} set={setN} />
      <button className="btn peligro pequeno" disabled={!n} onClick={danar} title={L('Daño', 'Урон')}>−</button>
      <button className="btn primario pequeno" disabled={!n} onClick={() => { set(Math.min(max, pg + n), temp); setN(0); }} title={L('Curar', 'Лечение')}>+</button>
      <span className="temp-fila">
        {editTemp
          ? <><span>🛡️ {L('PG temporales', 'Временные хиты')}:</span> <Numero valor={temp} min={0} ancho={56} set={(t) => set(pg, t)} /> <button className="btn enlace pequeno" onClick={() => setEditTemp(false)}>✓</button></>
          : <button className={`chip-temp ${temp > 0 ? 'hay' : ''}`} onClick={() => setEditTemp(true)}>{temp > 0 ? `+${temp} ${L('temp.', 'врем.')}` : `＋ ${L('PG temporales', 'Временные хиты')}`}</button>}
      </span>
    </div>
  );
}

/** Maná del jugador: gastar o recuperar. */
function ManaFila({ pm, max, set }: { pm: number; max: number; set: (n: number) => void }) {
  const [n, setN] = useState(0);
  return (
    <div className="vida-fila mana-fila">
      <span className="vida-num">🔷 <strong>{pm}</strong>/{max}</span>
      <div className="barra-vida mini barra-mana"><div style={{ width: `${max ? Math.max(0, Math.min(100, (100 * pm) / max)) : 0}%` }} /></div>
      <Numero valor={n} min={0} ancho={56} set={setN} />
      <button className="btn peligro pequeno" disabled={!n} onClick={() => { set(Math.max(0, pm - n)); setN(0); }} title={L('Quitar maná', 'Убрать ману')}>−</button>
      <button className="btn primario pequeno" disabled={!n} onClick={() => { set(Math.min(max, pm + n)); setN(0); }} title={L('Devolver maná', 'Вернуть ману')}>+</button>
    </div>
  );
}

/** Pestañas del «Encuentro»: jugadores o criaturas (aliados y enemigos). */
function PestanasEncuentro({ en, ir }: { en: 'jugadores' | 'criaturas'; ir: () => void }) {
  return (
    <div className="segmentado vista-partida">
      <button type="button" className={en === 'jugadores' ? 'activo' : ''} onClick={en === 'jugadores' ? undefined : ir}>👥 {L('Jugadores', 'Игроки')}</button>
      <button type="button" className={en === 'criaturas' ? 'activo' : ''} onClick={en === 'criaturas' ? undefined : ir}>🐉 {L('Criaturas', 'Существа')}</button>
    </div>
  );
}

/** Elegir qué jugadores entran en este combate (los que estén en otro se mueven aquí) y el color de bando de cada uno. */
function ModalAnadirJugadores({ todos, enEste, colorDe: colorIni, nombre, pestanas, onClose, onAnadir }: { todos: { m: Miembro; en: string | null }[]; enEste: string[]; colorDe: (pj: string) => string; nombre: string; pestanas: React.ReactNode; onClose: () => void; onAnadir: (ids: string[], colores: Record<string, string>) => void }) {
  const libres = todos.filter((x) => !enEste.includes(x.m.personaje!));
  const [sel, setSel] = useState<string[]>(() => libres.filter((x) => !x.en).map((x) => x.m.personaje!));
  const [colores, setColores] = useState<Record<string, string>>(() => Object.fromEntries(todos.map((x) => [x.m.personaje!, colorIni(x.m.personaje!)])));
  const cambiar = (id: string) => setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const cambiados = todos.some((x) => colores[x.m.personaje!] !== colorIni(x.m.personaje!));
  return (
    <Modal titulo={L(`Encuentro: ${nombre}`, `Встреча: ${nombre}`)} onClose={onClose}
      pie={<>{libres.length > 0 && <button className="btn" onClick={() => setSel(sel.length === libres.length ? [] : libres.map((x) => x.m.personaje!))}>{sel.length === libres.length ? L('Ninguno', 'Никого') : L('Todos', 'Все')}</button>}
        <button className="btn primario" disabled={!sel.length && !cambiados} onClick={() => onAnadir(sel, colores)}>{sel.length ? `${L('Añadir', 'Добавить')} (${sel.length})` : L('Guardar colores', 'Сохранить цвета')}</button></>}>
      {pestanas}
      <p className="nota">{L('Toca el círculo para cambiar el color de bando (por ejemplo, si un jugador traiciona al grupo).', 'Нажми на кружок, чтобы сменить цвет стороны (например, если игрок предал отряд).')}</p>
      {todos.length === 0 ? <p className="nota">{L('Aún no hay jugadores con personaje en la partida.', 'В партии пока нет игроков с персонажами.')}</p> : (
        <ul className="lista-anadir-pj">
          {todos.map(({ m, en }) => {
            const ya = enEste.includes(m.personaje!);
            return (
              <li key={m.personaje} style={estiloColor(colores[m.personaje!])} className="con-color">
                <ChipColor valor={colores[m.personaje!]} set={(c) => setColores({ ...colores, [m.personaje!]: c })} />
                <label className="interruptor"><input type="checkbox" disabled={ya} checked={ya || sel.includes(m.personaje!)} onChange={() => cambiar(m.personaje!)} />
                  <span><strong>{m.pj!.nombre || m.alias}</strong> <small>@{m.alias} · ❤️ {m.pj!.pg.actual}/{m.pj!.pg.max}{ya ? ` · ${L('ya está en este combate', 'уже в этом бою')}` : en ? ` · ${L('ahora en', 'сейчас в')} «${en}»` : ''}</small></span></label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

/** Al terminar: elegir qué colores salen del combate (sus criaturas se quitan y sus jugadores salen). */
function ModalTerminar({ nombre, enemigos, pjs, onClose, onTerminar }: { nombre: string; enemigos: Enemigo[]; pjs: { id: string; nombre: string; color: string }[]; onClose: () => void; onTerminar: (quitar: string[]) => void }) {
  const grupos = COLORES.map((c) => ({ c, cri: enemigos.filter((e) => colorDe(e.bando).id === c.id), pj: pjs.filter((p) => p.color === c.id) })).filter((g) => g.cri.length || g.pj.length);
  const [quitar, setQuitar] = useState<string[]>(() => grupos.filter((g) => g.cri.length && !g.pj.length).map((g) => g.c.id));
  const cambiar = (id: string) => setQuitar((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <Modal titulo={L(`Terminar «${nombre}»`, `Закончить «${nombre}»`)} onClose={onClose}
      pie={<><button className="btn" onClick={onClose}>{L('Cancelar', 'Отмена')}</button><button className="btn peligro" onClick={() => onTerminar(quitar)}>{L('Terminar combate', 'Закончить бой')}</button></>}>
      <p>{L('¿Qué colores quitas del combate? Las criaturas marcadas se eliminan y los jugadores marcados salen del combate. Los demás se quedan, sin iniciativa.', 'Какие цвета убрать из боя? Отмеченные существа удаляются, отмеченные игроки выходят из боя. Остальные остаются, без инициативы.')}</p>
      {grupos.length === 0 ? <p className="nota">{L('No hay nadie en este combate.', 'В этом бою никого нет.')}</p> : (
        <ul className="lista-terminar">
          {grupos.map((g) => (
            <li key={g.c.id} className="con-color" style={estiloColor(g.c.id)}>
              <label className="interruptor"><input type="checkbox" checked={quitar.includes(g.c.id)} onChange={() => cambiar(g.c.id)} />
                <span className="punto-color fijo" />
                <span>{[...g.pj.map((p) => `👤 ${p.nombre}`), ...g.cri.map((e) => `${e.pg <= 0 ? '💀' : '🐾'} ${e.nombre}`)].join(' · ')}</span></label>
            </li>
          ))}
        </ul>
      )}
      <p className="nota">{L('Siempre se reinician la ronda, los turnos, la iniciativa y el historial de tiradas.', 'Раунд, ходы, инициатива и история бросков всегда сбрасываются.')}</p>
    </Modal>
  );
}

/** PG de una criatura según sus dados de golpe: media, tirados o máximos. */
export function pgSegun(dg: string | undefined, media: number, modo: 'media' | 'tirar' | 'max') {
  const m = (dg ?? '').replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m || modo === 'media') return media;
  const n = Number(m[1]), caras = Number(m[2]), b = Number(m[3] ?? 0);
  if (modo === 'max') return Math.max(1, n * caras + b);
  let t = b; for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * caras);
  return Math.max(1, t);
}

function ModalAnadirEnemigos({ monstruos, pestanas, onClose, onAnadir, onVer }: { monstruos: Monstruo[]; pestanas: React.ReactNode; onClose: () => void; onAnadir: (es: Enemigo[]) => void; onVer: (m: Monstruo) => void }) {
  const [q, setQ] = useState('');
  const [color, setColor] = useState(COLOR_CRIATURA);
  const [sel, setSel] = useState<Monstruo | null>(null);
  const [cant, setCant] = useState(1);
  const [grupo, setGrupo] = useState(true);
  const [modoPg, setModoPg] = useState<'media' | 'tirar' | 'max'>('media');
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return monstruos.filter((m) => !t || [m.es, m.ru, m.en].some((s) => s.toLowerCase().includes(t)))
      .sort((a, b) => Number(!!b.propia) - Number(!!a.propia) || a.vd - b.vd || nombreM(a).localeCompare(nombreM(b)));
  }, [q, monstruos]);
  const crear = (base: Monstruo) => {
    const g = cant > 1 && grupo ? uid() : null;
    return Array.from({ length: cant }, (_, i) => {
      const pg = pgSegun(base.dg, base.pg, modoPg);
      return { id: uid(), monstruo: base.id, nombre: cant > 1 ? `${nombreM(base)} ${i + 1}` : nombreM(base), grupo: g, ini: null, bonoIni: mod(base.car[1]), pg, pgMax: pg, temp: 0, ca: base.ca, estados: [], bando: color } as Enemigo;
    });
  };
  return (
    <Modal titulo={L('Encuentro', 'Встреча')} onClose={onClose}
      pie={<>
        <span className="contador-enemigos">× <Numero valor={cant} min={1} max={30} ancho={56} set={setCant} /></span>
        <button className="btn primario" disabled={!sel} onClick={() => sel && onAnadir(crear(sel))}>{L('Añadir', 'Добавить')}</button>
      </>}>
      {pestanas}
      <p className="etq-pequena">{L('Color de bando', 'Цвет стороны')}</p>
      <SelectorColor valor={color} set={setColor} />
      <input className="campo" autoFocus placeholder={L('Buscar: goblin, lobo, dragón…', 'Поиск: гоблин, волк, дракон…')} value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
      <p className="nota">{L(`${lista.length} de ${monstruos.length} criaturas`, `${lista.length} из ${monstruos.length} существ`)}</p>
      <ul className="lista-monstruos">
        {lista.map((m) => (
          <li key={m.id} className={sel?.id === m.id ? 'sel' : ''}>
            <button type="button" onClick={() => setSel(m)}>
              <strong>{m.propia ? '⭐ ' : ''}{nombreM(m)}</strong>
              <small>{L('VD', 'ПО')} {vdTexto(m.vd)} · 🛡 {m.ca} · ❤️ {m.pg} · {idioma() === 'ru' ? m.tipo[1] : m.tipo[0]}{m.propia ? ` · ${L('de esta partida', 'из этой партии')}` : ''}</small>
            </button>
            <button type="button" className="btn enlace" onClick={() => onVer(m)}>ⓘ</button>
          </li>
        ))}
      </ul>
      <label className="interruptor"><input type="checkbox" checked={grupo} onChange={(e) => setGrupo(e.target.checked)} /> {L('Grupo: una sola iniciativa para todos', 'Группа: одна инициатива на всех')}</label>
      <p className="etq-pequena">{L('Puntos de golpe', 'Хиты')}</p>
      <div className="segmentado modo-pg">
        {([['media', L('Media', 'Среднее')], ['tirar', L('Tirar cada uno', 'Бросить каждому')], ['max', L('Máximos', 'Максимум')]] as const).map(([v, t]) => (
          <button key={v} type="button" className={modoPg === v ? 'activo' : ''} onClick={() => setModoPg(v)}>{t}</button>
        ))}
      </div>
      {sel && <p className="nota">{sel.dg ? `${nombreM(sel)}: ${sel.dg} → ${modoPg === 'media' ? sel.pg : modoPg === 'max' ? pgSegun(sel.dg, sel.pg, 'max') : L('al azar', 'случайно')}` : ''}</p>}
    </Modal>
  );
}

/** Ficha completa de un monstruo (los textos de acciones están en inglés, del SRD 5.2). */
export function BloqueMonstruo({ m, tirar, quien }: { m: Monstruo; tirar?: (etq: string, formula: string) => unknown; quien?: string }) {
  const ru = idioma() === 'ru';
  const lista = (t: string, xs: Accion[]) => xs.length > 0 && (
    <section className="bm-seccion"><h4>{t}</h4>{xs.map((a, i) => <p key={i}><strong>{a.n}.</strong> {a.d}</p>)}</section>
  );
  return (
    <div className="bloque-monstruo">
      <p className="nota">{ru ? m.tam[1] : m.tam[0]} {ru ? m.tipo[1] : m.tipo[0]} · {m.en}</p>
      <div className="bm-linea">
        <span>🛡 {L('CA', 'КД')} <strong>{m.ca}</strong></span>
        <span>❤️ {L('PG', 'Хиты')} <strong>{m.pg}</strong> ({m.dg})</span>
        <span>{L('VD', 'ПО')} <strong>{vdTexto(m.vd)}</strong> ({m.px} {L('PX', 'опыта')})</span>
        <span>{L('Velocidad', 'Скорость')}: {Object.entries(m.vel).map(([k, v]) => `${(VEL[k]?.[ru ? 1 : 0] ?? k)} ${pies(v)}`.trim()).join(', ')}</span>
      </div>
      {m.atq && m.atq.length > 0 && (
        <section className="bm-seccion bm-ataques"><h4>⚔️ {L('Ataques (pulsa para tirar)', 'Атаки (нажми, чтобы бросить)')}</h4><AtaquesMonstruo m={m} quien={quien ?? nombreM(m)} /></section>
      )}
      <div className="bm-car">
        {m.car.map((v, i) => (
          <button key={i} type="button" onClick={() => tirar?.(`${ATR()[i]} — ${nombreM(m)}`, `1d20${signo(mod(v))}`)}>
            <small>{ATR()[i]}</small><strong>{v}</strong><span>{signo(mod(v))}</span>
          </button>
        ))}
      </div>
      {m.salv?.some((v) => v !== null) && (
        <div className="bm-tiradas"><span className="etq-pequena">{L('Salvaciones', 'Спасброски')}</span>
          {m.salv.map((v, i) => v === null ? null : <button key={i} type="button" className="btn pequeno" onClick={() => tirar?.(`${quien ?? nombreM(m)}: ${L('salvación', 'спасбросок')} ${ATR()[i]}`, `1d20${signo(v)}`)}>{ATR()[i]} {signo(v)}</button>)}
        </div>
      )}
      {m.hab && m.hab.length > 0 && (
        <div className="bm-tiradas"><span className="etq-pequena">{L('Habilidades', 'Навыки')}</span>
          {m.hab.map((h) => { const n = HABILIDADES.find((x) => x.id === h.id)?.nombre ?? h.id; return <button key={h.id} type="button" className="btn pequeno" onClick={() => tirar?.(`${quien ?? nombreM(m)}: ${n}`, `1d20${signo(h.v)}`)}>{n} {signo(h.v)}</button>; })}
        </div>
      )}
      <p className="nota">
        {Object.entries(m.sentidos).map(([k, v]) => `${SENT[k]?.[ru ? 1 : 0] ?? k} ${pies(v)}`).join(' · ')}
        {m.idiomas && <><br />{L('Idiomas', 'Языки')}: {m.idiomas}</>}
        {m.res.length > 0 && <><br />{L('Resistencias', 'Сопротивления')}: {m.res.join(', ')}</>}
        {m.inm.length > 0 && <><br />{L('Inmunidades', 'Иммунитеты')}: {m.inm.join(', ')}</>}
        {m.vul.length > 0 && <><br />{L('Vulnerabilidades', 'Уязвимости')}: {m.vul.join(', ')}</>}
        {m.inmEst.length > 0 && <><br />{L('Inmune a estados', 'Иммунитет к состояниям')}: {m.inmEst.join(', ')}</>}
      </p>
      {lista(L('Rasgos', 'Особенности'), m.rasgos)}
      {lista(L('Acciones', 'Действия'), m.acciones)}
      {lista(L('Acciones adicionales', 'Бонусные действия'), m.adicionales)}
      {lista(L('Reacciones', 'Реакции'), m.reacciones)}
      {lista(L('Acciones legendarias', 'Легендарные действия'), m.legendarias)}
    </div>
  );
}
