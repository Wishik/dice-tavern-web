import { useEffect, useMemo, useRef, useState } from 'react';
import { useDatos } from '../data';
import { L, idioma } from '../i18n';
import { Modal, Numero } from '../ui';
import { ChipsEstados } from '../estados';
import { useDados } from '../dice';
import { cambiarJugador, guardarCombate, type Combate as CombateT, type Enemigo, type Miembro, type Partida } from '../partidas';

export interface Monstruo {
  id: string; en: string; es: string; ru: string; tam: [string, string]; tipo: [string, string];
  ca: number; pg: number; dg: string; vel: Record<string, string>; car: number[]; vd: number; px: number; bc: number;
  sentidos: Record<string, string | number>; idiomas: string; res: string[]; inm: string[]; vul: string[]; inmEst: string[];
  rasgos: Accion[]; acciones: Accion[]; adicionales: Accion[]; reacciones: Accion[]; legendarias: Accion[];
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

/** Pestaña «Combate» del máster: orden de iniciativa de jugadores y enemigos, vida y estados de cada uno. */
export function PanelCombate({ partida, miembros, onRecargar, onAbrirPj }: { partida: Partida; miembros: Miembro[]; onRecargar: () => void; onAbrirPj?: (pj: string) => void }) {
  const monstruos = useDatos<Monstruo[]>('monstruos');
  const [c, setC] = useState<CombateT>(() => cacheCombate.get(partida.id) ?? partida.combate ?? { ronda: 1, turno: null, enemigos: [] });
  useEffect(() => { cacheCombate.set(partida.id, c); }, [c, partida.id]);
  const [anadir, setAnadir] = useState(false);
  const [ficha, setFicha] = useState<Monstruo | null>(null);
  const [error, setError] = useState('');
  const { tirar } = useDados();
  const primera = useRef(true);
  // Se guarda en la partida un momento después de cada cambio (solo el máster escribe aquí).
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => guardarCombate(partida.id, c).then(() => setError('')).catch((e) => setError(e.message)), 600);
    return () => clearTimeout(t);
  }, [c, partida.id]);

  const jugadores = miembros.filter((m) => m.usuario !== partida.master && m.pj && m.personaje);
  const filas: Fila[] = useMemo(() => {
    const grupos = new Map<string, Enemigo[]>();
    for (const e of c.enemigos) { const k = e.grupo ?? e.id; grupos.set(k, [...(grupos.get(k) ?? []), e]); }
    const f: Fila[] = [
      ...jugadores.map((m) => ({ tipo: 'pj' as const, clave: 'pj:' + m.personaje, ini: m.pj!.iniciativaActual, m })),
      ...[...grupos.entries()].map(([k, es]) => ({ tipo: 'grupo' as const, clave: 'g:' + k, ini: es[0].ini, enemigos: es })),
    ];
    return f.sort((a, b) => (b.ini ?? -100) - (a.ini ?? -100));
  }, [c.enemigos, jugadores]);

  const setEnemigos = (f: (es: Enemigo[]) => Enemigo[]) => setC((x) => ({ ...x, enemigos: f(x.enemigos) }));
  const cambiarEnemigo = (id: string, f: (e: Enemigo) => Enemigo) => setEnemigos((es) => es.map((e) => (e.id === id ? f(e) : e)));
  const cambiarGrupo = (clave: string, f: (e: Enemigo) => Enemigo) => setEnemigos((es) => es.map((e) => ('g:' + (e.grupo ?? e.id) === clave ? f(e) : e)));
  const jugador = async (m: Miembro, cambios: Record<string, unknown>) => {
    try { await cambiarJugador(m.personaje!, cambios); onRecargar(); } catch (e) { setError((e as Error).message); }
  };
  const tirarEnemigos = () => setEnemigos((es) => {
    const porGrupo = new Map<string, number>();
    return es.map((e) => {
      if (e.ini !== null) return e;
      const k = e.grupo ?? e.id;
      if (!porGrupo.has(k)) porGrupo.set(k, d20() + e.bonoIni);
      return { ...e, ini: porGrupo.get(k)! };
    });
  });
  const siguiente = () => {
    const vivas = filas.filter((f) => f.ini !== null && (f.tipo === 'pj' || f.enemigos.some((e) => e.pg > 0)));
    if (!vivas.length) return;
    const i = vivas.findIndex((f) => f.clave === c.turno);
    const sig = i < 0 ? 0 : (i + 1) % vivas.length;
    setC((x) => ({ ...x, turno: vivas[sig].clave, ronda: i >= 0 && sig === 0 ? x.ronda + 1 : x.ronda }));
  };
  const terminar = async () => {
    if (!confirm(L('¿Terminar el combate? Se quitan los enemigos y la iniciativa de todos.', 'Закончить бой? Враги и инициатива у всех будут сброшены.'))) return;
    setC({ ronda: 1, turno: null, enemigos: [] });
    await Promise.all(jugadores.filter((m) => m.pj!.iniciativaActual !== null).map((m) => cambiarJugador(m.personaje!, { iniciativaActual: null }).catch(() => {})));
    onRecargar();
  };

  return (
    <div className="panel-combate">
      <div className="cabecera-combate">
        <div><span className="etq-pequena">{L('Ronda', 'Раунд')}</span> <strong className="ronda">{c.ronda}</strong></div>
        <div className="fila-botones">
          <button className="btn primario" onClick={siguiente}>▶ {L('Siguiente turno', 'Следующий ход')}</button>
          <button className="btn" onClick={() => setAnadir(true)}>＋ {L('Enemigos', 'Враги')}</button>
          <button className="btn" onClick={tirarEnemigos} disabled={!c.enemigos.some((e) => e.ini === null)}>🎲 {L('Iniciativa enemigos', 'Инициатива врагов')}</button>
          <button className="btn peligro" onClick={terminar}>{L('Terminar combate', 'Закончить бой')}</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="nota">{L('Los jugadores tiran iniciativa en su hoja (Atributos → Iniciativa) y aparecen aquí en orden. También puedes escribirla tú.', 'Игроки бросают инициативу у себя в листе (Характеристики → Инициатива) и встают здесь по порядку. Можно вписать и вручную.')}</p>

      <ol className="orden-combate">
        {filas.map((f) => (
          <li key={f.clave} className={`fila-combate ${f.tipo} ${c.turno === f.clave ? 'turno' : ''}`}>
            <div className="ini-caja">
              <Numero valor={f.ini ?? 0} ancho={52} set={(n) => f.tipo === 'pj' ? jugador(f.m, { iniciativaActual: n }) : cambiarGrupo(f.clave, (e) => ({ ...e, ini: n }))} />
              {f.ini === null && <small>—</small>}
            </div>
            {f.tipo === 'pj' ? (
              <div className="combatiente">
                <div className="comb-cab">
                  <button className="btn enlace nombre-comb" onClick={() => onAbrirPj?.(f.m.personaje!)}>{f.m.pj!.nombre || f.m.alias}</button>
                  <span className="nota">@{f.m.alias} · 🛡 {f.m.pj!.ca}</span>
                </div>
                <VidaFila pg={f.m.pj!.pg.actual} max={f.m.pj!.pg.max} temp={f.m.pj!.pg.temp ?? 0} set={(pg, temp) => jugador(f.m, { pg: { ...f.m.pj!.pg, actual: pg, temp } })} />
                <ChipsEstados estados={f.m.pj!.estados} agotamiento={f.m.pj!.agotamiento} vacio set={(e, a) => jugador(f.m, { estados: e, agotamiento: a })} />
              </div>
            ) : (
              <div className="combatiente">
                {f.enemigos.map((e) => {
                  const mo = monstruos?.find((m) => m.id === e.monstruo);
                  return (
                    <div key={e.id} className={`enemigo ${e.pg <= 0 ? 'caido' : ''}`}>
                      <div className="comb-cab">
                        <button className="btn enlace nombre-comb" disabled={!mo} onClick={() => mo && setFicha(mo)}>{e.nombre}{mo ? ' ⓘ' : ''}</button>
                        <span className="nota">🛡 {e.ca}</span>
                        <button className="btn enlace quitar-enemigo" title={L('Quitar', 'Убрать')} onClick={() => setEnemigos((es) => es.filter((x) => x.id !== e.id))}>✕</button>
                      </div>
                      <VidaFila pg={e.pg} max={e.pgMax} temp={e.temp ?? 0} set={(pg, temp) => cambiarEnemigo(e.id, (x) => ({ ...x, pg, temp, estados: pg <= 0 && !x.estados.includes('inconsciente') ? [...x.estados, 'inconsciente'] : x.estados }))} />
                      <ChipsEstados estados={e.estados} agotamiento={0} vacio set={(es) => cambiarEnemigo(e.id, (x) => ({ ...x, estados: es }))} />
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}
        {!filas.length && <p className="vacio">{L('Aún no hay nadie en el combate. Añade enemigos o pide a los jugadores que tiren iniciativa.', 'В бою пока никого. Добавь врагов или попроси игроков бросить инициативу.')}</p>}
      </ol>

      {anadir && monstruos && <ModalAnadirEnemigos monstruos={monstruos} onClose={() => setAnadir(false)} onAnadir={(es) => { setEnemigos((x) => [...x, ...es]); setAnadir(false); }} onVer={setFicha} />}
      {ficha && <Modal titulo={nombreM(ficha)} onClose={() => setFicha(null)}><BloqueMonstruo m={ficha} tirar={tirar} /></Modal>}
    </div>
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

function ModalAnadirEnemigos({ monstruos, onClose, onAnadir, onVer }: { monstruos: Monstruo[]; onClose: () => void; onAnadir: (es: Enemigo[]) => void; onVer: (m: Monstruo) => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Monstruo | null>(null);
  const [cant, setCant] = useState(1);
  const [grupo, setGrupo] = useState(true);
  const [pgTirados, setPgTirados] = useState(false);
  const [propio, setPropio] = useState({ nombre: '', ca: 12, pg: 10, bono: 0 });
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return monstruos.filter((m) => !t || [m.es, m.ru, m.en].some((s) => s.toLowerCase().includes(t))).sort((a, b) => a.vd - b.vd || nombreM(a).localeCompare(nombreM(b))).slice(0, 80);
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
      return { id: uid(), monstruo: base.id, nombre: cant > 1 ? `${base.nombre} ${i + 1}` : base.nombre, grupo: g, ini: null, bonoIni: base.bono, pg, pgMax: pg, temp: 0, ca: base.ca, estados: [] } as Enemigo;
    });
  };
  return (
    <Modal titulo={L('Añadir enemigos', 'Добавить врагов')} onClose={onClose}
      pie={<>
        <span className="contador-enemigos">× <Numero valor={cant} min={1} max={30} ancho={56} set={setCant} /></span>
        <button className="btn primario" disabled={!sel && !propio.nombre.trim()} onClick={() => onAnadir(sel
          ? crear({ id: sel.id, nombre: nombreM(sel), ca: sel.ca, pg: sel.pg, dg: sel.dg, bono: mod(sel.car[1]) })
          : crear({ id: null, nombre: propio.nombre.trim(), ca: propio.ca, pg: propio.pg, bono: propio.bono }))}>{L('Añadir', 'Добавить')}</button>
      </>}>
      <input className="campo" autoFocus placeholder={L('Buscar: goblin, lobo, dragón…', 'Поиск: гоблин, волк, дракон…')} value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
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
export function BloqueMonstruo({ m, tirar }: { m: Monstruo; tirar?: (etq: string, formula: string) => unknown }) {
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
