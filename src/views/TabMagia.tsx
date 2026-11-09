import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Check, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { useDatos, type Conjuro } from '../data';
import type { ConjuroPersonaje } from '../types';
import { useDados } from '../dice';
import { ataqueConjuros, cdConjuros, conSigno, dadosConjuro, multiplicadorTruco } from '../rules';
import { L } from '../i18n';
import { tr } from '../ru';
import { td } from '../datosRu';

const nombreNivel = (i: number) => i === 0 ? L('Trucos', 'Заговоры') : `${L('Nivel', 'Уровень')} ${i}`;
const NIVELES = Array.from({ length: 10 }, (_, i) => i);

export function TabMagia() {
  const { p, upd, avisos } = useFicha();
  const todos = useDatos<Conjuro[]>('spells');
  const [anadir, setAnadir] = useState<null | 'truco' | 'conjuro' | 'adicional'>(null);
  const [todasClases, setTodasClases] = useState(false);
  const [ver, setVer] = useState<{ c: ConjuroPersonaje; def?: Conjuro } | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; nivel: number; adicional: boolean; base?: Conjuro; descripcion: string } | null>(null);
  const [elegirBase, setElegirBase] = useState(false);
  const claseMin = p.clase.toLowerCase();
  const nTrucos = p.conjuros.filter((c) => c.nivel === 0 && !c.adicional).length;
  const nConj = p.conjuros.filter((c) => c.nivel > 0 && !c.adicional).length;
  const def = (n: string) => todos?.find((x) => x.nombre === n);
  const nPrep = p.conjuros.filter((c) => c.nivel > 0 && !c.adicional && c.preparado).length;
  const llenoTrucos = avisos.limiteTrucos !== null && nTrucos >= avisos.limiteTrucos;
  const llenoConj = avisos.limiteConjuros !== null && !avisos.conjurosAbierto && nConj >= avisos.limiteConjuros;
  const lleno = (que: string, n: number) => alert(L(`Ya tienes los ${n} ${que} que te tocan a nivel ${p.nivel}. Quita uno para cambiarlo, o añádelo en «Conjuros adicionales» si te lo da la raza, una dote o un objeto.`, `У тебя уже ${n} ${que === 'trucos' ? 'заговоров' : 'заклинаний'} — столько положено на ${p.nivel} уровне. Убери одно, чтобы заменить, или добавь в «Дополнительные заклинания», если его даёт раса, черта или предмет.`));

  const ListaConjuros = ({ lista, preparar }: { lista: { c: ConjuroPersonaje; idx: number }[]; preparar: boolean }) => (
    <ul className="lista-conjuros">
      {lista.map(({ c, idx }) => {
        const d = def(c.nombre);
        return (
          <li key={idx}>
            {preparar && <Check valor={!!c.preparado} set={(b) => {
              if (b && avisos.limitePreparados !== null && nPrep >= avisos.limitePreparados) { alert(L(`Ya tienes ${avisos.limitePreparados} conjuros preparados, el máximo a nivel ${p.nivel}. Desmarca otro primero.`, `Уже подготовлено ${avisos.limitePreparados} заклинаний — максимум на ${p.nivel} уровне. Сначала сними отметку с другого.`)); return; }
              upd((x) => { x.conjuros[idx].preparado = b; });
            }} titulo="Preparado" />}
            <button className="conjuro-nombre" onClick={() => setVer({ c, def: d })}>
              <strong>{td(c.nombre)}{c.adicional ? <small className="etq-nivel"> · {c.nivel ? `${L('Nv', 'Ур')} ${c.nivel}` : L('Truco', 'Заговор')}</small> : null}</strong>
              {c.base && <small>{L('Propio, basado en', 'Своё, на основе')} {td(c.base)}</small>}
              {d && <small>{td(d.escuela)} · {td(d.tiempo)} · {td(d.alcance)}{/concentración/i.test(d.duracion) ? L(' · Conc.', ' · Конц.') : ''}</small>}
            </button>
          </li>
        );
      })}
    </ul>
  );
  const conIdx = p.conjuros.map((c, idx) => ({ c, idx }));
  const porNivel = NIVELES.map((_, i) => conIdx.filter(({ c }) => c.nivel === i && !c.adicional));
  const adicionales = conIdx.filter(({ c }) => c.adicional).sort((a, b) => a.c.nivel - b.c.nivel);

  return (
    <div className="tab">
      <Seccion titulo="Trucos" aviso={avisos.trucos} extra={avisos.limiteTrucos !== null && <span className="contador-limite">{nTrucos}/{avisos.limiteTrucos}</span>}>
        <BotonAnadir aviso={avisos.trucos > 0} onClick={() => llenoTrucos ? lleno('trucos', avisos.limiteTrucos!) : setAnadir('truco')}>Añadir truco</BotonAnadir>
        {porNivel[0].length > 0 && <ListaConjuros lista={porNivel[0]} preparar={false} />}
      </Seccion>
      <Seccion titulo="Conjuros" aviso={avisos.conjuros} extra={avisos.limiteConjuros !== null && <span className="contador-limite">{nConj}/{avisos.limiteConjuros}</span>}>
        <BotonAnadir aviso={avisos.conjuros > 0} onClick={() => llenoConj ? lleno('conjuros', avisos.limiteConjuros!) : setAnadir('conjuro')}>Añadir conjuro</BotonAnadir>
        {avisos.limitePreparados !== null && nConj > 0 && <p className={`nota ${nPrep > avisos.limitePreparados ? 'error' : ''}`}>{L('Preparados', 'Подготовлено')}: {nPrep}/{avisos.limitePreparados}</p>}
        {avisos.nivelMaxConjuro !== null && <p className="nota">{L('Nivel máximo de conjuro', 'Максимальный уровень заклинаний')}: {avisos.nivelMaxConjuro}</p>}
        {porNivel.slice(1).map((lista, k) => lista.length > 0 && (
          <div key={k}>
            <h4 className="nivel-conjuro">{nombreNivel(k + 1)}</h4>
            <ListaConjuros lista={lista} preparar />
          </div>
        ))}
        {nConj > 0 && <p className="nota pequena">{L('● = preparado: los que tienes listos para lanzar hoy. Márcalos tras un descanso largo si tu clase prepara conjuros.', '● = подготовлено: то, что готово к накладыванию сегодня. Отмечай после долгого отдыха, если твой класс готовит заклинания.')}</p>}
      </Seccion>
      <Seccion titulo="Conjuros adicionales">
        <p className="nota pequena">{L('De tu raza, dotes, objetos o rasgos (p. ej. Taumaturgia de los Trols). No cuentan para el límite de tu clase.', 'От расы, черт, предметов или умений (напр. Чудотворство троллей). Не считаются в лимит класса.')}</p>
        <BotonAnadir onClick={() => setAnadir('adicional')}>Añadir conjuro adicional</BotonAnadir>
        {adicionales.length > 0 && <ListaConjuros lista={adicionales} preparar={false} />}
      </Seccion>
      {!p.clase && <p className="nota">{L('Elige una clase en «Personaje» para ver cuántos trucos y conjuros te tocan.', 'Выбери класс в «Персонаже», чтобы увидеть, сколько заговоров и заклинаний положено.')}</p>}

      {p.conjuros.length === 0 && <p className="vacio">{L('Aún no tienes conjuros.', 'Пока нет заклинаний.')}</p>}

      {anadir && (
        <Modal titulo={tr(anadir === 'truco' ? 'Añadir truco' : anadir === 'adicional' ? 'Añadir conjuro adicional' : 'Añadir conjuro')} onClose={() => setAnadir(null)}>
          {claseMin && anadir !== 'adicional' && (
            <label className="interruptor"><input type="checkbox" checked={todasClases} onChange={(e) => setTodasClases(e.target.checked)} /> {anadir === 'truco' ? L('Mostrar trucos de todas las clases', 'Показать заговоры всех классов') : L('Mostrar conjuros de todas las clases', 'Показать заклинания всех классов')}</label>
          )}
          {!todos ? <p>{L('Cargando…', 'Загрузка…')}</p> : (
            <Buscador<Conjuro>
              items={todos}
              texto={(c) => c.nombre}
              placeholder={anadir === 'truco' ? L('Escribe el nombre del truco…', 'Напиши название заговора…') : L('Escribe el nombre del conjuro…', 'Напиши название заклинания…')}
              filtro={(c) => (anadir === 'adicional' || (anadir === 'truco' ? c.nivel === 0 : c.nivel > 0))
                && (anadir === 'adicional' || todasClases || !claseMin || c.clases.includes(claseMin))
                && !p.conjuros.some((x) => x.nombre === c.nombre)}
              render={(c) => <span className="res-conjuro"><strong>{td(c.nombre)}</strong><small>{c.nivel ? `${L('Nivel', 'Уровень')} ${c.nivel}` : L('Truco', 'Заговор')} · {td(c.escuela)} · {c.clases.join(', ')}</small></span>}
              onElegir={(c) => {
                if (typeof c === 'string') { setNuevo({ nombre: c, nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '' }); setAnadir(null); return; }
                upd((x) => { x.conjuros.push({ nombre: c.nombre, nivel: c.nivel, ...(anadir === 'adicional' ? { adicional: true } : {}) }); });
                setAnadir(null);
              }}
            />
          )}
          <button className="btn crear-propio" onClick={() => { setNuevo({ nombre: '', nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '' }); setAnadir(null); }}>✏️ {L('Crear conjuro propio (puede basarse en otro)', 'Создать своё заклинание (можно на основе другого)')}</button>

        </Modal>
      )}
      {nuevo && (
        <Modal titulo="Crear conjuro propio" onClose={() => setNuevo(null)}
          pie={<button className="btn primario" disabled={!nuevo.nombre.trim()} onClick={() => {
            upd((x) => { x.conjuros.push({ nombre: nuevo.nombre.trim(), nivel: nuevo.nivel, ...(nuevo.adicional ? { adicional: true } : {}), ...(nuevo.base ? { base: nuevo.base.nombre } : {}), descripcion: nuevo.descripcion }); });
            setNuevo(null);
          }}>{L('Guardar conjuro', 'Сохранить заклинание')}</button>}>
          <label className="etiqueta"><span>{L('Nombre de tu conjuro', 'Название твоего заклинания')}</span>
            <input className="campo" value={nuevo.nombre} placeholder={tr('p. ej. Bola de hielo de Wishik')} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </label>
          <label className="etiqueta"><span>{L('Basado en (opcional)', 'На основе (по желанию)')}</span>
            <button type="button" className="campo boton-exp" onClick={() => setElegirBase(true)}>{nuevo.base ? td(nuevo.base.nombre) : L('Elegir un conjuro base…', 'Выбрать базовое заклинание…')}</button>
          </label>
          <label className="etiqueta"><span>{L('Nivel', 'Уровень')}</span>
            <select className="campo" value={nuevo.nivel} onChange={(e) => setNuevo({ ...nuevo, nivel: +e.target.value })}>{NIVELES.map((i) => <option key={i} value={i}>{i === 0 ? L('Truco', 'Заговор') : nombreNivel(i)}</option>)}</select>
          </label>
          <label className="etiqueta"><span>{L('Descripción', 'Описание')}{nuevo.base ? L(` (copiada de ${nuevo.base.nombre}: cámbiala como quieras)`, ` (скопировано из «${nuevo.base.nombre}»: меняй как хочешь)`) : ''}</span>
            <Texto multilinea filas={10} valor={nuevo.descripcion} set={(v) => setNuevo((n) => n && { ...n, descripcion: v })} placeholder="Qué hace, daño, alcance, duración…" />
          </label>
          {elegirBase && todos && (
            <Modal titulo="Conjuro base" onClose={() => setElegirBase(false)}>
              <Buscador<Conjuro> items={todos} texto={(c) => c.nombre} placeholder="Busca el conjuro base…"
                render={(c) => <span className="res-conjuro"><strong>{td(c.nombre)}</strong><small>{c.nivel ? `${L('Nivel', 'Уровень')} ${c.nivel}` : L('Truco', 'Заговор')} · {td(c.escuela)}</small></span>}
                onElegir={(c) => {
                  if (typeof c !== 'string') setNuevo((n) => n && { ...n, base: c, nivel: c.nivel, descripcion: `${td(c.tiempo)} · ${td(c.alcance)} · ${td(c.componentes)} · ${td(c.duracion)}\n\n${td(c.descripcion)}` });
                  setElegirBase(false);
                }} />
            </Modal>
          )}
        </Modal>
      )}
      {ver && (
        <Modal titulo={td(ver.c.nombre)} onClose={() => setVer(null)}
          pie={<button className="btn peligro" onClick={() => { upd((x) => { const i = x.conjuros.findIndex((c) => c.nombre === ver.c.nombre && c.nivel === ver.c.nivel); if (i >= 0) x.conjuros.splice(i, 1); }); setVer(null); }}>{L('Quitar de la lista', 'Убрать из списка')}</button>}>
          {(() => {
            const mio = p.conjuros.find((c) => c.nombre === ver.c.nombre);
            if (mio && mio.descripcion !== undefined) return <>
              <Lanzar texto={mio.descripcion} nivel={mio.nivel} nombre={mio.nombre} />
              <p className="subtitulo">{L('Conjuro propio', 'Своё заклинание')}{mio.base ? L(` basado en ${mio.base}`, ` на основе «${mio.base}»`) : ''}</p>
              <label className="etiqueta"><span>{L('Descripción (puedes cambiarla)', 'Описание (можно менять)')}</span>
                <Texto multilinea filas={8} valor={mio.descripcion} set={(v) => upd((x) => { const c = x.conjuros.find((c) => c.nombre === ver.c.nombre); if (c) c.descripcion = v; })} />
              </label>
            </>;
            return <>
              <Lanzar texto={ver.def?.descripcion ?? ''} nivel={ver.c.nivel} nombre={ver.c.nombre} />
              {ver.def ? <FichaConjuro c={ver.def} /> : <p className="nota">{L('Conjuro personalizado (no está en la base).', 'Своё заклинание (нет в базе).')}</p>}
            </>;
          })()}
          <label className="etiqueta"><span>{L('Mis notas', 'Мои заметки')}</span>
            <Texto multilinea filas={3} valor={p.conjuros.find((c) => c.nombre === ver.c.nombre)?.notas ?? ''} set={(v) => upd((x) => { const c = x.conjuros.find((c) => c.nombre === ver.c.nombre); if (c) c.notas = v; })} />
          </label>
        </Modal>
      )}
      {(avisos.trucos > 0 || avisos.conjuros > 0) && <p className="aviso-rojo"><PuntoRojo /> {L(`Según tu clase y nivel puedes aprender ${[avisos.trucos && `${avisos.trucos} truco(s)`, avisos.conjuros && `${avisos.conjuros} conjuro(s)`].filter(Boolean).join(' y ')} más.`, `По классу и уровню можно выучить ещё: ${[avisos.trucos && `заговоры — ${avisos.trucos}`, avisos.conjuros && `заклинания — ${avisos.conjuros}`].filter(Boolean).join(', ')}.`)}</p>}
    </div>
  );
}

export function FichaConjuro({ c }: { c: Conjuro }) {
  return (
    <>
      <p className="subtitulo">{c.nivel ? L(`${c.escuela[0].toUpperCase() + c.escuela.slice(1)} de nivel ${c.nivel}`, `${td(c.escuela)}, ${c.nivel} уровень`) : L(`Truco de ${c.escuela}`, `Заговор (${td(c.escuela)})`)} ({c.clases.join(', ')})</p>
      <dl className="lista-datos">
        <dt>{tr('Tiempo de lanzamiento')}</dt><dd>{td(c.tiempo)}</dd><dt>{tr('Alcance')}</dt><dd>{td(c.alcance)}</dd>
        <dt>{tr('Componentes')}</dt><dd>{td(c.componentes)}</dd><dt>{tr('Duración')}</dt><dd>{td(c.duracion)}</dd>
      </dl>
      <TextoLargo texto={c.descripcion} />
    </>
  );
}

/** Botones para usar el conjuro: tirada de ataque, CD de la salvación y dados de daño/curación (con la mejora por nivel). */
function Lanzar({ texto, nivel, nombre }: { texto: string; nivel: number; nombre: string }) {
  const { p, avisos } = useFicha();
  const { tirar, tirarD20 } = useDados();
  const at = ataqueConjuros(p), cd = cdConjuros(p);
  const maxEsp = Math.max(nivel, Math.min(9, avisos.nivelMaxConjuro ?? 9));
  const [espacio, setEspacio] = useState(nivel);
  const pideAtaque = /tirada de ataque|ataque de conjuro/i.test(texto);
  const pideSalvacion = /tirada de salvaci[oó]n/i.test(texto);
  const sube = nivel > 0 && /aumenta en \d+d\d+ por cada nivel por encima/i.test(texto);
  const dados = dadosConjuro(texto, nivel, p.nivel, espacio);
  const mejoraTruco = nivel === 0 && /mejora de truco/i.test(texto) && multiplicadorTruco(p.nivel) > 1;
  if (at === null && dados.length === 0) {
    return <p className="nota">{L('Para lanzar con ataque, elige la «Característica de conjuros» en la pestaña Combate.', 'Чтобы атаковать заклинанием, выбери «Заклинательную характеристику» на вкладке «Бой».')}</p>;
  }
  return (
    <div className="lanzar">
      {sube && (
        <label className="etiqueta espacio-conjuro"><span>{L('Espacio de conjuro', 'Ячейка заклинания')}</span>
          <select className="campo" value={espacio} onChange={(e) => setEspacio(+e.target.value)}>
            {Array.from({ length: maxEsp - nivel + 1 }, (_, k) => nivel + k).map((n) => <option key={n} value={n}>{L('Nivel', 'Уровень')} {n}{n === nivel ? L(' (base)', ' (базовый)') : ''}</option>)}
          </select>
        </label>
      )}
      {at !== null && (pideAtaque || !pideSalvacion) && <button className="btn primario" onClick={() => tirarD20(`${L('Ataque', 'Атака')}: ${nombre}`, at)}>🎲 {L('Ataque', 'Атака')} {conSigno(at)}</button>}
      {cd !== null && pideSalvacion && <span className="cd-chip">{L('El objetivo salva contra CD', 'Цель делает спасбросок, Сл')} <strong>{cd}</strong></span>}
      {dados.map((d) => <button key={d} className="btn" onClick={() => tirar(`${nombre} (${d})`, d)}>🎲 {d}</button>)}
      {mejoraTruco && <p className="nota pequena">{L(`Daño mejorado por tu nivel ${p.nivel} (trucos: ×2 a nivel 5, ×3 a nivel 11, ×4 a nivel 17).`, `Урон усилен за твой ${p.nivel} уровень (заговоры: ×2 на 5, ×3 на 11, ×4 на 17 уровне).`)}</p>}
      {at === null && (pideAtaque || pideSalvacion) && <p className="nota">{L('Elige la «Característica de conjuros» en Combate para ver tu ataque y CD.', 'Выбери «Заклинательную характеристику» во вкладке «Бой», чтобы видеть атаку и Сл.')}</p>}
    </div>
  );
}
