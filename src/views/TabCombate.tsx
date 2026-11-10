import { useFicha } from './Ficha';
import { BotonAnadir, Etiqueta, Numero, Seccion, Texto } from '../ui';
import { useDados } from '../dice';
import { CARACTERISTICA_CONJUROS, MAX_MUNICION, ataqueConjuros, avisosTirada, bonoArma, cdConjuros, conSigno, parseFormula, usaMunicion } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo, type Item, type Personaje } from '../types';
import { L, T, RU_CLASES, RU_NOMBRE_ATRIBUTO } from '../i18n';
import { tr } from '../ru';
import { td } from '../datosRu';
import { buscarClase } from '../avisos';
import { recursosPersonaje } from '../recursos';
import { alternarPotenciador, apagarDeUnGolpe, aplicaArma, potenciadoresDisponibles, sumarDano, type Potenciador } from '../potenciadores';

type ArmaLlevada = { it: Item; donde: string; ref: (x: Personaje) => Item | null | undefined };
/** Armas que llevas en las manos o en el cinturón: salen solas en Combate. */
function armasLlevadas(p: Personaje): ArmaLlevada[] {
  const out: ArmaLlevada[] = [];
  if (p.equipo.manoHabil?.tipo === 'arma') out.push({ it: p.equipo.manoHabil, donde: 'Mano hábil', ref: (x) => x.equipo.manoHabil });
  if (p.equipo.manoTorpe?.tipo === 'arma') out.push({ it: p.equipo.manoTorpe, donde: 'Mano torpe', ref: (x) => x.equipo.manoTorpe });
  p.cinturon.items.forEach((it) => { if (it.tipo === 'arma') out.push({ it, donde: 'Cinturón', ref: (x) => x.cinturon.items.find((y) => y.id === it.id) }); });
  return out;
}

export function TabCombate() {
  const { p, upd, clases } = useFicha();
  const clase = buscarClase(clases, p.clase);
  const disponibles = potenciadoresDisponibles(p, clase);
  const activos = new Set(p.potenciadores ?? []);
  const bonoAt = (l: Potenciador[]) => l.reduce((s, x) => s + (x.ataque ?? 0), 0);
  const extrasDano = (l: Potenciador[]) => l.map((x) => x.dano).filter(Boolean) as string[];
  const nombres = (l: Potenciador[]) => (l.length ? ` (${l.map((x) => L(x.es, x.ru)).join(', ')})` : '');
  const chips = (lista: Potenciador[]) => <ChipsPotenciadores lista={lista} activos={activos} alternar={(pt) => {
    // Se comprueba antes con una copia: upd() aplica el cambio más tarde.
    const falta = alternarPotenciador(structuredClone(p), pt, clase);
    if (!falta) upd((x) => { alternarPotenciador(x, pt, clase); });
    else {
      const r = recursosPersonaje(p, clase).find((y) => y.id === falta);
      alert(L(`No te quedan usos de ${r?.es ?? falta}.`, `Не осталось: ${r?.ru ?? falta}.`));
    }
  }} />;
  const { tirar, tirarD20 } = useDados();
  const cd = cdConjuros(p), at = ataqueConjuros(p);
  const llevadas = armasLlevadas(p);
  const auto = CARACTERISTICA_CONJUROS[p.clase];
  return (
    <div className="tab">
      <Seccion titulo="Ataques por turno">
        <div className="fila-2 alineada">
          <Etiqueta texto="Mano hábil"><Numero valor={p.ataquesTurno.habil} min={0} set={(n) => upd((x) => { x.ataquesTurno.habil = n; })} /></Etiqueta>
          <Etiqueta texto="Mano torpe"><Numero valor={p.ataquesTurno.torpe} min={0} set={(n) => upd((x) => { x.ataquesTurno.torpe = n; })} /></Etiqueta>
        </div>
      </Seccion>

      <Seccion titulo="Armas que llevas">
        {llevadas.length === 0 && <p className="nota">{L('Equipa un arma en la mano hábil o torpe, o ponla en el cinturón (Inventario), y aparecerá aquí con su ataque y daño.', 'Возьми оружие в ведущую или вторую руку или повесь на пояс (Инвентарь) — оно появится здесь с атакой и уроном.')}</p>}
        <ul className="lista-ataques">
          {llevadas.map(({ it, donde, ref }) => {
            const { ataque: ataqueBase, mod, atr, distancia } = bonoArma(p, it);
            const pots = disponibles.filter((pt) => aplicaArma(pt, it, atr, distancia));
            const act = pots.filter((pt) => activos.has(pt.id));
            const ataque = ataqueBase + bonoAt(act);
            const danoTxt = it.detalles?.['Daño'] ?? '';
            const dado = danoTxt.match(/^\s*(\d+d\d+|\d+)/i)?.[1] ?? '';
            const tipo = danoTxt.replace(/^\s*(\d+d\d+|\d+)\s*/i, '');
            const versatil = (it.detalles?.['Propiedades'] ?? '').match(/vers[aá]til\s*\((\d+d\d+)\)/i)?.[1];
            const formula = (d: string) => sumarDano(/d/.test(d) ? `${d}${mod ? conSigno(mod) : ''}` : `${Math.max(1, parseInt(d, 10) + mod)}`, extrasDano(act));
            const tirarDano = (titulo: string, f: string) => { tirar(`${titulo}: ${td(it.nombre)}${nombres(act)}`, f); upd((x) => apagarDeUnGolpe(x, act)); };
            const municion = usaMunicion(it);
            const sinMunicion = municion && !(it.municion ?? 0);
            return (
              <li key={it.id} className="ataque auto">
                <div className="ataque-titulo"><strong>{td(it.nombre)}</strong><small>{tr(donde)}{tipo ? ` · ${tipo}` : ''}</small></div>
                <div className="ataque-fila">
                  <button className="btn primario" disabled={sinMunicion} onClick={() => {
                    if (municion) upd((x) => { const y = ref(x); if (y) y.municion = Math.max(0, (y.municion ?? 0) - 1); });
                    tirarD20(`${L('Ataque', 'Атака')}: ${td(it.nombre)}${nombres(act.filter((x) => x.ataque))}`, ataque, avisosTirada(p, 'ataque', atr));
                  }}>🎲 {L('Ataque', 'Атака')} {conSigno(ataque)}</button>
                  {dado && <button className="btn" onClick={() => tirarDano(L('Daño', 'Урон'), formula(dado))}>🎲 {formula(dado)}</button>}
                  {versatil && <button className="btn" onClick={() => tirarDano(L('Daño a dos manos', 'Урон двумя руками'), formula(versatil))}>🎲 {L('A dos manos', 'Двумя руками')} {formula(versatil)}</button>}
                </div>
                {pots.length > 0 && chips(pots)}
                {municion && (
                  <div className="ataque-fila">
                    <span className={sinMunicion ? 'error' : 'nota'}>🏹 {L('Munición', 'Боеприпасы')}: {it.municion ?? 0}/{MAX_MUNICION}{sinMunicion ? L(' · ¡sin munición!', ' · закончились!') : ''}</span>
                    <button className="btn pequeno" onClick={() => upd((x) => { const y = ref(x); if (y) y.municion = MAX_MUNICION; })}>{L('Llenar', 'Пополнить')}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {llevadas.length > 0 && <p className="nota pequena">{L('Ataque = competencia + FUE (DES si es a distancia; la mejor si es sutil). Daño = dado del arma + el mismo modificador. Cada ataque con arco o ballesta gasta 1 de munición.', 'Атака = бонус мастерства + СИЛ (ЛОВ для дальнобойного; лучшая для фехтовального). Урон = кость оружия + тот же модификатор. Каждый выстрел из лука или арбалета тратит 1 боеприпас.')}</p>}
      </Seccion>

      <Seccion titulo="Otros ataques">
        <ul className="lista-ataques">
          {p.ataques.map((a, i) => {
            const pots = disponibles.filter((pt) => !pt.armas);
            const act = pots.filter((pt) => activos.has(pt.id));
            const bonBase = parseInt(a.ataque.replace(/\s/g, ''), 10);
            const bon = bonBase + bonoAt(act);
            const danoTot = a.dano ? sumarDano(a.dano, extrasDano(act)) : '';
            const danoOk = !!parseFormula(a.dano);
            return (
              <li key={i} className="ataque">
                <Texto valor={a.nombre} set={(s) => upd((x) => { x.ataques[i].nombre = s; })} placeholder="Nombre (p. ej. Espada corta c/c)" />
                <div className="ataque-fila">
                  <label>{L('Ataque', 'Атака')}<span className="con-mas"><span>+</span><input className="campo" inputMode="numeric" value={isNaN(bonBase) ? '' : String(Math.abs(bonBase))} placeholder="0"
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); upd((x) => { x.ataques[i].ataque = v ? `+${v}` : ''; }); }} /></span></label>
                  <button className="btn" disabled={isNaN(bon)} onClick={() => tirarD20(`${L('Ataque', 'Атака')}: ${a.nombre || L('arma', 'оружие')}${nombres(act.filter((x) => x.ataque))}`, bon, avisosTirada(p, 'ataque', null))}>🎲 d20{act.some((x) => x.ataque) && !isNaN(bon) ? ` ${conSigno(bon)}` : ''}</button>
                </div>
                <div className="ataque-fila">
                  <label>{L('Daño', 'Урон')}<SelectorDano valor={a.dano} set={(v) => upd((x) => { x.ataques[i].dano = v; })} /></label>
                  <button className="btn" disabled={!danoOk} onClick={() => { tirar(`${L('Daño', 'Урон')}: ${a.nombre || L('arma', 'оружие')}${nombres(act)}`, danoTot); upd((x) => apagarDeUnGolpe(x, act)); }}>🎲 {act.some((x) => x.dano) ? danoTot : L('Daño', 'Урон')}</button>
                </div>
                {pots.length > 0 && chips(pots)}
                <div className="ataque-fila derecha">
                  <button className="btn icono peligro-suave" title={L('Quitar', 'Убрать')} onClick={() => upd((x) => { x.ataques.splice(i, 1); })}>✕ {L('Quitar', 'Убрать')}</button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="fila-botones">
          <BotonAnadir onClick={() => upd((x) => { x.ataques.push({ nombre: '', ataque: '', dano: '1d6' }); })}>Añadir ataque</BotonAnadir>
        </div>
        <p className="nota">{L('Para ataques que no son de un arma que llevas (mordisco, arma improvisada…): pon tu bonificador y el dado de daño.', 'Для атак не тем оружием, что при тебе (укус, импровизированное оружие…): укажи бонус и кость урона.')}</p>
      </Seccion>

      <Seccion titulo="Conjuros">
        <Etiqueta texto="Característica de conjuros">
          <select className="campo" value={p.conjuroCaracteristica} onChange={(e) => upd((x) => { x.conjuroCaracteristica = e.target.value as Atributo | ''; })}>
            <option value="">{auto ? L(`Automática: ${NOMBRE_ATRIBUTO[auto]} (${p.clase})`, `Автоматически: ${T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[auto])} (${T(RU_CLASES, p.clase)})`) : L('— Ninguna —', '— Нет —')}</option>
            {ATRIBUTOS.map((a) => <option key={a} value={a}>{T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}</option>)}
          </select>
        </Etiqueta>
        <h4 className="subtitulo-campos">{L('Conjuros por turno', 'Заклинаний за ход')}</h4>
        <div className="fila-2 alineada">
          <Etiqueta texto="Estándar"><Texto valor={p.conjurosTurno.estandar} set={(s) => upd((x) => { x.conjurosTurno.estandar = s; })} /></Etiqueta>
          <Etiqueta texto="Adicional"><Texto valor={p.conjurosTurno.adicional} set={(s) => upd((x) => { x.conjurosTurno.adicional = s; })} /></Etiqueta>
        </div>
        <div className="fila-2 valores-conjuro">
          <div><small>{L('CD de conjuros', 'Сл заклинаний')}</small><strong>{cd ?? '—'}</strong></div>
          <div><small>{L('Ataque de conjuro', 'Атака заклинанием')}</small>{at !== null ? <button className="lt-valor" onClick={() => tirarD20(L('Ataque de conjuro', 'Атака заклинанием'), at)}>{conSigno(at)}</button> : <strong>—</strong>}</div>
        </div>
      </Seccion>
    </div>
  );
}

/** Botones para encender Furia, Ataque furtivo… en un arma. Encendido = dorado. */
function ChipsPotenciadores({ lista, activos, alternar }: { lista: Potenciador[]; activos: Set<string>; alternar: (pt: Potenciador) => void }) {
  return (
    <div className="chips-potenciadores">
      {lista.map((pt) => {
        const on = activos.has(pt.id);
        const efecto = [pt.ataque ? `${conSigno(pt.ataque)} ${L('at.', 'ат.')}` : '', pt.dano ? `${pt.dano.replace(/^(?=\d)/, '+')} ${L('daño', 'урон')}` : ''].filter(Boolean).join(' · ');
        const nota = L(pt.nota_es ?? '', pt.nota_ru ?? '');
        return (
          <button key={pt.id} type="button" className={`chip pot${on ? ' activo' : ''}`} title={nota + (pt.unaVez ? L(' Se apaga sola tras tirar el daño.', ' Выключится сама после броска урона.') : '')}
            onClick={() => alternar(pt)}>
            {on ? '✓ ' : ''}{L(pt.es, pt.ru)}<small>{efecto}</small>
          </button>
        );
      })}
    </div>
  );
}

const CARAS = [4, 6, 8, 10, 12, 20];
/** Daño como «NdX + B»: número de dados, tipo de dado y un + fijo con el bonificador. */
function SelectorDano({ valor, set }: { valor: string; set: (v: string) => void }) {
  const m = valor.replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/);
  if (valor && !m) {
    return (
      <span className="selector-dano libre">
        <input className="campo" value={valor} onChange={(e) => set(e.target.value)} />
        <button type="button" className="btn pequeno" onClick={() => set('1d6')}>{L('Usar selector', 'Выбрать из списка')}</button>
      </span>
    );
  }
  const n = m ? parseInt(m[1] || '1', 10) : 1;
  const caras = m ? parseInt(m[2], 10) : 6;
  const bono = m && m[4] ? (m[3] === '-' ? -1 : 1) * parseInt(m[4], 10) : 0;
  const armar = (nn: number, cc: number, bb: number) => set(`${nn}d${cc}${bb ? (bb > 0 ? `+${bb}` : `${bb}`) : ''}`);
  return (
    <span className="selector-dano">
      <select className="campo" value={n} onChange={(e) => armar(+e.target.value, caras, bono)}>{Array.from({ length: 12 }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}</select>
      <select className="campo" value={caras} onChange={(e) => armar(n, +e.target.value, bono)}>{CARAS.map((c) => <option key={c} value={c}>d{c}</option>)}</select>
      <span className="mas-fijo">+</span>
      <input className="campo" inputMode="numeric" value={bono ? String(bono) : ''} placeholder="0"
        onChange={(e) => { const t = e.target.value.replace(/[^\d-]/g, ''); const b = parseInt(t, 10); armar(n, caras, isNaN(b) ? 0 : b); }} />
    </span>
  );
}
