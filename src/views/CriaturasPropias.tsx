import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { L, idioma } from '../i18n';
import { Modal, Numero } from '../ui';
import { HABILIDADES } from '../rules';
import { ESTADOS } from '../estados';
import { BloqueMonstruo, type Monstruo } from './Combate';

/* Criaturas creadas por el máster: se guardan solo en su partida y se pueden pasar a otra con un código o un QR. */

type Accion = { n: string; d: string };
type Ataque = NonNullable<Monstruo['atq']>[number];

const uid = () => Math.random().toString(36).slice(2, 10);
const mod = (v: number) => Math.floor((v - 10) / 2);
const signo = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const ru = () => idioma() === 'ru';
const ATR = () => (ru() ? ['СИЛ', 'ЛОВ', 'ТЕЛ', 'ИНТ', 'МДР', 'ХАР'] : ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']);
const ATR_ID = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];

const TAMANOS: [string, string][] = [['Diminuto', 'Крошечный'], ['Pequeño', 'Маленький'], ['Mediano', 'Средний'], ['Grande', 'Большой'], ['Enorme', 'Огромный'], ['Gargantuesco', 'Громадный']];
const DADO_TAMANO = [4, 6, 8, 10, 12, 20];
export const TIPOS_DANO: [string, string][] = [['ácido', 'кислота'], ['contundente', 'дробящий'], ['cortante', 'рубящий'], ['frío', 'холод'], ['fuego', 'огонь'], ['fuerza', 'силовое поле'], ['necrótico', 'некротическая энергия'], ['perforante', 'колющий'], ['psíquico', 'психическая энергия'], ['radiante', 'излучение'], ['relámpago', 'электричество'], ['trueno', 'звук'], ['veneno', 'яд']];
const VDS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)];
const PX: Record<string, number> = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
const bcDeVd = (vd: number) => (vd < 5 ? 2 : 2 + Math.ceil((vd - 4) / 4));
const vdTexto = (v: number) => (v === 0.125 ? '1/8' : v === 0.25 ? '1/4' : v === 0.5 ? '1/2' : String(v));
const VELS: [string, string, string][] = [['walk', 'Andando', 'Шагом'], ['fly', 'Volando', 'Полёт'], ['swim', 'Nadando', 'Плавание'], ['climb', 'Trepando', 'Лазание'], ['burrow', 'Excavando', 'Копание']];
const SENTIDOS: [string, string, string][] = [['darkvision', 'Visión en la oscuridad', 'Тёмное зрение'], ['blindsight', 'Vista ciega', 'Слепое зрение'], ['truesight', 'Visión verdadera', 'Истинное зрение'], ['tremorsense', 'Sentido de la vibración', 'Чувство вибрации']];
const pies = (v: string | number | undefined) => parseInt(String(v ?? '0'), 10) || 0;

const nueva = (): Monstruo => ({
  id: 'p-' + uid(), en: '', es: '', ru: '', tam: TAMANOS[2], tipo: ['humanoide', 'гуманоид'], ca: 12, pg: 11, dg: '2d8+2', vel: { walk: '30 ft.' },
  car: [10, 10, 10, 10, 10, 10], vd: 1, px: 200, bc: 2, sentidos: { passive_perception: 10 }, idiomas: '', res: [], inm: [], vul: [], inmEst: [],
  rasgos: [], acciones: [], adicionales: [], reacciones: [], legendarias: [], atq: [], salv: [null, null, null, null, null, null], hab: [], propia: true,
});
/** Completa campos que falten (criaturas importadas o copiadas de la lista). */
const completar = (m: Partial<Monstruo>): Monstruo => {
  const b = nueva();
  const r = { ...b, ...m } as Monstruo;
  for (const k of ['res', 'inm', 'vul', 'inmEst', 'rasgos', 'acciones', 'adicionales', 'reacciones', 'legendarias', 'atq', 'hab'] as const) if (!Array.isArray(r[k])) (r as unknown as Record<string, unknown[]>)[k] = [];
  if (!Array.isArray(r.car) || r.car.length !== 6) r.car = b.car;
  if (!Array.isArray(r.salv) || r.salv.length !== 6) r.salv = b.salv;
  return r;
};
const mediaDados = (dg: string) => {
  const m = dg.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  return m ? Math.max(1, Math.floor((Number(m[1]) * (Number(m[2]) + 1)) / 2) + Number(m[3] ?? 0)) : null;
};

/* ---------- Código para exportar / importar ---------- */

const b64u = (u8: Uint8Array) => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64u = (t: string) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
const pasar = async (u8: Uint8Array, t: TransformStream<Uint8Array, Uint8Array>) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(t)).arrayBuffer());

/** Convierte la criatura en un texto corto que se puede copiar o meter en un QR. */
export async function aCodigo(m: Monstruo): Promise<string> {
  const { id: _id, ...resto } = m;
  const json = new TextEncoder().encode(JSON.stringify(resto));
  if (typeof CompressionStream !== 'undefined') return 'DT1' + b64u(await pasar(json, new CompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>));
  return 'DT0' + b64u(json);
}
/** Lee un código (o el enlace del QR) y devuelve la criatura con un id nuevo. */
export async function deCodigo(texto: string): Promise<Monstruo> {
  let t = texto.trim();
  try { const u = new URL(t); t = u.searchParams.get('criatura') ?? t; } catch { /* no es un enlace */ }
  const malo = new Error(L('Ese código no es válido.', 'Этот код неверный.'));
  const pref = t.slice(0, 3);
  let bytes: Uint8Array;
  try { bytes = deB64u(t.slice(3)); } catch { throw malo; }
  if (pref === 'DT1') bytes = await pasar(bytes, new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>).catch(() => { throw malo; });
  else if (pref !== 'DT0') throw malo;
  let m: Partial<Monstruo>;
  try { m = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw malo; }
  if (!m || typeof m.es !== 'string' || !m.es) throw malo;
  return completar({ ...m, id: 'p-' + uid(), propia: true });
}
export const enlaceCriatura = (codigo: string) => `${location.origin}/?criatura=${codigo}`;

// Criatura recibida por enlace o QR (?criatura=…): se guarda hasta que el máster la añada a una partida.
const CLAVE = 'dt-criatura-recibida';
export function guardarCriaturaDeUrl() {
  const c = new URLSearchParams(location.search).get('criatura');
  if (c) try { localStorage.setItem(CLAVE, c); } catch { /* sin almacenamiento */ }
}
const leerPendiente = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const borrarPendiente = () => { try { localStorage.removeItem(CLAVE); } catch { /* nada */ } };
export const hayCriaturaRecibida = () => !!leerPendiente();

/** Aviso en el combate del máster cuando ha abierto un enlace o QR de una criatura. */
export function AvisoCriaturaRecibida({ onAnadir }: { onAnadir: (m: Monstruo) => void }) {
  const [codigo, setCodigo] = useState(leerPendiente);
  const [m, setM] = useState<Monstruo | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (codigo) deCodigo(codigo).then(setM).catch((e) => setError(e.message)); }, [codigo]);
  if (!codigo) return null;
  const cerrar = () => { borrarPendiente(); setCodigo(null); };
  return (
    <div className="aviso-criatura">
      <span>📥 {m ? L(`Has recibido la criatura «${m.es}».`, `Тебе передали существо «${m.es}».`) : error || L('Leyendo la criatura recibida…', 'Читаю полученное существо…')}</span>
      {m && <button className="btn primario pequeno" onClick={() => { onAnadir(m); cerrar(); }}>{L('Añadir a esta partida', 'Добавить в эту партию')}</button>}
      <button className="btn pequeno" onClick={cerrar}>{L('Descartar', 'Отказаться')}</button>
    </div>
  );
}

/* ---------- Biblioteca de la partida ---------- */

export function BibliotecaCriaturas({ criaturas, set, monstruos, onClose }: { criaturas: Monstruo[]; set: (f: (l: Monstruo[]) => Monstruo[]) => void; monstruos: Monstruo[]; onClose: () => void }) {
  const [editando, setEditando] = useState<Monstruo | null>(null);
  const [viendo, setViendo] = useState<Monstruo | null>(null);
  const [exportando, setExportando] = useState<Monstruo | null>(null);
  const [importando, setImportando] = useState(false);
  if (editando) return <EditorCriatura inicial={editando} monstruos={monstruos} onCancelar={() => setEditando(null)}
    onGuardar={(m) => { set((l) => (l.some((x) => x.id === m.id) ? l.map((x) => (x.id === m.id ? m : x)) : [...l, m])); setEditando(null); }} />;
  if (viendo) return <Modal titulo={viendo.es} onClose={() => setViendo(null)}><BloqueMonstruo m={viendo} /></Modal>;
  if (exportando) return <ModalExportar m={exportando} onClose={() => setExportando(null)} />;
  if (importando) return <ModalImportar onClose={() => setImportando(false)} onAnadir={(m) => { set((l) => [...l, m]); setImportando(false); }} />;
  return (
    <Modal titulo={L('Criaturas propias', 'Свои существа')} onClose={onClose}
      pie={<><button className="btn" onClick={() => setImportando(true)}>📥 {L('Importar', 'Импорт')}</button><button className="btn primario" onClick={() => setEditando(nueva())}>＋ {L('Crear criatura', 'Создать существо')}</button></>}>
      <p className="nota">{L('Las criaturas que crees aquí solo existen en esta partida y salen primero (con ⭐) al añadir criaturas en «Encuentro». Con «Exportar» puedes pasarlas a otra partida.', 'Созданные здесь существа есть только в этой партии и идут первыми (со ⭐) при добавлении во «Встрече». Через «Экспорт» их можно перенести в другую партию.')}</p>
      {criaturas.length === 0 ? <p className="vacio">{L('Todavía no has creado ninguna criatura.', 'Ты ещё не создал ни одного существа.')}</p> : (
        <ul className="lista-criaturas">
          {criaturas.map((m) => (
            <li key={m.id}>
              <button className="btn enlace" onClick={() => setViendo(m)}><strong>⭐ {m.es}</strong> <small>{L('VD', 'ПО')} {vdTexto(m.vd)} · 🛡 {m.ca} · ❤️ {m.pg}</small></button>
              <span className="acciones-criatura">
                <button className="btn pequeno" onClick={() => setEditando(m)}>✎ {L('Editar', 'Изменить')}</button>
                <button className="btn pequeno" onClick={() => setExportando(m)}>📤 {L('Exportar', 'Экспорт')}</button>
                <button className="quitar-enemigo" aria-label={L('Borrar', 'Удалить')} title={L('Borrar', 'Удалить')} onClick={() => { if (confirm(L(`¿Borrar «${m.es}» de esta partida?`, `Удалить «${m.es}» из этой партии?`))) set((l) => l.filter((x) => x.id !== m.id)); }}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ModalExportar({ m, onClose }: { m: Monstruo; onClose: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { aCodigo(m).then(setCodigo); }, [m]);
  const qr = useMemo(() => {
    if (!codigo) return '';
    try { const q = qrcode(0, 'L'); q.addData(enlaceCriatura(codigo)); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { return ''; }
  }, [codigo]);
  const copiar = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true); } catch { /* sin permiso */ } };
  const compartir = () => navigator.share?.({ title: m.es, text: L(`Criatura «${m.es}» para Dice Tavern`, `Существо «${m.es}» для Dice Tavern`), url: enlaceCriatura(codigo) }).catch(() => {});
  return (
    <Modal titulo={L(`Exportar «${m.es}»`, `Экспорт «${m.es}»`)} onClose={onClose}
      pie={<>{'share' in navigator && <button className="btn" disabled={!codigo} onClick={compartir}>🔗 {L('Compartir enlace', 'Поделиться ссылкой')}</button>}
        <button className="btn primario" disabled={!codigo} onClick={copiar}>{copiado ? '✓ ' + L('Copiado', 'Скопировано') : '📋 ' + L('Copiar código', 'Скопировать код')}</button></>}>
      <p className="nota">{L('En la otra partida pulsa «Criaturas propias» → «Importar» y pega este código. O escanea el QR con la cámara del móvil y abre la partida donde la quieras.', 'В другой партии нажми «Свои существа» → «Импорт» и вставь этот код. Или отсканируй QR камерой телефона и открой нужную партию.')}</p>
      {qr ? <div className="qr-criatura" dangerouslySetInnerHTML={{ __html: qr }} /> : codigo && <p className="nota">{L('La criatura tiene demasiado texto para un QR: usa el código.', 'У существа слишком много текста для QR — используй код.')}</p>}
      <textarea className="campo codigo-criatura" readOnly value={codigo} rows={4} onFocus={(e) => e.target.select()} />
    </Modal>
  );
}

function ModalImportar({ onClose, onAnadir }: { onClose: () => void; onAnadir: (m: Monstruo) => void }) {
  const [texto, setTexto] = useState('');
  const [m, setM] = useState<Monstruo | null>(null);
  const [error, setError] = useState('');
  const leer = (t: string) => { setTexto(t); setM(null); setError(''); if (t.trim()) deCodigo(t).then(setM).catch((e) => setError(e.message)); };
  return (
    <Modal titulo={L('Importar criatura', 'Импорт существа')} onClose={onClose}
      pie={<button className="btn primario" disabled={!m} onClick={() => m && onAnadir(m)}>{L('Añadir a esta partida', 'Добавить в эту партию')}</button>}>
      <p className="nota">{L('Pega el código (o el enlace) que te dio «Exportar».', 'Вставь код (или ссылку) из «Экспорта».')}</p>
      <textarea className="campo codigo-criatura" rows={4} autoFocus value={texto} onChange={(e) => leer(e.target.value)} placeholder="DT1…" />
      {error && <p className="error">{error}</p>}
      {m && <p>✓ <strong>{m.es}</strong> <small>{L('VD', 'ПО')} {vdTexto(m.vd)} · 🛡 {m.ca} · ❤️ {m.pg}</small></p>}
    </Modal>
  );
}

/* ---------- Editor ---------- */

function Seccion({ titulo, children, abierta }: { titulo: string; children: React.ReactNode; abierta?: boolean }) {
  return <details className="seccion-criatura" open={abierta}><summary>{titulo}</summary><div className="cuerpo-seccion">{children}</div></details>;
}

function Chips({ opciones, sel, set }: { opciones: string[]; sel: string[]; set: (l: string[]) => void }) {
  return (
    <div className="chips-eleccion">
      {opciones.map((o) => <button key={o} type="button" className={`chip ${sel.includes(o) ? 'activo' : ''}`} onClick={() => set(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])}>{o}</button>)}
    </div>
  );
}

function ListaAcciones({ lista, set, ejemplo }: { lista: Accion[]; set: (l: Accion[]) => void; ejemplo: string }) {
  return (
    <div className="lista-acciones-edit">
      {lista.map((a, i) => (
        <div key={i} className="accion-edit">
          <div className="fila-accion">
            <input className="campo" placeholder={L('Nombre', 'Название')} value={a.n} onChange={(e) => set(lista.map((x, j) => (j === i ? { ...x, n: e.target.value } : x)))} />
            <button type="button" className="quitar-enemigo" aria-label={L('Quitar', 'Убрать')} onClick={() => set(lista.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea className="campo" rows={3} placeholder={L('Descripción', 'Описание')} value={a.d} onChange={(e) => set(lista.map((x, j) => (j === i ? { ...x, d: e.target.value } : x)))} />
        </div>
      ))}
      <button type="button" className="btn pequeno" onClick={() => set([...lista, { n: '', d: '' }])}>＋ {L('Añadir', 'Добавить')} <small>({ejemplo})</small></button>
    </div>
  );
}

function EditorAtaques({ lista, set, bc, car }: { lista: Ataque[]; set: (l: Ataque[]) => void; bc: number; car: number[] }) {
  const cambiar = (i: number, f: (a: Ataque) => Ataque) => set(lista.map((x, j) => (j === i ? f(x) : x)));
  const nombreTipo = (t: [string, string]) => (ru() ? t[1] : t[0]);
  return (
    <div className="lista-acciones-edit">
      {lista.map((a, i) => (
        <div key={i} className="accion-edit">
          <div className="fila-accion">
            <input className="campo" placeholder={L('Nombre (Mordisco, Aliento…)', 'Название (Укус, Дыхание…)')} value={ru() ? a.ru : a.es} onChange={(e) => cambiar(i, (x) => ({ ...x, es: e.target.value, ru: e.target.value }))} />
            <button type="button" className="quitar-enemigo" aria-label={L('Quitar', 'Убрать')} onClick={() => set(lista.filter((_, j) => j !== i))}>✕</button>
          </div>
          <div className="fila-ataque">
            <select className="campo" value={a.bono !== undefined ? 'atq' : 'sal'} onChange={(e) => cambiar(i, (x) => (e.target.value === 'atq' ? { es: x.es, ru: x.ru, dano: x.dano, bono: bc + mod(car[0]) } : { es: x.es, ru: x.ru, dano: x.dano, cd: 8 + bc + mod(car[2]), sal: 1 }))}>
              <option value="atq">🎯 {L('Tirada de ataque', 'Бросок атаки')}</option>
              <option value="sal">✨ {L('Salvación (CD)', 'Спасбросок (Сл)')}</option>
            </select>
            {a.bono !== undefined
              ? <label className="etiqueta"><span>{L('Bono', 'Бонус')}</span><Numero valor={a.bono} ancho={64} set={(n) => cambiar(i, (x) => ({ ...x, bono: n }))} /></label>
              : <>
                  <label className="etiqueta"><span>{L('CD', 'Сл')}</span><Numero valor={a.cd ?? 10} ancho={64} set={(n) => cambiar(i, (x) => ({ ...x, cd: n }))} /></label>
                  <label className="etiqueta"><span>{L('Salvación de', 'Спасбросок')}</span>
                    <select className="campo" value={a.sal ?? 1} onChange={(e) => cambiar(i, (x) => ({ ...x, sal: Number(e.target.value) }))}>{ATR().map((t, j) => <option key={j} value={j}>{t}</option>)}</select></label>
                </>}
          </div>
          {a.dano.map((d, j) => (
            <div key={j} className="fila-ataque">
              <input className="campo" style={{ maxWidth: 120 }} placeholder="2d8+4" value={d.d} onChange={(e) => cambiar(i, (x) => ({ ...x, dano: x.dano.map((y, k) => (k === j ? { ...y, d: e.target.value.replace(/\s/g, '') } : y)) }))} />
              <select className="campo" value={d.t[0]} onChange={(e) => cambiar(i, (x) => ({ ...x, dano: x.dano.map((y, k) => (k === j ? { ...y, t: TIPOS_DANO.find((t) => t[0] === e.target.value) ?? y.t } : y)) }))}>
                {TIPOS_DANO.map((t) => <option key={t[0]} value={t[0]}>{nombreTipo(t)}</option>)}
              </select>
              <button type="button" className="btn enlace pequeno" onClick={() => cambiar(i, (x) => ({ ...x, dano: x.dano.filter((_, k) => k !== j) }))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn enlace pequeno" onClick={() => cambiar(i, (x) => ({ ...x, dano: [...x.dano, { d: '1d6', t: TIPOS_DANO[1] }] }))}>＋ {L('Daño', 'Урон')}</button>
        </div>
      ))}
      <button type="button" className="btn pequeno" onClick={() => set([...lista, { es: '', ru: '', bono: bc + mod(car[0]), dano: [{ d: '1d8' + signo(mod(car[0])).replace('+0', ''), t: TIPOS_DANO[2] }] }])}>＋ {L('Ataque o efecto con tirada', 'Атака или эффект с броском')}</button>
    </div>
  );
}

function EditorCriatura({ inicial, monstruos, onGuardar, onCancelar }: { inicial: Monstruo; monstruos: Monstruo[]; onGuardar: (m: Monstruo) => void; onCancelar: () => void }) {
  const [m, setM] = useState<Monstruo>(() => completar(structuredClone(inicial)));
  const [base, setBase] = useState('');
  const c = <K extends keyof Monstruo>(k: K, v: Monstruo[K]) => setM((x) => ({ ...x, [k]: v }));
  const nuevaCriatura = !inicial.es;
  const parecidos = useMemo(() => {
    const t = base.trim().toLowerCase();
    return t.length < 2 ? [] : monstruos.filter((x) => [x.es, x.ru, x.en].some((s) => s.toLowerCase().includes(t))).slice(0, 8);
  }, [base, monstruos]);
  const copiarDe = (x: Monstruo) => { setM(completar({ ...structuredClone(x), id: m.id, propia: true, es: `${x.es} (${L('copia', 'копия')})`, ru: `${x.ru} (${L('copia', 'копия')})` })); setBase(''); };
  const setNombre = (v: string) => setM((x) => ({ ...x, es: v, ru: v, en: v }));
  const setVd = (vd: number) => setM((x) => ({ ...x, vd, px: PX[String(vd)] ?? 0, bc: bcDeVd(vd) }));
  const setVel = (k: string, n: number) => setM((x) => { const v = { ...x.vel }; if (n > 0) v[k] = `${n} ft.`; else delete v[k]; return { ...x, vel: v }; });
  const setSentido = (k: string, n: number) => setM((x) => { const v = { ...x.sentidos }; if (n > 0) v[k] = `${n} ft.`; else delete v[k]; return { ...x, sentidos: v }; });
  const salv = m.salv ?? [null, null, null, null, null, null];
  const hab = m.hab ?? [];
  const valorHab = (id: string) => { const h = HABILIDADES.find((x) => x.id === id)!; return mod(m.car[ATR_ID.indexOf(h.atributo)]) + m.bc; };
  const pasiva = 10 + (hab.find((h) => h.id === 'percepcion')?.v ?? mod(m.car[4]));
  const tipos = TIPOS_DANO.map((t) => (ru() ? t[1] : t[0]));
  const estados = ESTADOS.filter((e) => !['concentrado', 'muerto', 'moribundo'].includes(e.id)).map((e) => (ru() ? e.ru : e.es));
  const guardar = () => onGuardar({ ...m, es: m.es.trim(), ru: m.es.trim(), en: m.es.trim(), sentidos: { ...m.sentidos, passive_perception: pasiva }, propia: true });
  const media = mediaDados(m.dg);
  const dadoSug = DADO_TAMANO[Math.max(0, TAMANOS.findIndex((t) => t[0] === m.tam[0]))];

  return (
    <Modal titulo={nuevaCriatura ? L('Crear criatura', 'Создать существо') : L(`Editar «${inicial.es}»`, `Изменить «${inicial.es}»`)} onClose={onCancelar}
      pie={<><button className="btn" onClick={onCancelar}>{L('Cancelar', 'Отмена')}</button><button className="btn primario" disabled={!m.es.trim()} onClick={guardar}>{L('Guardar', 'Сохранить')}</button></>}>
      <div className="editor-criatura">
        {nuevaCriatura && (
          <div className="partir-de">
            <input className="campo" placeholder={L('Opcional: copiar un monstruo de la lista como punto de partida…', 'Необязательно: взять монстра из списка за основу…')} value={base} onChange={(e) => setBase(e.target.value)} />
            {parecidos.length > 0 && <ul className="sugerencias">{parecidos.map((x) => <li key={x.id}><button type="button" onClick={() => copiarDe(x)}>{ru() ? x.ru : x.es} <small>{L('VD', 'ПО')} {vdTexto(x.vd)}</small></button></li>)}</ul>}
          </div>
        )}

        <Seccion titulo={L('Lo básico', 'Основное')} abierta>
          <label className="etiqueta"><span>{L('Nombre', 'Имя')}</span><input className="campo" value={m.es} onChange={(e) => setNombre(e.target.value)} placeholder={L('Dragón azul anciano', 'Древний синий дракон')} /></label>
          <div className="rejilla-criatura">
            <label className="etiqueta"><span>{L('Tamaño', 'Размер')}</span>
              <select className="campo" value={m.tam[0]} onChange={(e) => c('tam', TAMANOS.find((t) => t[0] === e.target.value) ?? TAMANOS[2])}>{TAMANOS.map((t) => <option key={t[0]} value={t[0]}>{ru() ? t[1] : t[0]}</option>)}</select></label>
            <label className="etiqueta"><span>{L('Tipo', 'Тип')}</span><input className="campo" value={ru() ? m.tipo[1] : m.tipo[0]} onChange={(e) => c('tipo', [e.target.value, e.target.value])} placeholder={L('dragón, no muerto…', 'дракон, нежить…')} /></label>
            <label className="etiqueta"><span>{L('VD', 'ПО')}</span>
              <select className="campo" value={m.vd} onChange={(e) => setVd(Number(e.target.value))}>{VDS.map((v) => <option key={v} value={v}>{vdTexto(v)}</option>)}</select></label>
            <label className="etiqueta"><span>{L('PX', 'Опыт')}</span><Numero valor={m.px} min={0} set={(n) => c('px', n)} /></label>
            <label className="etiqueta"><span>{L('Bono de competencia', 'Бонус мастерства')}</span><Numero valor={m.bc} min={0} set={(n) => c('bc', n)} /></label>
            <label className="etiqueta"><span>{L('CA', 'КД')}</span><Numero valor={m.ca} min={0} set={(n) => c('ca', n)} /></label>
            <label className="etiqueta"><span>{L('PG (media)', 'Хиты (среднее)')}</span><Numero valor={m.pg} min={1} set={(n) => c('pg', n)} /></label>
            <label className="etiqueta"><span>{L('Dados de golpe', 'Кости хитов')}</span><input className="campo" value={m.dg} placeholder={`10d${dadoSug}+20`} onChange={(e) => c('dg', e.target.value)} /></label>
          </div>
          {media !== null && media !== m.pg && <button type="button" className="btn enlace pequeno" onClick={() => c('pg', media)}>{L(`Usar la media de los dados: ${media} PG`, `Взять среднее по костям: ${media}`)}</button>}
          <p className="nota">{L(`Tamaño ${m.tam[0]}: dado de golpe d${dadoSug}. Suma la CON (${signo(mod(m.car[2]))}) por cada dado.`, `Размер ${m.tam[1]}: кость хитов d${dadoSug}. Прибавь ТЕЛ (${signo(mod(m.car[2]))}) за каждую кость.`)}</p>
        </Seccion>

        <Seccion titulo={L('Características y salvaciones', 'Характеристики и спасброски')} abierta>
          <div className="car-criatura">
            {m.car.map((v, i) => (
              <div key={i} className="car-c">
                <small>{ATR()[i]}</small>
                <Numero valor={v} min={1} max={30} ancho={56} set={(n) => c('car', m.car.map((x, j) => (j === i ? n : x)))} />
                <span className="nota">{signo(mod(v))}</span>
                <label className="salv-c" title={L('Competente en la salvación', 'Владение спасброском')}>
                  <input type="checkbox" checked={salv[i] !== null} onChange={(e) => c('salv', salv.map((x, j) => (j === i ? (e.target.checked ? mod(v) + m.bc : null) : x)))} /> {L('Salv.', 'Спас.')}
                </label>
                {salv[i] !== null && <Numero valor={salv[i]!} ancho={56} set={(n) => c('salv', salv.map((x, j) => (j === i ? n : x)))} />}
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo={L(`Habilidades (${hab.length})`, `Навыки (${hab.length})`)}>
          {hab.map((h, i) => (
            <div key={i} className="fila-ataque">
              <select className="campo" value={h.id} onChange={(e) => c('hab', hab.map((x, j) => (j === i ? { id: e.target.value, v: valorHab(e.target.value) } : x)))}>
                {HABILIDADES.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
              <Numero valor={h.v} ancho={64} set={(n) => c('hab', hab.map((x, j) => (j === i ? { ...x, v: n } : x)))} />
              <button type="button" className="btn enlace pequeno" onClick={() => c('hab', hab.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn pequeno" onClick={() => { const id = HABILIDADES.find((x) => !hab.some((h) => h.id === x.id))?.id ?? 'percepcion'; c('hab', [...hab, { id, v: valorHab(id) }]); }}>＋ {L('Habilidad', 'Навык')}</button>
          <p className="nota">{L('Al añadirla se pone característica + competencia; cámbialo si tiene pericia.', 'По умолчанию — характеристика + мастерство; измени, если есть экспертиза.')}</p>
        </Seccion>

        <Seccion titulo={L('Velocidad, sentidos e idiomas', 'Скорость, чувства и языки')}>
          <div className="rejilla-criatura">
            {VELS.map(([k, es, r]) => <label key={k} className="etiqueta"><span>{ru() ? r : es} ({L('pies', 'фт')})</span><Numero valor={pies(m.vel[k])} min={0} set={(n) => setVel(k, n)} /></label>)}
            {SENTIDOS.map(([k, es, r]) => <label key={k} className="etiqueta"><span>{ru() ? r : es} ({L('pies', 'фт')})</span><Numero valor={pies(m.sentidos[k])} min={0} set={(n) => setSentido(k, n)} /></label>)}
          </div>
          <label className="interruptor"><input type="checkbox" checked={!!m.vel.hover} onChange={(e) => setM((x) => { const v = { ...x.vel }; if (e.target.checked) v.hover = ''; else delete v.hover; return { ...x, vel: v }; })} /> {L('Flota (no cae si queda derribado)', 'Парит')}</label>
          <p className="nota">{L(`Percepción pasiva: ${pasiva} (se calcula sola)`, `Пассивная внимательность: ${pasiva} (считается сама)`)}</p>
          <label className="etiqueta"><span>{L('Idiomas', 'Языки')}</span><input className="campo" value={m.idiomas} onChange={(e) => c('idiomas', e.target.value)} placeholder={L('Común, Dracónico; telepatía 120 pies', 'Общий, Драконий')} /></label>
        </Seccion>

        <Seccion titulo={L('Resistencias e inmunidades', 'Сопротивления и иммунитеты')}>
          <p className="etq-pequena">{L('Resistencias', 'Сопротивления')}</p><Chips opciones={tipos} sel={m.res} set={(l) => c('res', l)} />
          <p className="etq-pequena">{L('Inmunidades al daño', 'Иммунитет к урону')}</p><Chips opciones={tipos} sel={m.inm} set={(l) => c('inm', l)} />
          <p className="etq-pequena">{L('Vulnerabilidades', 'Уязвимости')}</p><Chips opciones={tipos} sel={m.vul} set={(l) => c('vul', l)} />
          <p className="etq-pequena">{L('Inmune a estados', 'Иммунитет к состояниям')}</p><Chips opciones={estados} sel={m.inmEst} set={(l) => c('inmEst', l)} />
        </Seccion>

        <Seccion titulo={L(`Ataques con botón de tirada (${m.atq?.length ?? 0})`, `Атаки с кнопкой броска (${m.atq?.length ?? 0})`)}>
          <p className="nota">{L('Salen en el combate como botones para tirar el ataque y el daño (p. ej. Desgarrar +16, 2d8+9 cortante + 2d10 relámpago; Aliento: CD 23 DES, 16d10 relámpago).', 'В бою они будут кнопками броска атаки и урона.')}</p>
          <EditorAtaques lista={m.atq ?? []} set={(l) => c('atq', l)} bc={m.bc} car={m.car} />
        </Seccion>

        <Seccion titulo={L(`Rasgos (${m.rasgos.length})`, `Особенности (${m.rasgos.length})`)}><ListaAcciones lista={m.rasgos} set={(l) => c('rasgos', l)} ejemplo={L('Resistencia legendaria, Anfibio…', 'Легендарное сопротивление…')} /></Seccion>
        <Seccion titulo={L(`Acciones (${m.acciones.length})`, `Действия (${m.acciones.length})`)}><ListaAcciones lista={m.acciones} set={(l) => c('acciones', l)} ejemplo={L('Ataque múltiple, Lanzamiento de conjuros…', 'Мультиатака, Колдовство…')} /></Seccion>
        <Seccion titulo={L(`Acciones adicionales (${m.adicionales.length})`, `Бонусные действия (${m.adicionales.length})`)}><ListaAcciones lista={m.adicionales} set={(l) => c('adicionales', l)} ejemplo={L('acción adicional', 'бонусное действие')} /></Seccion>
        <Seccion titulo={L(`Reacciones (${m.reacciones.length})`, `Реакции (${m.reacciones.length})`)}><ListaAcciones lista={m.reacciones} set={(l) => c('reacciones', l)} ejemplo={L('Parada…', 'Парирование…')} /></Seccion>
        <Seccion titulo={L(`Acciones legendarias (${m.legendarias.length})`, `Легендарные действия (${m.legendarias.length})`)}><ListaAcciones lista={m.legendarias} set={(l) => c('legendarias', l)} ejemplo={L('Vuelo encubierto, Coletazo…', 'Взмах хвостом…')} /></Seccion>
      </div>
    </Modal>
  );
}
