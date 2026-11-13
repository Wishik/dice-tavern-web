import { useEffect, useMemo, useRef, useState } from 'react';
import { useDatos } from '../data';
import { L, idioma } from '../i18n';
import { Modal, Numero } from '../ui';
import { ChipsEstados, estadosPorVida, pasarRonda } from '../estados';
import { escucharTiradas, useDados } from '../dice';
import { detalleTirada } from '../tiradasPartida';
import { HistorialTiradas } from './Historial';
import { cambiarJugador, guardarCombate, type Combate as CombateT, type CombateUno, type TiradaMaster, type Enemigo, type Miembro, type Partida } from '../partidas';

export interface Monstruo {
  id: string; en: string; es: string; ru: string; tam: [string, string]; tipo: [string, string];
  ca: number; pg: number; dg: string; vel: Record<string, string>; car: number[]; vd: number; px: number; bc: number;
  sentidos: Record<string, string | number>; idiomas: string; res: string[]; inm: string[]; vul: string[]; inmEst: string[];
  rasgos: Accion[]; acciones: Accion[]; adicionales: Accion[]; reacciones: Accion[]; legendarias: Accion[];
  /** Ataques y efectos con tirada: bono de ataque o CD de salvación, y dados de daño (el primero es el normal). */
  atq?: { es: string; ru: string; bono?: number; cd?: number; sal?: number | null; dano: { d: string; t: [string, string] }[] }[];
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
/** Bandos de las criaturas, cada uno con su color. */
export const BANDOS = [
  { id: 'aliado', es: 'Aliado', ru: 'Союзник', color: '#4f9a4a' },
  { id: 'A', es: 'Enemigo A', ru: 'Враг A', color: '#b8322a' },
  { id: 'B', es: 'Enemigo B', ru: 'Враг B', color: '#d9822b' },
  { id: 'C', es: 'Enemigo C', ru: 'Враг C', color: '#7b4fb3' },
  { id: 'D', es: 'Enemigo D', ru: 'Враг D', color: '#2f6fb0' },
];
const bandoDe = (id?: string) => BANDOS.find((b) => b.id === (id ?? 'A')) ?? BANDOS[1];

/** Elegir bando tocando el color. */
function SelectorBando({ valor, set }: { valor?: string; set: (b: string) => void }) {
  return (
    <div className="selector-bando" role="radiogroup" aria-label={L('Bando', 'Сторона')}>
      {BANDOS.map((b) => (
        <button key={b.id} type="button" role="radio" aria-checked={(valor ?? 'A') === b.id} className={(valor ?? 'A') === b.id ? 'activo' : ''} style={{ ['--c' as string]: b.color }} onClick={() => set(b.id)}>{L(b.es, b.ru)}</button>
      ))}
    </div>
  );
}
const aLista = (c: CombateT): CombateUno[] => [{ id: PRINCIPAL, nombre: c.nombre, ronda: c.ronda, turno: c.turno, enemigos: c.enemigos, pjs: c.pjs, desde: c.desde }, ...(c.otros ?? [])];
const deLista = (l: CombateUno[], tiradas?: CombateT['tiradas']): CombateT => ({ ronda: l[0].ronda, turno: l[0].turno, enemigos: l[0].enemigos, nombre: l[0].nombre, pjs: l[0].pjs, desde: l[0].desde, otros: l.slice(1), tiradas });
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
  const setLista = (f: (l: CombateUno[]) => CombateUno[]) => setC((x) => deLista(f(aLista(x)), x.tiradas));
  const jugadores = miembros.filter((m) => m.usuario !== partida.master && m.pj && m.personaje);
  const jugador = async (m: Miembro, cambios: Record<string, unknown>) => {
    try { await cambiarJugador(m.personaje!, cambios); onRecargar(); } catch (e) { setError((e as Error).message); }
  };
  /** Pone a esos jugadores en `destino` (y los saca de cualquier otro combate); destino null = fuera de todos. */
  const mover = (pjs: string[], destino: string | null) => setLista((l) => l.map((k) => {
    const sin = (k.pjs ?? []).filter((x) => !pjs.includes(x));
    return { ...k, pjs: k.id === destino ? [...sin, ...pjs] : sin };
  }));
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
          <UnCombate key={k.id} k={k} nombre={nombres[i].nombre} otros={nombres.filter((x) => x.id !== k.id)} monstruos={monstruos}
            jugadores={jugadores.filter((m) => combateDe(lista, m.personaje!) === k.id)}
            todos={jugadores.map((m) => ({ m, en: nombres.find((x) => x.id === combateDe(lista, m.personaje!))?.nombre ?? null }))}
            partidaId={partida.id} tiradasMaster={(c.tiradas ?? []).filter((t) => (t.combate ?? PRINCIPAL) === k.id)}
            set={(f) => setLista((l) => l.map((x) => (x.id === k.id ? f(x) : x)))}
            jugador={jugador} mover={mover} onRecargar={onRecargar} onAbrirPj={onAbrirPj} />
        ); })}
      </div>
      <p className="nota">{L('Los jugadores tiran iniciativa en su hoja (Atributos → Iniciativa) o la tiras tú con 🎲. Con iniciativa 0 no entran en el combate.', 'Игроки бросают инициативу у себя в листе (Характеристики → Инициатива) или ты бросаешь за них через 🎲. С инициативой 0 они не участвуют в бою.')}</p>
    </div>
  );
}

/** Un combate: orden de iniciativa de sus jugadores y enemigos, vida y estados de cada uno. */
function UnCombate({ k, nombre, otros, monstruos, jugadores, todos, partidaId, tiradasMaster, set, jugador, mover, onRecargar, onAbrirPj }: {
  k: CombateUno; nombre: string; otros: { id: string; nombre: string }[]; monstruos: Monstruo[] | null; jugadores: Miembro[];
  todos: { m: Miembro; en: string | null }[]; partidaId: string; tiradasMaster: TiradaMaster[];
  set: (f: (k: CombateUno) => CombateUno) => void;
  jugador: (m: Miembro, cambios: Record<string, unknown>) => Promise<void>; mover: (pjs: string[], destino: string | null) => void;
  onRecargar: () => void; onAbrirPj?: (pj: string) => void;
}) {
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
  const dentro = filas.filter((f) => enCombate(f.ini));
  const fuera = filas.filter((f) => !enCombate(f.ini));

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
  const terminar = async () => {
    if (!confirm(L(`¿Terminar «${nombre}»? Se quitan los enemigos, la iniciativa de sus jugadores y su historial de tiradas. El combate se queda en la lista.`, `Закончить «${nombre}»? Враги, инициатива его игроков и история бросков будут сброшены. Бой останется в списке.`))) return;
    set((x) => ({ ...x, ronda: 1, turno: null, enemigos: [], desde: new Date().toISOString() }));
    await Promise.all(jugadores.filter((m) => m.pj!.iniciativaActual !== null).map((m) => cambiarJugador(m.personaje!, { iniciativaActual: null }).catch(() => {})));
    onRecargar();
  };

  const tarjeta = (f: Fila) => (
    <li key={f.clave} className={`fila-combate ${f.tipo} ${f.tipo === 'grupo' ? 'bando-' + bandoDe(f.enemigos[0].bando).id : ''} ${k.turno === f.clave ? 'turno' : ''}`}
      style={f.tipo === 'grupo' ? { ['--c' as string]: bandoDe(f.enemigos[0].bando).color } : undefined}>
      <div className="ini-caja">
        <Numero valor={f.ini ?? 0} ancho={52} set={(n) => f.tipo === 'pj' ? jugador(f.m, { iniciativaActual: n }) : cambiarGrupo(f.clave, (e) => ({ ...e, ini: n }))} />
        {f.tipo === 'pj' && <button className="btn pequeno tirar-ini" title={L('Tirar iniciativa por el jugador', 'Бросить инициативу за игрока')}
          onClick={() => tirarD20(`${f.m.pj!.nombre || f.m.alias}: ${L('Iniciativa', 'Инициатива')}`, f.m.pj!.bonoIni, [], (t) => jugador(f.m, { iniciativaActual: t }))}>🎲</button>}
      </div>
      {f.tipo === 'pj' ? (
        <div className="combatiente">
          <div className="comb-cab">
            <button className="btn enlace nombre-comb" onClick={() => onAbrirPj?.(f.m.personaje!)}>{f.m.pj!.nombre || f.m.alias}</button>
            <span className="nota">@{f.m.alias} · 🛡 {f.m.pj!.ca}</span>
          </div>
          <VidaFila pg={f.m.pj!.pg.actual} max={f.m.pj!.pg.max} temp={f.m.pj!.pg.temp ?? 0} set={(pg, temp) => jugador(f.m, { pg: { ...f.m.pj!.pg, actual: pg, temp }, estados: estadosPorVida(f.m.pj!.estados, pg, false) })} />
          <ChipsEstados estados={f.m.pj!.estados} agotamiento={f.m.pj!.agotamiento} detalles={f.m.pj!.estadosDetalle} quien={f.m.pj!.nombre || f.m.alias} vacio set={(e, a, d) => jugador(f.m, { estados: e, agotamiento: a, estadosDetalle: d })} />
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
          <select className="campo chip-bando" value={bandoDe(f.enemigos[0].bando).id} onChange={(ev) => cambiarGrupo(f.clave, (e) => ({ ...e, bando: ev.target.value }))} aria-label={L('Bando', 'Сторона')}>
            {BANDOS.map((b) => <option key={b.id} value={b.id}>{L(b.es, b.ru)}</option>)}
          </select>
          {f.enemigos.map((e) => {
            const mo = monstruos?.find((m) => m.id === e.monstruo);
            return (
              <div key={e.id} className={`enemigo ${e.pg <= 0 ? 'caido' : ''}`}>
                <div className="comb-cab">
                  <button className="btn enlace nombre-comb" disabled={!mo} onClick={() => mo && setFicha({ m: mo, quien: e.nombre })}>{e.nombre}{mo ? ' ⓘ' : ''}</button>
                  <span className="nota">🛡 {e.ca}</span>
                  <button className="quitar-enemigo" title={L('Quitar del combate', 'Убрать из боя')} aria-label={L('Quitar del combate', 'Убрать из боя')} onClick={() => setEnemigos((es) => es.filter((x) => x.id !== e.id))}>✕</button>
                </div>
                <VidaFila pg={e.pg} max={e.pgMax} temp={e.temp ?? 0} set={(pg, temp) => cambiarEnemigo(e.id, (x) => ({ ...x, pg, temp, estados: estadosPorVida(x.estados, pg, true) }))} />
                <ChipsEstados estados={e.estados} agotamiento={e.agotamiento ?? 0} detalles={e.estadosDetalle} quien={e.nombre} vacio set={(es, a, d) => cambiarEnemigo(e.id, (x) => ({ ...x, estados: es, agotamiento: a, estadosDetalle: d }))} />
              </div>
            );
          })}
        </div>
      )}
    </li>
  );

  return (
    <section className="un-combate">
      <div className="cabecera-combate">
        <div><span className="etq-pequena">{L('Ronda', 'Раунд')}</span> <strong className="ronda">{k.ronda}</strong></div>
        <div className="fila-botones">
          <button className="btn primario" onClick={siguiente}>▶ {L('Siguiente turno', 'Следующий ход')}</button>
          <button className="btn" onClick={tirarEnemigos} disabled={!k.enemigos.some((e) => !enCombate(e.ini))}>🎲 {L('Iniciativa criaturas', 'Инициатива существ')}</button>
        </div>
      </div>
      <div className="cuerpo-combate">
      <div className="lado-combatientes">
      <ol className="orden-combate">{dentro.map(tarjeta)}</ol>
      {!filas.length && <p className="vacio">{L('Aún no hay nadie en este combate. Añade jugadores y criaturas con el botón «Encuentro».', 'В этом бою пока никого. Добавь игроков и существ кнопкой «Встреча».')}</p>}
      {fuera.length > 0 && <>
        <h3 className="titulo-fuera">{L('Fuera del combate (sin iniciativa)', 'Не в бою (без инициативы)')}</h3>
        <ol className="orden-combate fuera">{fuera.map(tarjeta)}</ol>
      </>}
      <div className="fila-botones pie-combate">
        <button className="btn primario" onClick={() => setAnadirPj(true)}>⚔️ {L('Encuentro', 'Встреча')}</button>
        <button className="btn peligro" onClick={terminar}>{L('Terminar combate', 'Закончить бой')}</button>
      </div>
      </div>
      <HistorialTiradas partida={partidaId} pjs={jugadores.map((m) => m.personaje!)} master={tiradasMaster} desde={k.desde} />
      </div>
      {anadirPj && <ModalAnadirJugadores todos={todos} enEste={jugadores.map((m) => m.personaje!)} nombre={nombre} pestanas={<PestanasEncuentro en="jugadores" ir={() => { setAnadirPj(false); setAnadir(true); }} />} onClose={() => setAnadirPj(false)} onAnadir={(ids) => { mover(ids, k.id); setAnadirPj(false); }} />}
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

/** Pestañas del «Encuentro»: jugadores o criaturas (aliados y enemigos). */
function PestanasEncuentro({ en, ir }: { en: 'jugadores' | 'criaturas'; ir: () => void }) {
  return (
    <div className="segmentado vista-partida">
      <button type="button" className={en === 'jugadores' ? 'activo' : ''} onClick={en === 'jugadores' ? undefined : ir}>👥 {L('Jugadores', 'Игроки')}</button>
      <button type="button" className={en === 'criaturas' ? 'activo' : ''} onClick={en === 'criaturas' ? undefined : ir}>🐉 {L('Criaturas', 'Существа')}</button>
    </div>
  );
}

/** Elegir qué jugadores entran en este combate (los que estén en otro se mueven aquí). */
function ModalAnadirJugadores({ todos, enEste, nombre, pestanas, onClose, onAnadir }: { todos: { m: Miembro; en: string | null }[]; enEste: string[]; nombre: string; pestanas: React.ReactNode; onClose: () => void; onAnadir: (ids: string[]) => void }) {
  const libres = todos.filter((x) => !enEste.includes(x.m.personaje!));
  const [sel, setSel] = useState<string[]>(() => libres.filter((x) => !x.en).map((x) => x.m.personaje!));
  const cambiar = (id: string) => setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <Modal titulo={L(`Encuentro: ${nombre}`, `Встреча: ${nombre}`)} onClose={onClose}
      pie={<><button className="btn" onClick={() => setSel(sel.length === libres.length ? [] : libres.map((x) => x.m.personaje!))}>{sel.length === libres.length ? L('Ninguno', 'Никого') : L('Todos', 'Все')}</button>
        <button className="btn primario" disabled={!sel.length} onClick={() => onAnadir(sel)}>{L('Añadir', 'Добавить')} ({sel.length})</button></>}>
      {pestanas}
      {libres.length === 0 ? <p className="nota">{L('Todos los jugadores con personaje ya están en este combate.', 'Все игроки с персонажами уже в этом бою.')}</p> : (
        <ul className="lista-anadir-pj">
          {libres.map(({ m, en }) => (
            <li key={m.personaje}>
              <label className="interruptor"><input type="checkbox" checked={sel.includes(m.personaje!)} onChange={() => cambiar(m.personaje!)} />
                <span><strong>{m.pj!.nombre || m.alias}</strong> <small>@{m.alias} · ❤️ {m.pj!.pg.actual}/{m.pj!.pg.max}{en ? ` · ${L('ahora en', 'сейчас в')} «${en}»` : ''}</small></span></label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ModalAnadirEnemigos({ monstruos, pestanas, onClose, onAnadir, onVer }: { monstruos: Monstruo[]; pestanas: React.ReactNode; onClose: () => void; onAnadir: (es: Enemigo[]) => void; onVer: (m: Monstruo) => void }) {
  const [q, setQ] = useState('');
  const [bando, setBando] = useState('A');
  const [sel, setSel] = useState<Monstruo | null>(null);
  const [cant, setCant] = useState(1);
  const [grupo, setGrupo] = useState(true);
  const [pgTirados, setPgTirados] = useState(false);
  const [propio, setPropio] = useState({ nombre: '', ca: 12, pg: 10, bono: 0 });
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return monstruos.filter((m) => !t || [m.es, m.ru, m.en].some((s) => s.toLowerCase().includes(t))).sort((a, b) => a.vd - b.vd || nombreM(a).localeCompare(nombreM(b)));
  }, [q, monstruos]);
  const tirarPg = (dg: string) => {
    const m = dg.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!m) return null;
    let t = Number(m[3] ?? 0); for (let i = 0; i < Number(m[1]); i++) t += 1 + Math.floor(Math.random() * Number(m[2]));
    return Math.max(1, t);
  };
  const crear = (base: { nombre: string; ca: number; pg: number; bono: number; dg?: string; id: string | null }) => {
    const g = cant > 1 && grupo ? uid() : null;
    return Array.from({ length: cant }, (_, i) => {
      const pg = pgTirados && base.dg ? tirarPg(base.dg) ?? base.pg : base.pg;
      return { id: uid(), monstruo: base.id, nombre: cant > 1 ? `${base.nombre} ${i + 1}` : base.nombre, grupo: g, ini: null, bonoIni: base.bono, pg, pgMax: pg, temp: 0, ca: base.ca, estados: [], bando } as Enemigo;
    });
  };
  return (
    <Modal titulo={L('Encuentro', 'Встреча')} onClose={onClose}
      pie={<>
        <span className="contador-enemigos">× <Numero valor={cant} min={1} max={30} ancho={56} set={setCant} /></span>
        <button className="btn primario" disabled={!sel && !propio.nombre.trim()} onClick={() => onAnadir(sel
          ? crear({ id: sel.id, nombre: nombreM(sel), ca: sel.ca, pg: sel.pg, dg: sel.dg, bono: mod(sel.car[1]) })
          : crear({ id: null, nombre: propio.nombre.trim(), ca: propio.ca, pg: propio.pg, bono: propio.bono }))}>{L('Añadir', 'Добавить')}</button>
      </>}>
      {pestanas}
      <p className="etq-pequena">{L('¿De qué bando?', 'На чьей стороне?')}</p>
      <SelectorBando valor={bando} set={setBando} />
      <input className="campo" autoFocus placeholder={L('Buscar: goblin, lobo, dragón…', 'Поиск: гоблин, волк, дракон…')} value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
      <p className="nota">{L(`${lista.length} de ${monstruos.length} monstruos`, `${lista.length} из ${monstruos.length} монстров`)}</p>
      <ul className="lista-monstruos">
        {lista.map((m) => (
          <li key={m.id} className={sel?.id === m.id ? 'sel' : ''}>
            <button type="button" onClick={() => setSel(m)}>
              <strong>{nombreM(m)}</strong>
              <small>{L('VD', 'ПО')} {vdTexto(m.vd)} · 🛡 {m.ca} · ❤️ {m.pg} · {idioma() === 'ru' ? m.tipo[1] : m.tipo[0]}</small>
            </button>
            <button type="button" className="btn enlace" onClick={() => onVer(m)}>ⓘ</button>
          </li>
        ))}
      </ul>
      <label className="interruptor"><input type="checkbox" checked={grupo} onChange={(e) => setGrupo(e.target.checked)} /> {L('Grupo: una sola iniciativa para todos', 'Группа: одна инициатива на всех')}</label>
      <label className="interruptor"><input type="checkbox" checked={pgTirados} onChange={(e) => setPgTirados(e.target.checked)} /> {L('Tirar los PG de cada uno (si no, la media)', 'Бросать хиты каждому (иначе — среднее)')}</label>
      <details className="enemigo-propio">
        <summary>{L('…o un enemigo propio', '…или свой враг')}</summary>
        <div className="fila-3">
          <label className="etiqueta"><span>{L('Nombre', 'Имя')}</span><input className="campo" value={propio.nombre} onChange={(e) => { setPropio({ ...propio, nombre: e.target.value }); setSel(null); }} /></label>
          <label className="etiqueta"><span>{L('CA', 'КД')}</span><Numero valor={propio.ca} min={0} set={(n) => setPropio({ ...propio, ca: n })} /></label>
          <label className="etiqueta"><span>{L('PG', 'Хиты')}</span><Numero valor={propio.pg} min={1} set={(n) => setPropio({ ...propio, pg: n })} /></label>
          <label className="etiqueta"><span>{L('Bono de iniciativa', 'Бонус инициативы')}</span><Numero valor={propio.bono} set={(n) => setPropio({ ...propio, bono: n })} /></label>
        </div>
      </details>
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
