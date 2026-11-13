import { Fragment, useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Check, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { useDatos, type Conjuro } from '../data';
import type { ConjuroPersonaje } from '../types';
import { useDados } from '../dice';
import { ataqueConjuros, cdConjuros, conSigno, dadosConjuro, multiplicadorTruco } from '../rules';
import { L, T, RU_CLASES } from '../i18n';
import { esMulticlase } from '../multiclase';
import { claseDeConjuro, type MagiaClase } from '../avisos';
import { tr } from '../ru';
import { td } from '../datosRu';
import { FUENTES, cantidadEleccion, eleccionesPendientes, opcionesEleccion, concesionesActivas, type Concesion, type Fuente } from '../conjurosRasgos';

const nombreNivel = (i: number) => i === 0 ? L('Trucos', 'Заговоры') : `${L('Nivel', 'Уровень')} ${i}`;
const NIVELES = Array.from({ length: 10 }, (_, i) => i);

export function TabMagia() {
  const { p, upd, avisos, razas } = useFicha();
  const todos = useDatos<Conjuro[]>('spells');
  const [elegir, setElegir] = useState<(Concesion & { fuente: Fuente }) | null>(null);
  const pendientes = eleccionesPendientes(p, razas);
  const conElecciones = concesionesActivas(p, razas).filter((c) => c.elegir);
  const [anadirQue, setAnadirQue] = useState<null | { tipo: 'truco' | 'conjuro' | 'adicional'; clase: string }>(null);
  const anadir = anadirQue?.tipo ?? null;
  const setAnadir = (t: null | 'truco' | 'conjuro' | 'adicional', clase = p.clase) => setAnadirQue(t ? { tipo: t, clase } : null);
  const [todasClases, setTodasClases] = useState(false);
  const [ver, setVer] = useState<{ c: ConjuroPersonaje; def?: Conjuro } | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; nivel: number; adicional: boolean; base?: Conjuro; descripcion: string; clase?: string } | null>(null);
  const [elegirBase, setElegirBase] = useState(false);
  const multi = esMulticlase(p);
  const claseMin = (anadirQue?.clase ?? p.clase).toLowerCase();
  const def = (n: string) => todos?.find((x) => x.nombre === n);
  // Multiclase: un bloque de trucos y conjuros por cada clase que lanza conjuros (o la principal si ninguna).
  const magia: MagiaClase[] = avisos.magia.length ? avisos.magia : [{ clase: p.clase, nivel: p.nivel, limiteTrucos: null, limiteConjuros: null, conjurosAbierto: false, limitePreparados: null, nivelMaxConjuro: null, nTrucos: 0, nConj: 0, nPrep: 0 }];
  const lanzadoras = magia.filter((m) => m.limiteTrucos !== null || m.limiteConjuros !== null);
  const grupos = multi ? (lanzadoras.length ? [...lanzadoras, ...magia.filter((m) => !lanzadoras.includes(m) && (m.nTrucos || m.nConj))] : [magia[0]]) : [magia[0]];
  const lleno = (que: string, n: number, nivel: number) => alert(L(`Ya tienes los ${n} ${que} que te tocan a nivel ${nivel}. Quita uno para cambiarlo, o añádelo en «Conjuros adicionales» si te lo da la raza, una dote o un objeto.`, `У тебя уже ${n} ${que === 'trucos' ? 'заговоров' : 'заклинаний'} — столько положено на ${nivel} уровне. Убери одно, чтобы заменить, или добавь в «Дополнительные заклинания», если его даёт раса, черта или предмет.`));

  const ListaConjuros = ({ lista, preparar, m }: { lista: { c: ConjuroPersonaje; idx: number }[]; preparar: boolean; m?: MagiaClase }) => (
    <ul className="lista-conjuros">
      {lista.map(({ c, idx }) => {
        const d = def(c.nombre);
        return (
          <li key={idx}>
            {preparar && <Check valor={!!c.preparado} set={(b) => {
              if (b && m && m.limitePreparados !== null && m.nPrep >= m.limitePreparados) { alert(L(`Ya tienes ${m.limitePreparados} conjuros preparados, el máximo a nivel ${m.nivel}. Desmarca otro primero.`, `Уже подготовлено ${m.limitePreparados} заклинаний — максимум на ${m.nivel} уровне. Сначала сними отметку с другого.`)); return; }
              upd((x) => { x.conjuros[idx].preparado = b; });
            }} titulo="Preparado" />}
            <button className="conjuro-nombre" onClick={() => setVer({ c, def: d })}>
              <strong>{td(c.nombre)}{c.adicional ? <small className="etq-nivel"> · {c.nivel ? `${L('Nv', 'Ур')} ${c.nivel}` : L('Truco', 'Заговор')}</small> : null}</strong>
              {c.base && <small>{L('Propio, basado en', 'Своё, на основе')} {td(c.base)}</small>}
              {c.origen && <small className="origen-conjuro">✨ {origenTexto(c.origen)}</small>}
              {d && <small>{td(d.escuela)} · {td(d.tiempo)} · {td(d.alcance)}{/concentración/i.test(d.duracion) ? L(' · Conc.', ' · Конц.') : ''}</small>}
            </button>
          </li>
        );
      })}
    </ul>
  );
  const conIdx = p.conjuros.map((c, idx) => ({ c, idx }));
  const adicionales = conIdx.filter(({ c }) => c.adicional).sort((a, b) => a.c.nivel - b.c.nivel);
  const trucosAd = adicionales.filter(({ c }) => c.nivel === 0), conjAd = adicionales.filter(({ c }) => c.nivel > 0);

  return (
    <div className="tab">
      {grupos.map((m) => {
        const propios = conIdx.filter(({ c }) => !c.adicional && (multi ? claseDeConjuro(p, c) === m.clase : true));
        const porNivel = NIVELES.map((_, i) => propios.filter(({ c }) => c.nivel === i));
        const faltanT = m.limiteTrucos ? Math.max(0, m.limiteTrucos - m.nTrucos) : 0;
        const faltanC = m.limiteConjuros ? Math.max(0, m.limiteConjuros - m.nConj) : 0;
        const de = multi ? ` · ${T(RU_CLASES, m.clase)} ${m.nivel}` : '';
        return (
          <Fragment key={m.clase}>
            <Seccion titulo={L('Trucos', 'Заговоры') + de} aviso={faltanT} extra={m.limiteTrucos !== null && <span className="contador-limite">{m.nTrucos}/{m.limiteTrucos}</span>}>
              <BotonAnadir aviso={faltanT > 0} onClick={() => m.limiteTrucos !== null && m.nTrucos >= m.limiteTrucos ? lleno('trucos', m.limiteTrucos, m.nivel) : setAnadir('truco', m.clase)}>Añadir truco</BotonAnadir>
              {porNivel[0].length > 0 && <ListaConjuros lista={porNivel[0]} preparar={false} />}
            </Seccion>
            <Seccion titulo={L('Conjuros', 'Заклинания') + de} aviso={faltanC} extra={m.limiteConjuros !== null && <span className="contador-limite">{m.nConj}/{m.limiteConjuros}</span>}>
              <BotonAnadir aviso={faltanC > 0} onClick={() => m.limiteConjuros !== null && !m.conjurosAbierto && m.nConj >= m.limiteConjuros ? lleno('conjuros', m.limiteConjuros, m.nivel) : setAnadir('conjuro', m.clase)}>Añadir conjuro</BotonAnadir>
              {m.limitePreparados !== null && m.nConj > 0 && <p className={`nota ${m.nPrep > m.limitePreparados ? 'error' : ''}`}>{L('Preparados', 'Подготовлено')}: {m.nPrep}/{m.limitePreparados}</p>}
              {m.nivelMaxConjuro !== null && <p className="nota">{L('Nivel máximo de conjuro', 'Максимальный уровень заклинаний')}: {m.nivelMaxConjuro}</p>}
              {porNivel.slice(1).map((lista, k) => lista.length > 0 && (
                <div key={k}>
                  <h4 className="nivel-conjuro">{nombreNivel(k + 1)}</h4>
                  <ListaConjuros lista={lista} preparar m={m} />
                </div>
              ))}
              {m.nConj > 0 && <p className="nota pequena">{L('● = preparado: los que tienes listos para lanzar hoy. Márcalos tras un descanso largo si tu clase prepara conjuros.', '● = подготовлено: то, что готово к накладыванию сегодня. Отмечай после долгого отдыха, если твой класс готовит заклинания.')}</p>}
            </Seccion>
          </Fragment>
        );
      })}
      <Seccion titulo={L('Adicionales', 'Дополнительные')} aviso={pendientes.length}>
        <p className="nota pequena">{L('De tu raza, dotes, objetos o rasgos. No cuentan para el límite de tu clase. Los de tu raza y tus dotes (✨) se añaden solos al llegar al nivel.', 'От расы, черт, предметов или умений. Не считаются в лимит класса. Заклинания от расы и черт (✨) добавляются сами, когда доходишь до нужного уровня.')}</p>
        {pendientes.map((c) => (
          <button key={c.id} className="aviso-rojo elegir-conjuro" onClick={() => setElegir(c)}>
            <PuntoRojo /> {L(`«${td(c.fuente.rasgo)}» te deja elegir ${cantidadEleccion(c.elegir!, p) > 1 ? `${cantidadEleccion(c.elegir!, p)} conjuros` : 'un conjuro'}: toca para escoger`, `«${td(c.fuente.rasgo)}» даёт выбрать ${cantidadEleccion(c.elegir!, p) > 1 ? `${cantidadEleccion(c.elegir!, p)} заклинания` : 'заклинание'}: нажми, чтобы выбрать`)}
          </button>
        ))}
        {trucosAd.length > 0 && <><h4 className="nivel-conjuro">{L('Trucos adicionales', 'Дополнительные заговоры')}</h4><ListaConjuros lista={trucosAd} preparar={false} /></>}
        {conjAd.length > 0 && <><h4 className="nivel-conjuro">{L('Conjuros adicionales', 'Дополнительные заклинания')}</h4><ListaConjuros lista={conjAd} preparar={false} /></>}
        <BotonAnadir onClick={() => setAnadir('adicional')}>Añadir conjuro adicional</BotonAnadir>
        {conElecciones.length > pendientes.length && <p className="nota pequena"><button className="btn enlace pequeno" onClick={() => setElegir(conElecciones.find((c) => !pendientes.includes(c))!)}>{L('Cambiar conjuros elegidos de raza o dote', 'Поменять выбранные заклинания расы или черты')}</button></p>}
      </Seccion>
      {elegir && todos && <ModalElegir c={elegir} todos={todos} otras={conElecciones} onCambiar={setElegir} onClose={() => setElegir(null)} />}
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
                if (typeof c === 'string') { setNuevo({ nombre: c, nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '', clase: anadirQue?.clase }); setAnadir(null); return; }
                upd((x) => { x.conjuros.push({ nombre: c.nombre, nivel: c.nivel, ...(anadir === 'adicional' ? { adicional: true } : multi ? { clase: anadirQue!.clase } : {}) }); });
                setAnadir(null);
              }}
            />
          )}
          <button className="btn crear-propio" onClick={() => { setNuevo({ nombre: '', nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '', clase: anadirQue?.clase }); setAnadir(null); }}>✏️ {L('Crear conjuro propio (puede basarse en otro)', 'Создать своё заклинание (можно на основе другого)')}</button>

        </Modal>
      )}
      {nuevo && (
        <Modal titulo="Crear conjuro propio" onClose={() => setNuevo(null)}
          pie={<button className="btn primario" disabled={!nuevo.nombre.trim()} onClick={() => {
            upd((x) => { x.conjuros.push({ nombre: nuevo.nombre.trim(), nivel: nuevo.nivel, ...(nuevo.adicional ? { adicional: true } : {}), ...(nuevo.base ? { base: nuevo.base.nombre } : {}), ...(multi && !nuevo.adicional && nuevo.clase ? { clase: nuevo.clase } : {}), descripcion: nuevo.descripcion }); });
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
          pie={ver.c.origen ? <span className="nota">✨ {L('Te lo da', 'Даёт')}: {origenTexto(ver.c.origen)}</span> : <button className="btn peligro" onClick={() => { upd((x) => { const i = x.conjuros.findIndex((c) => c.nombre === ver.c.nombre && c.nivel === ver.c.nivel); if (i >= 0) x.conjuros.splice(i, 1); }); setVer(null); }}>{L('Quitar de la lista', 'Убрать из списка')}</button>}>
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
  // Conjuros sin ataque, sin salvación y sin dados (Armadura de mago…): no hay nada que tirar.
  if (!pideAtaque && !pideSalvacion && dados.length === 0) return null;
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
      {at !== null && pideAtaque && <button className="btn primario" onClick={() => tirarD20(`${L('Ataque', 'Атака')}: ${nombre}`, at, [], undefined, 'combate')}>🎲 {L('Ataque', 'Атака')} {conSigno(at)}</button>}
      {cd !== null && pideSalvacion && <span className="cd-chip">{L('El objetivo salva contra CD', 'Цель делает спасбросок, Сл')} <strong>{cd}</strong></span>}
      {dados.map((d) => <button key={d} className="btn" onClick={() => tirar(`${nombre} (${d})`, d, 'normal', 'combate')}>🎲 {d}</button>)}
      {mejoraTruco && <p className="nota pequena">{L(`Daño mejorado por tu nivel ${p.nivel} (trucos: ×2 a nivel 5, ×3 a nivel 11, ×4 a nivel 17).`, `Урон усилен за твой ${p.nivel} уровень (заговоры: ×2 на 5, ×3 на 11, ×4 на 17 уровне).`)}</p>}
      {at === null && (pideAtaque || pideSalvacion) && <p className="nota">{L('Elige la «Característica de conjuros» en Combate para ver tu ataque y CD.', 'Выбери «Заклинательную характеристику» во вкладке «Бой», чтобы видеть атаку и Сл.')}</p>}
    </div>
  );
}

/** Nombre del rasgo o dote que da un conjuro automático. */
function origenTexto(id: string) {
  const f = FUENTES.find((x) => x.concesiones.some((c) => c.id === id));
  return f ? `${td(f.rasgo)}${f.dote ? L(' (dote)', ' (черта)') : ''}` : '';
}

/** Ventana para escoger los conjuros que da un rasgo o una dote. */
function ModalElegir({ c, todos, otras, onCambiar, onClose }: { c: Concesion & { fuente: Fuente }; todos: Conjuro[]; otras: (Concesion & { fuente: Fuente })[]; onCambiar: (c: Concesion & { fuente: Fuente }) => void; onClose: () => void }) {
  const { p, upd } = useFicha();
  const e = { ...c.elegir!, cantidad: cantidadEleccion(c.elegir!, p) };
  const [sel, setSel] = useState<string[]>(p.eleccionesConjuros?.[c.id] ?? []);
  const [q, setQ] = useState('');
  const ops = opcionesEleccion(e, todos);
  const vis = ops.filter((o) => !q.trim() || td(o.nombre).toLowerCase().includes(q.trim().toLowerCase()) || o.nombre.toLowerCase().includes(q.trim().toLowerCase()));
  const marcar = (n: string) => setSel((s) => s.includes(n) ? s.filter((x) => x !== n) : e.cantidad === 1 ? [n] : s.length < e.cantidad ? [...s, n] : s);
  const que = e.nivelConjuro === 0 ? L('trucos', 'заговоры') : L('conjuros', 'заклинания');
  return (
    <Modal titulo={`✨ ${td(c.fuente.rasgo)}`} onClose={onClose}
      pie={<button className="btn primario" disabled={sel.length !== Math.min(e.cantidad, ops.length)} onClick={() => { upd((x) => { x.eleccionesConjuros = { ...(x.eleccionesConjuros ?? {}), [c.id]: sel }; }); onClose(); }}>{L('Guardar', 'Сохранить')} ({sel.length}/{e.cantidad})</button>}>
      {otras.length > 1 && (
        <select className="campo" value={c.id} onChange={(ev) => onCambiar(otras.find((o) => o.id === ev.target.value)!)}>
          {otras.map((o) => <option key={o.id} value={o.id}>{td(o.fuente.rasgo)} · {L('nivel', 'уровень')} {o.nivel}</option>)}
        </select>
      )}
      <p className="nota">{L(`Elige ${e.cantidad} ${que}${e.clases ? ` de la lista de ${e.clases.join(' / ')}` : ''}${e.escuelas ? ` de ${e.escuelas.join(' o ')}` : ''}${e.ritual ? ' de nivel 1 que se puedan lanzar como ritual' : ''}. Irán a «adicionales» y no cuentan para el límite de tu clase.`, `Выбери: ${e.cantidad} — ${que}${e.clases ? ` из списка: ${e.clases.join(' / ')}` : ''}${e.escuelas ? ` (школы: ${e.escuelas.join(', ')})` : ''}${e.ritual ? ' 1-го уровня, которые можно накладывать как ритуал' : ''}. Они попадут в «дополнительные» и не считаются в лимит класса.`)}</p>
      {ops.length > 8 && <input className="campo" placeholder={L('Buscar…', 'Поиск…')} value={q} onChange={(ev) => setQ(ev.target.value)} />}
      <ul className="lista-elegir-conjuro">
        {vis.map((o) => {
          const d = todos.find((x) => x.nombre === o.nombre);
          return (
            <li key={o.nombre} className={sel.includes(o.nombre) ? 'sel' : ''}>
              <button type="button" onClick={() => marcar(o.nombre)}>
                <span className="marca">{sel.includes(o.nombre) ? '✓' : ''}</span>
                <span><strong>{td(o.nombre)}</strong><small>{o.nivel ? `${L('Nivel', 'Уровень')} ${o.nivel}` : L('Truco', 'Заговор')}{d ? ` · ${td(d.escuela)}` : ''}</small></span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
