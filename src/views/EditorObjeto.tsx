import { Etiqueta } from '../ui';
import { L } from '../i18n';
import type { Item } from '../types';

/**
 * Campos de combate de un objeto propio: daño y propiedades de un arma, CA de una armadura o escudo,
 * y bonificador mágico. Todo se guarda en `detalles` con el mismo formato que la base de objetos,
 * así Combate y la CA lo leen igual que un arma del manual.
 */
export function EditorObjeto({ it, set }: { it: Item; set: (f: (y: Item) => void) => void }) {
  if (it.tipo === 'arma') return <EditorArma it={it} set={set} />;
  if (it.tipo === 'armadura') return <EditorArmadura it={it} set={set} />;
  if (it.tipo === 'escudo') return <EditorEscudo it={it} set={set} />;
  return null;
}

const CARAS = [4, 6, 8, 10, 12, 20];
const TIPOS_DANO: [string, string][] = [
  ['Contundente', 'дробящий'], ['Cortante', 'рубящий'], ['Perforante', 'колющий'], ['Ácido', 'кислота'], ['Frío', 'холод'], ['Fuego', 'огонь'],
  ['Fuerza', 'силовое поле'], ['Necrótico', 'некротический'], ['Psíquico', 'психический'], ['Radiante', 'излучение'], ['Relámpago', 'молния'], ['Trueno', 'звук'], ['Veneno', 'яд'],
];
const CATEGORIAS: [string, string][] = [
  ['Arma sencilla cuerpo a cuerpo', 'Простое, ближний бой'], ['Arma marcial cuerpo a cuerpo', 'Воинское, ближний бой'],
  ['Arma sencilla a distancia', 'Простое, дальний бой'], ['Arma marcial a distancia', 'Воинское, дальний бой'], ['Arma exótica', 'Экзотическое'],
];
/** Propiedades que se marcan; las que llevan algo entre paréntesis lo sacan de «distancia» o «dado versátil». */
const PROPS: { id: string; es: string; ru: string; re: RegExp }[] = [
  { id: 'Ligera', es: 'Ligera', ru: 'Лёгкое', re: /\bliger[ao]\b/i },
  { id: 'Sutil', es: 'Sutil', ru: 'Фехтовальное', re: /\bsutil\b/i },
  { id: 'Pesada', es: 'Pesada', ru: 'Тяжёлое', re: /\bpesad[ao]\b/i },
  { id: 'A dos manos', es: 'A dos manos', ru: 'Двуручное', re: /dos manos/i },
  { id: 'Gran alcance', es: 'Gran alcance', ru: 'Досягаемость', re: /gran alcance/i },
  { id: 'Recarga', es: 'Recarga', ru: 'Перезарядка', re: /\brecarga\b/i },
  { id: 'Arrojadiza', es: 'Arrojadiza', ru: 'Метательное', re: /arrojadiz/i },
  { id: 'Munición', es: 'Munición', ru: 'Боеприпасы', re: /munici[oó]n/i },
  { id: 'Versátil', es: 'Versátil', ru: 'Универсальное', re: /vers[aá]til/i },
];

const leerDano = (s: string) => {
  const m = s.trim().match(/^(\d*)d(\d+)\s*(.*)$/i);
  if (m) return { n: parseInt(m[1] || '1', 10), caras: parseInt(m[2], 10), tipo: m[3] };
  const k = s.trim().match(/^(\d+)\s*(.*)$/);
  return { n: 0, caras: k ? parseInt(k[1], 10) : 6, tipo: k ? k[2] : '' };
};
const escribirDano = (n: number, caras: number, tipo: string) => `${n ? `${n}d${caras}` : caras}${tipo ? ` ${tipo}` : ''}`;

function SelectorDado({ valor, set, fijo }: { valor: { n: number; caras: number }; set: (n: number, caras: number) => void; fijo?: boolean }) {
  return (
    <span className="selector-dano">
      <select className="campo" value={valor.n} onChange={(e) => set(+e.target.value, valor.n === 0 && +e.target.value ? 6 : valor.caras)}>
        {fijo && <option value={0}>{L('Fijo', 'Число')}</option>}
        {Array.from({ length: 12 }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      {valor.n === 0
        ? <input className="campo" inputMode="numeric" value={valor.caras} onChange={(e) => set(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} />
        : <select className="campo" value={valor.caras} onChange={(e) => set(valor.n, +e.target.value)}>{CARAS.map((c) => <option key={c} value={c}>d{c}</option>)}</select>}
    </span>
  );
}

function SelectorMagico({ it, set, que }: { it: Item; set: (f: (y: Item) => void) => void; que: string }) {
  return (
    <Etiqueta texto={L(`Bonificador mágico (${que})`, `Магический бонус (${que})`)}>
      <select className="campo" value={it.magico ?? 0} onChange={(e) => set((y) => { const v = +e.target.value; if (v) y.magico = v; else delete y.magico; })}>
        {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v ? `+${v}` : L('Ninguno', 'Нет')}</option>)}
      </select>
    </Etiqueta>
  );
}

const tipoRu = (t: string) => TIPOS_DANO.find(([es]) => es.toLowerCase() === t.toLowerCase());

function EditorArma({ it, set }: { it: Item; set: (f: (y: Item) => void) => void }) {
  const det = it.detalles ?? {};
  const dano = leerDano(det['Daño'] ?? '1d6 Cortante');
  const props = det['Propiedades'] ?? '';
  const extra = leerDano(it.danoExtra ?? '');
  const rango = props.match(/\((?:alcance\s*)?(\d+\s*\/\s*\d+)\)/i)?.[1] ?? '';
  const versatil = props.match(/vers[aá]til\s*\((\d+d\d+)\)/i)?.[1] ?? '';
  const marcadas = PROPS.filter((x) => x.re.test(props)).map((x) => x.id);
  const setDet = (k: string, v: string) => set((y) => { y.detalles = { ...(y.detalles ?? {}), [k]: v }; if (!v) delete y.detalles[k]; });
  /** Rehace «Propiedades» a partir de las casillas, la distancia y el dado versátil. */
  const armar = (ids: string[], r: string, v: string) => ids.map((id) =>
    id === 'Arrojadiza' ? `Arrojadiza (${r || '20/60'})` : id === 'Munición' ? `Munición (alcance ${r || '80/320'})` : id === 'Versátil' ? `Versátil (${v || '1d8'})` : id).join(', ');
  const cambiarProps = (ids: string[], r = rango, v = versatil) => setDet('Propiedades', armar(ids, r, v));
  const conDistancia = marcadas.includes('Arrojadiza') || marcadas.includes('Munición');
  return (
    <div className="editor-objeto">
      <h4>⚔️ {L('Datos del arma', 'Параметры оружия')}</h4>
      <div className="rejilla-campos">
        <Etiqueta texto={L('Tipo de arma', 'Вид оружия')}>
          <select className="campo" value={det['Categoría'] ?? ''} onChange={(e) => setDet('Categoría', e.target.value)}>
            <option value="">—</option>
            {CATEGORIAS.map(([es, ru]) => <option key={es} value={es}>{L(es, ru)}</option>)}
          </select>
        </Etiqueta>
        <Etiqueta texto={L('Daño', 'Урон')}><SelectorDado fijo valor={dano} set={(n, c) => setDet('Daño', escribirDano(n, c, dano.tipo))} /></Etiqueta>
        <Etiqueta texto={L('Tipo de daño', 'Тип урона')}>
          <select className="campo" value={tipoRu(dano.tipo)?.[0] ?? dano.tipo} onChange={(e) => setDet('Daño', escribirDano(dano.n, dano.caras, e.target.value))}>
            {!tipoRu(dano.tipo) && dano.tipo && <option value={dano.tipo}>{dano.tipo}</option>}
            {TIPOS_DANO.map(([es, ru]) => <option key={es} value={es}>{L(es, ru)}</option>)}
          </select>
        </Etiqueta>
        <SelectorMagico it={it} set={set} que={L('ataque y daño', 'атака и урон')} />
      </div>
      <Etiqueta texto={L('Propiedades', 'Свойства')}>
        <div className="chips-estados">
          {PROPS.map((x) => {
            const on = marcadas.includes(x.id);
            return <button key={x.id} type="button" className={`chip pot${on ? ' activo' : ''}`} onClick={() => cambiarProps(on ? marcadas.filter((m) => m !== x.id) : [...marcadas, x.id])}>{on ? '✓ ' : ''}{L(x.es, x.ru)}</button>;
          })}
        </div>
      </Etiqueta>
      <div className="rejilla-campos">
        {conDistancia && <Etiqueta texto={L('Distancia (pies)', 'Дистанция (фт)')}><input className="campo" value={rango} placeholder="20/60" onChange={(e) => cambiarProps(marcadas, e.target.value.replace(/[^\d/]/g, ''))} /></Etiqueta>}
        {marcadas.includes('Versátil') && <Etiqueta texto={L('Daño a dos manos', 'Урон двумя руками')}>
          <select className="campo" value={versatil || '1d8'} onChange={(e) => cambiarProps(marcadas, rango, e.target.value)}>{['1d6', '1d8', '1d10', '1d12', '2d4', '2d6'].map((d) => <option key={d}>{d}</option>)}</select>
        </Etiqueta>}
      </div>
      <h4>✨ {L('Daño extra (mágico, elemental…)', 'Доп. урон (магия, стихия…)')}</h4>
      <div className="rejilla-campos">
        <Etiqueta texto={L('Dado', 'Кость')}>
          <span className="selector-dano">
            <select className="campo" value={it.danoExtra ? extra.n : -1} onChange={(e) => { const n = +e.target.value; set((y) => { if (n < 0) delete y.danoExtra; else y.danoExtra = escribirDano(n, n === 0 ? 1 : extra.caras || 6, extra.tipo || 'Fuego'); }); }}>
              <option value={-1}>{L('Ninguno', 'Нет')}</option>
              <option value={0}>{L('Fijo', 'Число')}</option>
              {Array.from({ length: 6 }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            {it.danoExtra && (extra.n === 0
              ? <input className="campo" inputMode="numeric" value={extra.caras} onChange={(e) => set((y) => { y.danoExtra = escribirDano(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0, extra.tipo); })} />
              : <select className="campo" value={extra.caras} onChange={(e) => set((y) => { y.danoExtra = escribirDano(extra.n, +e.target.value, extra.tipo); })}>{CARAS.map((c) => <option key={c} value={c}>d{c}</option>)}</select>)}
          </span>
        </Etiqueta>
        {it.danoExtra && <Etiqueta texto={L('Tipo', 'Тип')}>
          <select className="campo" value={tipoRu(extra.tipo)?.[0] ?? extra.tipo} onChange={(e) => set((y) => { y.danoExtra = escribirDano(extra.n, extra.caras, e.target.value); })}>
            {TIPOS_DANO.map(([es, ru]) => <option key={es} value={es}>{L(es, ru)}</option>)}
          </select>
        </Etiqueta>}
      </div>
      <p className="nota pequena">{L('Equípalo en una mano o ponlo en el cinturón y saldrá en Combate. Allí eliges con qué característica atacas.', 'Возьми в руку или повесь на пояс — оно появится во вкладке «Бой». Там же выбирается характеристика атаки.')}</p>
    </div>
  );
}

function EditorArmadura({ it, set }: { it: Item; set: (f: (y: Item) => void) => void }) {
  const det = it.detalles ?? {};
  const ca = det['Clase de armadura'] ?? '11 + modificador de Destreza';
  const base = parseInt(ca, 10) || 10;
  const tipo = /m[aá]x/i.test(ca) ? 'media' : /destreza/i.test(ca) ? 'ligera' : 'pesada';
  const escribir = (b: number, t: string) => t === 'ligera' ? `${b} + modificador de Destreza` : t === 'media' ? `${b} + modificador de Destreza (máx.2)` : `${b}`;
  const setDet = (k: string, v: string) => set((y) => { y.detalles = { ...(y.detalles ?? {}), [k]: v }; });
  return (
    <div className="editor-objeto">
      <h4>🛡️ {L('Datos de la armadura', 'Параметры доспеха')}</h4>
      <div className="rejilla-campos">
        <Etiqueta texto={L('Tipo', 'Тип')}>
          <select className="campo" value={tipo} onChange={(e) => setDet('Clase de armadura', escribir(base, e.target.value))}>
            <option value="ligera">{L('Ligera (CA + DES)', 'Лёгкий (КД + ЛОВ)')}</option>
            <option value="media">{L('Media (CA + DES, máx. 2)', 'Средний (КД + ЛОВ, макс. 2)')}</option>
            <option value="pesada">{L('Pesada (CA fija)', 'Тяжёлый (КД без ЛОВ)')}</option>
          </select>
        </Etiqueta>
        <Etiqueta texto={L('CA base', 'Базовый КД')}><input className="campo" inputMode="numeric" value={base} onChange={(e) => setDet('Clase de armadura', escribir(parseInt(e.target.value.replace(/\D/g, ''), 10) || 10, tipo))} /></Etiqueta>
        <SelectorMagico it={it} set={set} que={L('CA', 'КД')} />
        <Etiqueta texto={L('Fuerza mínima', 'Мин. Сила')}><input className="campo" inputMode="numeric" value={/^\d+$/.test(det['Fuerza'] ?? '') ? det['Fuerza'] : ''} placeholder="—" onChange={(e) => setDet('Fuerza', e.target.value.replace(/\D/g, '') || '--')} /></Etiqueta>
      </div>
      <label className="check-linea"><input type="checkbox" checked={/desventaja/i.test(det['Sigilo'] ?? '')} onChange={(e) => setDet('Sigilo', e.target.checked ? 'Desventaja' : '--')} /> {L('Desventaja en Sigilo', 'Помеха на Скрытность')}</label>
      <p className="nota pequena">{L('Póntela en «Armadura» y la CA se calcula sola.', 'Надень в слот «Доспех» — КД посчитается сам.')}</p>
    </div>
  );
}

function EditorEscudo({ it, set }: { it: Item; set: (f: (y: Item) => void) => void }) {
  const b = parseInt((it.detalles?.['Clase de armadura'] ?? '+2').replace(/[^\d-]/g, ''), 10) || 2;
  return (
    <div className="editor-objeto">
      <h4>🔰 {L('Datos del escudo', 'Параметры щита')}</h4>
      <div className="rejilla-campos">
        <Etiqueta texto={L('CA que da', 'Бонус КД')}><input className="campo" inputMode="numeric" value={b} onChange={(e) => set((y) => { y.detalles = { ...(y.detalles ?? {}), 'Clase de armadura': `+${parseInt(e.target.value.replace(/\D/g, ''), 10) || 2}` }; })} /></Etiqueta>
        <SelectorMagico it={it} set={set} que={L('CA', 'КД')} />
      </div>
    </div>
  );
}
