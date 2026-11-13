import { Fragment, useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Check, Etiqueta, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { Contador, useDados } from '../dice';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo } from '../types';
import { useDatos, type Conjuro } from '../data';
import type { ConjuroPersonaje } from '../types';
import { CARACTERISTICA_CONJUROS, ataqueConjuros, cdConjuros, conSigno, dadosConjuro, mejoraCalculada, mejoraNivelSuperior, multiplicadorTruco } from '../rules';
import { L, T, RU_CLASES, RU_NOMBRE_ATRIBUTO } from '../i18n';
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

  const cd = cdConjuros(p), at = ataqueConjuros(p);
  const auto = CARACTERISTICA_CONJUROS[p.clase];
  const { tirarD20 } = useDados();
  const [filtroNivel, setFiltroNivel] = useState<number | null>(null);
  // Nivel máximo de conjuro de la clase a la que se añade (o el general).
  const maxNivelAnadir = (anadirQue ? magia.find((m) => m.clase === anadirQue.clase)?.nivelMaxConjuro : null) ?? avisos.nivelMaxConjuro ?? null;
  const anadirConjuro = (c: Conjuro) => {
    if (anadir !== 'adicional' && c.nivel > 0 && maxNivelAnadir !== null && c.nivel > maxNivelAnadir
      && !confirm(L(`«${td(c.nombre)}» es de nivel ${c.nivel}, pero ahora solo puedes lanzar conjuros hasta nivel ${maxNivelAnadir}. ¿Añadirlo igualmente?`, `«${td(c.nombre)}» — ${c.nivel} уровня, а сейчас тебе доступны заклинания только до ${maxNivelAnadir} уровня. Всё равно добавить?`))) return false;
    upd((x) => { x.conjuros.push({ nombre: c.nombre, nivel: c.nivel, ...(anadir === 'adicional' ? { adicional: true } : multi ? { clase: anadirQue!.clase } : {}) }); });
    return true;
  };

  return (
    <div className="tab">
      <Seccion titulo={L('Lanzamiento', 'Колдовство')} className="lanzamiento">
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
          <div><small>{L('Ataque de conjuro', 'Атака заклинанием')}</small>{at !== null ? <button className="lt-valor" onClick={() => tirarD20(L('Ataque de conjuro', 'Атака заклинанием'), at, [], undefined, 'combate')}>{conSigno(at)}</button> : <strong>—</strong>}</div>
        </div>
        {p.pm.max > 0 && (
          <div className="mana-magia">
            <small>🔷 {L('Maná', 'Мана')}</small>
            <div className="pg-actual">
              <Contador valor={p.pm.actual} set={(n) => upd((x) => { x.pm.actual = Math.max(0, Math.min(n, x.pm.max)); })} min={0} max={p.pm.max} />
              <span className="de">/ {p.pm.max}</span>
            </div>
            <div className="barra-vida barra-mana"><div style={{ width: `${Math.max(0, Math.min(100, (p.pm.actual / p.pm.max) * 100))}%` }} /></div>
            <p className="nota pequena">{L('Un conjuro gasta tanto maná como el nivel al que lo lanzas (los trucos no gastan).', 'Заклинание тратит столько маны, на каком уровне ты его накладываешь (заговоры бесплатны).')}</p>
          </div>
        )}
      </Seccion>
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
          {anadir !== 'truco' && (
            <div className="filtro-nivel" role="group" aria-label={L('Filtrar por nivel', 'Фильтр по уровню')}>
              <button type="button" className={`chip ${filtroNivel === null ? 'activo' : ''}`} onClick={() => setFiltroNivel(null)}>{L('Todos', 'Все')}</button>
              {(anadir === 'adicional' ? NIVELES : NIVELES.slice(1)).map((n) => (
                <button key={n} type="button" className={`chip ${filtroNivel === n ? 'activo' : ''} ${anadir !== 'adicional' && maxNivelAnadir !== null && n > maxNivelAnadir ? 'fuera-nivel' : ''}`} onClick={() => setFiltroNivel(n)}>{n === 0 ? L('Truco', 'Заговор') : n}</button>
              ))}
            </div>
          )}
          {anadir === 'conjuro' && maxNivelAnadir !== null && <p className="nota pequena">{L(`Ahora puedes lanzar hasta nivel ${maxNivelAnadir}. Los niveles en gris son superiores: si eliges uno, te avisaré.`, `Сейчас доступно до ${maxNivelAnadir} уровня. Серые уровни выше — если выберешь такое, я предупрежу.`)}</p>}
          {!todos ? <p>{L('Cargando…', 'Загрузка…')}</p> : (
            <Buscador<Conjuro>
              items={todos}
              texto={(c) => c.nombre}
              placeholder={anadir === 'truco' ? L('Escribe el nombre del truco…', 'Напиши название заговора…') : L('Escribe el nombre del conjuro…', 'Напиши название заклинания…')}
              filtro={(c) => (anadir === 'adicional' || (anadir === 'truco' ? c.nivel === 0 : c.nivel > 0))
                && (filtroNivel === null || anadir === 'truco' || c.nivel === filtroNivel)
                && (anadir === 'adicional' || todasClases || !claseMin || c.clases.includes(claseMin))
                && !p.conjuros.some((x) => x.nombre === c.nombre)}
              render={(c) => <span className="res-conjuro"><strong>{td(c.nombre)}</strong><small>{c.nivel ? `${L('Nivel', 'Уровень')} ${c.nivel}` : L('Truco', 'Заговор')} · {td(c.escuela)} · {c.clases.join(', ')}</small></span>}
              onElegir={(c) => {
                if (typeof c === 'string') { setNuevo({ nombre: c, nivel: anadir === 'truco' ? 0 : 1, adicional: anadir === 'adicional', descripcion: '', clase: anadirQue?.clase }); setAnadir(null); return; }
                if (anadirConjuro(c)) setAnadir(null);
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

/** Lanzar el conjuro: elegir a qué nivel (gasta ese maná), tirada de ataque, CD y dados de daño/curación (con la mejora por nivel). */
function Lanzar({ texto, nivel, nombre }: { texto: string; nivel: number; nombre: string }) {
  const { p, upd, avisos, ajeno } = useFicha();
  const { tirar, tirarD20 } = useDados();
  const at = ataqueConjuros(p), cd = cdConjuros(p);
  const maxEsp = Math.max(nivel, Math.min(9, avisos.nivelMaxConjuro ?? 9));
  const [espacio, setEspacio] = useState(nivel);
  const [lanzado, setLanzado] = useState('');
  const pideAtaque = /tirada de ataque|ataque de conjuro/i.test(texto);
  const pideSalvacion = /tirada de salvaci[oó]n/i.test(texto);
  const sube = nivel > 0 && /aumentan? en \d+d\d+ por cada nivel (?:de espacio )?por encima/i.test(texto);
  const mejora = nivel > 0 ? mejoraNivelSuperior(texto) : '';
  // Solo hay botón de dados si el conjuro hace daño o cura de verdad (no p. ej. Alterar el propio aspecto, que cambia tu ataque sin armas).
  const cura = /recupera[n]? (una cantidad de )?puntos de golpe|recupera[n]? \d+d\d+|puntos de golpe temporales|cantidad de puntos de golpe igual/i.test(texto);
  const hace = pideAtaque || pideSalvacion || cura || /\b(inflig|recib|sufr|caus)(e|en|es|ir[áa]n?|iréis|a|an|ar[áa]n?|aréis)(?![a-záéíóúñ])[^.]{0,40}\d+d\d+|\d+d\d+[^.]{0,30}de daño[^.]{0,30}(a cada|al objetivo|a la criatura|a todas)|\b(recupera|restaura|cura)[a-záéíóúñ]*[^.]{0,60}\d+d\d+|\d+d\d+[^.]{0,25}daño [a-záéíóúñ]* ?(adicional|extra)|\b(tira|tirar|suma|sumar|añade|añadir)\b[^.]{0,15}\d+d\d+/i.test(texto);
  const calc = mejoraCalculada(texto, nivel, espacio);
  // Dardos/rayos: todos los proyectiles que hay a ese nivel (también a nivel base, p. ej. «tres dardos»).
  const proy = calc?.proyectiles ?? (() => { const b = texto.match(/\b(tres|dos|cuatro) (dardos|rayos)\b/i); return b && /adicional por cada nivel/i.test(texto) ? { n: ({ dos: 2, tres: 3, cuatro: 4 } as Record<string, number>)[b[1].toLowerCase()], nombre: b[2].toLowerCase() } : undefined; })();
  let dados = hace ? dadosConjuro(texto, nivel, p.nivel, espacio) : [];
  // Sin tirada de ataque (Proyectil mágico): se tiran todos juntos, N × el daño de uno.
  const uno = proy && !pideAtaque ? dados[0] : undefined;
  if (proy && !pideAtaque && dados[0]) { const m = dados[0].match(/^(\d+)d(\d+)(?:\+(\d+))?$/); if (m) dados = [`${Number(m[1]) * proy.n}d${m[2]}${m[3] ? `+${Number(m[3]) * proy.n}` : ''}`, ...dados.slice(1)]; }
  const mejoraTruco = nivel === 0 && /mejora de truco/i.test(texto) && multiplicadorTruco(p.nivel) > 1;
  const conMana = p.pm.max > 0;
  const lanzar = () => {
    if (conMana && p.pm.actual < espacio) { alert(L(`No te queda maná suficiente: necesitas ${espacio} y tienes ${p.pm.actual}.`, `Не хватает маны: нужно ${espacio}, у тебя ${p.pm.actual}.`)); return; }
    if (conMana) upd((x) => { x.pm.actual = Math.max(0, x.pm.actual - espacio); });
    setLanzado(conMana ? L(`Lanzado a nivel ${espacio}: −${espacio} maná (te quedan ${p.pm.actual - espacio}).`, `Наложено на ${espacio} уровне: −${espacio} маны (осталось ${p.pm.actual - espacio}).`) : L(`Lanzado a nivel ${espacio}.`, `Наложено на ${espacio} уровне.`));
  };
  const hayTiradas = pideAtaque || pideSalvacion || dados.length > 0;
  if (nivel === 0 && !hayTiradas) return null;
  return (
    <div className="lanzar">
      {nivel > 0 && (
        <div className="fila-lanzar">
          <label className="etiqueta espacio-conjuro"><span>{L('Lanzar a nivel', 'Накладывать на уровне')}</span>
            <select className="campo" value={espacio} onChange={(e) => { setEspacio(+e.target.value); setLanzado(''); }}>
              {Array.from({ length: maxEsp - nivel + 1 }, (_, k) => nivel + k).map((n) => <option key={n} value={n}>{L('Nivel', 'Уровень')} {n}{n === nivel ? L(' (base)', ' (базовый)') : ''}{conMana ? ` · ${n} ${L('maná', 'маны')}` : ''}</option>)}
            </select>
          </label>
          {!ajeno && <button className="btn primario" onClick={lanzar}>✨ {L('Lanzar', 'Наложить')}{conMana ? ` (−${espacio} ${L('maná', 'маны')})` : ''}</button>}
        </div>
      )}
      {lanzado && <p className="nota lanzado">✓ {lanzado}</p>}
      {nivel > 0 && espacio > nivel && (mejora
        ? <div className="mejora-nivel">⬆️ <strong>{L(`A nivel ${espacio}`, `На ${espacio} уровне`)}:</strong> {calc ? <strong className="mejora-calc">{calc.texto}</strong> : sube ? L('los dados ya están sumados.', 'кости уже прибавлены.') : null}
            <small>{td(mejora)}</small></div>
        : <p className="nota pequena">{L('Este conjuro no cambia al lanzarlo a más nivel (solo gasta más maná).', 'Это заклинание не меняется на более высоком уровне (тратит только больше маны).')}</p>)}
      {hayTiradas && at === null && dados.length === 0
        ? <p className="nota">{L('Para lanzar con ataque, elige la «Característica de conjuros» arriba, en «Lanzamiento».', 'Чтобы атаковать заклинанием, выбери «Заклинательную характеристику» вверху, в «Колдовстве».')}</p>
        : <div className="fila-botones">
            {at !== null && pideAtaque && <button className="btn primario" onClick={() => tirarD20(`${L('Ataque', 'Атака')}: ${nombre}`, at, [], undefined, 'combate')}>🎲 {L('Ataque', 'Атака')} {conSigno(at)}{proy ? ` (${L('uno por', 'по одной на')} ${proy.nombre.replace(/s$/, '')} · ×${proy.n})` : ''}</button>}
            {cd !== null && pideSalvacion && <span className="cd-chip">{L('El objetivo salva contra CD', 'Цель делает спасбросок, Сл')} <strong>{cd}</strong></span>}
            {dados.map((d, i) => <button key={d} className="btn" onClick={() => tirar(`${nombre}${nivel > 0 ? ` (${L('nivel', 'ур.')} ${espacio})` : ''} (${d})`, d, 'normal', 'combate')}>🎲 {i === 0 && nivel > 0 ? `${cura && !pideAtaque && !pideSalvacion ? L('Curación', 'Лечение') : L('Daño', 'Урон')} ${L('a nivel', 'на ур.')} ${espacio}${proy ? (pideAtaque ? ` (${L('por', 'за')} ${proy.nombre.replace(/s$/, '')})` : ` (${proy.n} ${proy.nombre})`) : ''}: ` : ''}{d}</button>)}
            {uno && <button className="btn" onClick={() => tirar(`${nombre}: 1 ${proy!.nombre.replace(/s$/, '')}`, uno, 'normal', 'combate')}>🎲 {L(`1 ${proy!.nombre.replace(/s$/, '')}`, '1 шт.')}: {uno}</button>}
            {proy && <p className="nota pequena">{pideAtaque ? L(`Lanzas ${proy.n} ${proy.nombre}: haz una tirada de ataque por cada uno y tira el daño de los que acierten.`, `${proy.n}: совершай атаку за каждый и бросай урон за попавшие.`) : L(`${proy.n} ${proy.nombre}: tira todos juntos o de uno en uno si van a enemigos distintos.`, `${proy.n}: бросай все сразу или по одному, если цели разные.`)}</p>}
          </div>}
      {mejoraTruco && <p className="nota pequena">{L(`Daño mejorado por tu nivel ${p.nivel} (trucos: ×2 a nivel 5, ×3 a nivel 11, ×4 a nivel 17).`, `Урон усилен за твой ${p.nivel} уровень (заговоры: ×2 на 5, ×3 на 11, ×4 на 17 уровне).`)}</p>}
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
