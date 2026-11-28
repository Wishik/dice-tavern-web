import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { buscarClase, buscarRaza } from '../avisos';
import type { Dote, RasgoDef } from '../data';
import type { EntradaTexto } from '../types';
import { RASGOS_IDIOMA, RASGOS_RECOMENDADOS } from '../rules';
import { L, T, RU_CLASES, RU_RAZAS } from '../i18n';
import { td } from '../datosRu';
import { clasesDe } from '../multiclase';
import { eleccionesDe, elegido } from '../elecciones';
import { DOTE_MEJORA, mejoraDe, mejoraPendiente, opcionesMejora } from '../mejoras';
import { esDoteDeEstilo, type Eleccion } from '../elecciones';
import { ModalElegirMejora, ModalMejoraNivel, mejorasPendientes } from './MejoraNivel';

export function TabRasgos() {
  const { p, upd, razas, clases, dotes, trasfondos, avisos } = useFicha();
  // Invocaciones, metamagia, orden, linaje… con su texto.
  // Todo lo elegido en «Por elegir» (menos el equipo inicial): va junto a su rasgo de clase o, si no tiene, a «Elegido».
  const todasElecciones = eleccionesDe(p, clases, buscarRaza(razas, p.raza)).filter((e) => !e.equipo && elegido(p, e.id).some(Boolean));
  const deEleccion = (e: Eleccion) => elegido(p, e.id).filter(Boolean).map((v) => {
    const op = e.opciones.find((o) => o.valor === v);
    return { clave: `${e.id}:${v}`, nombre: op ? L(op.es, op.ru) : v, de: `${L(e.es, e.ru).replace(/\s*\(\d+\)$/, '')} · ${e.origen}`, texto: [op?.nota_es && L(op.nota_es, op.nota_ru ?? op.nota_es), op?.desc].filter(Boolean).join('\n\n') };
  });
  const [modal, setModal] = useState<null | 'rasgoRaza' | 'dote' | 'rasgo'>(null);
  const [ver, setVer] = useState<{ titulo: string; texto: string; quitar?: () => void } | null>(null);
  const [mejoraDote, setMejoraDote] = useState<number | null>(null);
  const [mejoraNivel, setMejoraNivel] = useState(false);
  const pendientesMejora = mejorasPendientes(p, clases, trasfondos);
  const [editar, setEditar] = useState<{ lista: 'dotes' | 'rasgos'; i: number; e: EntradaTexto } | null>(null);
  const raza = buscarRaza(razas, p.raza);
  const clase = buscarClase(clases, p.clase);
  const sub = clase?.subclases.find((s) => s.nombre === p.subclase);
  const excl = razas?.rasgosGenericos.excluyentes ?? [];
  const recomendados = new Set(RASGOS_RECOMENDADOS[p.clase] ?? []);
  const genericos = (razas?.rasgosGenericos.noExcluyentes ?? []).map((r) => ({ ...r, grupo: 'Genéricos', deRaza: false, recomendado: recomendados.has(r.nombre) }));
  // Primero los de tu raza, luego los recomendados para tu clase y luego el resto.
  const opciones: (RasgoDef & { grupo: string; deRaza: boolean; recomendado: boolean })[] = [
    ...(raza?.rasgosUnicos ?? []).map((r) => ({ ...r, grupo: `Únicos de ${raza!.nombre}`, deRaza: true, recomendado: false })),
    ...genericos.filter((r) => r.recomendado),
    ...genericos.filter((r) => !r.recomendado),
    ...excl.map((r) => ({ ...r, grupo: 'Genéricos excluyentes (solo uno)', deRaza: false, recomendado: false })),
  ];
  const tieneExcl = p.rasgosRaza.some((n) => excl.some((e) => e.nombre === n));
  const tras = trasfondos?.find((t) => t.nombre === p.trasfondoEstilo);
  // Multiclase: una lista por clase, cada una con los rasgos hasta su nivel.
  const usadas = new Set<string>();
  const porClase = clasesDe(p).map((c) => {
    const datos = buscarClase(clases, c.clase);
    const s2 = datos?.subclases.find((s) => s.nombre === c.subclase);
    const base = [...(datos?.rasgos ?? []).map((r) => ({ ...r, base: r.nombre })), ...(s2?.rasgos ?? []).map((r) => ({ ...r, base: r.nombre, nombre: `${td(r.nombre)} (${td(s2!.nombre)})` }))]
      .filter((r) => r.nivel <= c.nivel && !RASGOS_IDIOMA[r.base]);
    const lista = agruparMejorados(base).map((r) => {
      // Lo elegido para este rasgo (Estilo de combate → Defensa; Maestría con armas → Espada larga…).
      const elecs = todasElecciones.filter((e) => (e.id.startsWith(`${c.clase}:`)) && rasgoDeEleccion(e, base)?.base === r.base);
      elecs.forEach((e) => usadas.add(e.id));
      return { ...r, elegidos: elecs.flatMap(deEleccion) };
    });
    return { c, datos, sub: s2, lista };
  }).filter((x) => x.datos);
  const elegidos = todasElecciones.filter((e) => !usadas.has(e.id)).flatMap(deEleccion);

  return (
    <div className="tab">
      <Seccion titulo="Dotes" aviso={avisos.dotes}>
        {p.dotes.length === 0 && <p className="vacio">{L('Sin dotes.', 'Нет черт.')}</p>}
        <ul className="lista-rasgos">
          {(() => {
            // Las «Mejora de Característica» van juntas en una sola línea, con lo que se subió en cada nivel.
            const mejoras = p.dotes.map((d, i) => ({ d, i })).filter(({ d }) => d.nombre === DOTE_MEJORA);
            const subido = (d: EntradaTexto) => { const m = mejoraDe(d); return [...new Set(m)].map((a) => `+${m.filter((x) => x === a).length} ${a}`).join(', '); };
            return p.dotes.map((d, i) => {
              if (d.nombre === DOTE_MEJORA) {
                if (mejoras[0].i !== i) return null;
                const lineas = mejoras.map(({ d: x }, k) => `${x.fuente ?? L(`Mejora ${k + 1}`, `Увеличение ${k + 1}`)}: ${subido(x) || '—'}`);
                return <li key={i} className="con-mejora"><button onClick={() => setVer({ titulo: td(DOTE_MEJORA), texto: `${lineas.join('\n')}\n\n${d.texto}` })}><strong>{td(d.nombre)}</strong><small className="fuente-dote">{L('Subidas de nivel', 'Повышения уровня')}</small>
                  <span className="mejoras-lista">{lineas.map((l) => <span key={l}>📈 {l}</span>)}</span></button>
                  {mejoras.filter(({ d: x }) => mejoraPendiente(x)).map(({ i: k }) => <button key={k} className="btn enlace pequeno mejora-dote falta" onClick={() => setMejoraDote(k)}>⚠ {L('Elige a qué características va', 'Выбери характеристики')}</button>)}
                </li>;
              }
              const op = opcionesMejora(d);
              const m = mejoraDe(d);
              return <li key={i} className={op ? 'con-mejora' : ''}><button onClick={() => setEditar({ lista: 'dotes', i, e: d })}><strong>{td(d.nombre)}</strong><small className="fuente-dote">{fuenteDote(d, tras?.nombre, tras?.dotes)}</small><span>{td(d.texto).slice(0, 120)}{d.texto.length > 120 ? '…' : ''}</span></button>
                {op && (mejoraPendiente(d)
                  ? <button className="btn enlace pequeno mejora-dote falta" onClick={() => setMejoraDote(i)}>⚠ {L('Elige a qué característica va el +1', 'Выбери характеристику для +1')}{op.cantidad > 1 ? ' (×2)' : ''}</button>
                  : <span className="nota pequena mejora-dote">📈 {[...new Set(m)].map((a) => `+${m.filter((x) => x === a).length} ${a}`).join(', ')}</span>)}
              </li>;
            });
          })()}
        </ul>
        {pendientesMejora > 0 && <button className="btn primario" onClick={() => setMejoraNivel(true)}><PuntoRojo /> 📈 {L(`Mejora de característica o dote (${pendientesMejora})`, `Увеличение характеристик или черта (${pendientesMejora})`)}</button>}
        <BotonAnadir aviso={avisos.dotes > 0} onClick={() => setModal('dote')}>Añadir dote</BotonAnadir>
        {avisos.dotes > 0 && <p className="nota">{L(`Te ${avisos.dotes > 1 ? `faltan ${avisos.dotes} dotes` : 'falta 1 dote'}`, `Не хватает черт: ${avisos.dotes}`)}{tras ? L(` (de origen por ${tras.nombre}: ${tras.dotes.map(td).join(', ')})`, ` (черта происхождения от «${tras.nombre}»: ${tras.dotes.map(td).join(', ')})`) : ''}{clase ? L('; las «Mejora de característica» de tu clase también cuentan', '; «Увеличение характеристик» класса тоже считается') : ''}.</p>}
      </Seccion>

      {raza && (
        <Seccion titulo={L(`Rasgos de ${raza.nombre}`, `Особенности: ${T(RU_RAZAS, raza.nombre)}`)} aviso={avisos.rasgosRaza}>
          <ul className="lista-rasgos">
            {raza.rasgosFijos.map((r) => <li key={r.nombre}><button onClick={() => setVer({ titulo: r.nombre, texto: r.texto })}><strong>{td(r.nombre)}</strong><small className="etq-fijo">{L('fijo', 'постоянная')}</small></button></li>)}
            {p.rasgosRaza.map((n) => {
              const r = opciones.find((o) => o.nombre === n);
              return <li key={n}><button onClick={() => setVer({ titulo: n, texto: r?.texto ?? '', quitar: () => upd((x) => { x.rasgosRaza = x.rasgosRaza.filter((y) => y !== n); }) })}><strong>{n}</strong><small>{L('elegido', 'выбрана')}</small></button></li>;
            })}
          </ul>
          <BotonAnadir aviso={avisos.rasgosRaza > 0} onClick={() => setModal('rasgoRaza')}>{L('Elegir rasgo', 'Выбрать особенность')} ({p.rasgosRaza.length}/{raza.rasgosAElegir})</BotonAnadir>
        </Seccion>
      )}

      {porClase.map(({ c, datos, sub, lista }) => (
        <Seccion key={c.clase} titulo={`${L(`Rasgos de ${datos!.nombre}`, `Умения: ${T(RU_CLASES, datos!.nombre)}`)}${porClase.length > 1 ? ` ${c.nivel}` : ''}${sub ? ` · ${td(sub.nombre)}` : ''}`}>
          <ul className="lista-rasgos">
            {lista.map((r, i) => <li key={i}><button onClick={() => setVer({ titulo: r.nombre, texto: [r.texto, ...r.elegidos.map((x) => `■ ${x.nombre}${x.texto ? `\n${x.texto}` : ''}`)].join('\n\n') })}>
              <strong>{td(r.nombre)}</strong><small>{L('Nivel', 'Уровень')} {r.niveles.join(' / ')}</small>
              {r.elegidos.length > 0 && <span className="elegido-rasgo">✓ {r.elegidos.map((x) => td(x.nombre)).join(', ')}</span>}
            </button></li>)}
          </ul>
          {c.nivel >= 3 && !c.subclase && <p className="aviso-rojo"><PuntoRojo /> {L('A nivel 3 eliges subclase (en «Personaje»).', 'На 3 уровне выбираешь подкласс (во вкладке «Персонаж»).')}</p>}
        </Seccion>
      ))}

      {elegidos.length > 0 && (
        <Seccion titulo={L('Elegido en «Por elegir»', 'Выбрано в «Нужно выбрать»')}>
          <ul className="lista-rasgos">
            {elegidos.map((x) => <li key={x.clave}><button onClick={() => setVer({ titulo: x.nombre, texto: x.texto })}><strong>{td(x.nombre)}</strong><small>{x.de}</small></button></li>)}
          </ul>
          <p className="nota pequena">{L('Se eligen al crear el personaje o al subir de nivel.', 'Выбирается при создании персонажа или при повышении уровня.')}</p>
        </Seccion>
      )}

      <Seccion titulo="Otros rasgos">
        <ul className="lista-rasgos">
          {p.rasgos.map((d, i) => <li key={i}><button onClick={() => setEditar({ lista: 'rasgos', i, e: d })}><strong>{td(d.nombre)}</strong><span>{td(d.texto).slice(0, 120)}</span></button></li>)}
        </ul>
        <BotonAnadir onClick={() => { upd((x) => { x.rasgos.push({ nombre: L('Nuevo rasgo', 'Новая особенность'), texto: '' }); }); setEditar({ lista: 'rasgos', i: p.rasgos.length, e: { nombre: L('Nuevo rasgo', 'Новая особенность'), texto: '' } }); }}>Añadir rasgo</BotonAnadir>
      </Seccion>

      {modal === 'rasgoRaza' && (
        <Modal titulo="Elegir rasgo racial" onClose={() => setModal(null)}>
          <p className="nota pequena">{L('★ = rasgo de tu raza · 👍 = recomendado para', '★ = особенность твоей расы · 👍 = рекомендуется для')} {p.clase ? T(RU_CLASES, p.clase) : L('tu clase', 'твоего класса')}</p>
          <Buscador<(typeof opciones)[number]>
            items={opciones} texto={(r) => r.nombre} placeholder="Busca un rasgo…"
            filtro={(r) => !p.rasgosRaza.includes(r.nombre) && !(tieneExcl && r.grupo.includes('excluyentes'))}
            render={(r) => <span className={`res-conjuro ${r.deRaza ? 'de-raza' : ''}`}><strong>{r.deRaza ? '★ ' : ''}{td(r.nombre)}{r.recomendado ? ' 👍' : ''}</strong><small>{r.deRaza ? L(r.grupo, `Уникальные: ${T(RU_RAZAS, raza?.nombre ?? '')}`) : r.grupo.includes('excluyentes') ? L(r.grupo, 'Общие взаимоисключающие (только одна)') : L(r.grupo, 'Общие')} · {td(r.texto).slice(0, 90)}…</small></span>}
            onElegir={(r) => { const n = typeof r === 'string' ? r : r.nombre; upd((x) => { x.rasgosRaza.push(n); }); setModal(null); }}
          />
        </Modal>
      )}
      {modal === 'dote' && (
        <Modal titulo="Añadir dote" onClose={() => setModal(null)}>
          <Buscador<Dote>
            items={dotes ?? []} texto={(d) => d.nombre} placeholder="Busca una dote…"
            filtro={(d) => !p.dotes.some((x) => x.nombre === d.nombre) || d.nombre === 'Mejora de Característica'}
            render={(d) => <span className="res-conjuro"><strong>{td(d.nombre)}{tras?.dotes.includes(d.nombre) ? ' ★' : ''}</strong><small>{L('Dote', 'Черта')} {td(d.categoria)} · {td(d.descripcion).slice(0, 80)}…</small></span>}
            onElegir={(d) => {
              const e = typeof d === 'string' ? { nombre: d, texto: '', fuente: 'Añadida a mano' } : { nombre: d.nombre, texto: d.descripcion, origen: d.categoria, fuente: 'Añadida a mano' };
              upd((x) => { x.dotes.push(e); }); setModal(null);
              if (typeof d === 'string') setEditar({ lista: 'dotes', i: p.dotes.length, e });
              else if (mejoraPendiente(e)) setMejoraDote(p.dotes.length);
            }}
          />
          {tras && <p className="nota">{L('★ = dote de origen de tu trasfondo.', '★ = черта происхождения твоей предыстории.')}</p>}
        </Modal>
      )}
      {mejoraDote !== null && <ModalElegirMejora i={mejoraDote} onClose={() => setMejoraDote(null)} />}
      {mejoraNivel && <ModalMejoraNivel onClose={() => setMejoraNivel(false)} />}
      {ver && (
        <Modal titulo={ver.titulo} onClose={() => setVer(null)} pie={ver.quitar && <button className="btn peligro" onClick={() => { ver.quitar!(); setVer(null); }}>{L('Quitar', 'Убрать')}</button>}>
          <TextoLargo texto={ver.texto || L('Sin descripción.', 'Нет описания.')} />
        </Modal>
      )}
      {editar && (
        <Modal titulo="Editar" onClose={() => setEditar(null)}
          pie={<>
            <button className="btn peligro" onClick={() => { upd((x) => { x[editar.lista].splice(editar.i, 1); }); setEditar(null); }}>{L('Quitar', 'Убрать')}</button>
            <button className="btn primario" onClick={() => setEditar(null)}>{L('Listo', 'Готово')}</button>
          </>}>
          <label className="etiqueta"><span>{L('Nombre', 'Название')}</span><input className="campo" value={editar.e.nombre} onChange={(ev) => { const v = ev.target.value; setEditar({ ...editar, e: { ...editar.e, nombre: v } }); upd((x) => { x[editar.lista][editar.i].nombre = v; }); }} /></label>
          <label className="etiqueta"><span>{L('Descripción', 'Описание')}</span><Texto multilinea filas={10} valor={editar.e.texto} set={(v) => { setEditar((ed) => ed && { ...ed, e: { ...ed.e, texto: v } }); upd((x) => { x[editar.lista][editar.i].texto = v; }); }} /></label>
        </Modal>
      )}
    </div>
  );
}

/** De dónde sale una dote (para enseñarlo debajo del nombre). */
function fuenteDote(d: EntradaTexto, trasfondo?: string, dotesTrasfondo?: string[]): string {
  if (d.fuente) return d.fuente;
  if (esDoteDeEstilo(d)) return d.origen!;
  if (d.origen === 'origen' || dotesTrasfondo?.includes(d.nombre)) return trasfondo ? L(`Trasfondo ${trasfondo}`, `Предыстория: ${trasfondo}`) : L('Dote de origen', 'Черта происхождения');
  if (d.origen === 'general' || d.origen === 'don épico') return L('Subida de nivel', 'Повышение уровня');
  return d.origen ? td(d.origen) : L('Añadida a mano', 'Добавлена вручную');
}

/** Rasgos que mejoran con el nivel (Disparo arcano → mejorado → avanzado…) van en una sola línea, en el sitio del nivel más alto. */
const SUFIJO_MEJORA = /\s+(mejorad[oa]s?|avanzad[oa]|perfeccionad[oa]|maestr[oa]|superior|mayor|definitiv[oa])(\s*\([^)]*\))?$/i;
const claveRasgo = (n: string) => n.replace(SUFIJO_MEJORA, '$2').replace(/^Castigas\b/, 'Castigar').trim();
type RasgoBase = RasgoDef & { base: string; nivel: number };
function agruparMejorados(lista: RasgoBase[]): (RasgoBase & { niveles: number[] })[] {
  const grupos = new Map<string, RasgoBase[]>();
  for (const r of lista) { const k = claveRasgo(r.nombre); grupos.set(k, [...(grupos.get(k) ?? []), r]); }
  return [...grupos.values()].map((g) => {
    const orden = [...g].sort((a, b) => a.nivel - b.nivel);
    const primero = orden[0], ultimo = orden[orden.length - 1];
    return g.length === 1 ? { ...primero, niveles: [primero.nivel] }
      : { ...primero, nivel: ultimo.nivel, niveles: orden.map((r) => r.nivel), texto: orden.map((r) => `■ ${td(r.nombre)} (${L('nivel', 'уровень')} ${r.nivel})\n${r.texto}`).join('\n\n') };
  }).sort((a, b) => a.nivel - b.nivel);
}

/** El rasgo de clase al que pertenece una elección: el de nombre más largo que aparece en el nombre de la elección. */
function rasgoDeEleccion(e: Eleccion, lista: RasgoBase[]): RasgoBase | undefined {
  const n = e.es.toLowerCase();
  return lista.filter((r) => n.includes(r.base.toLowerCase())).sort((a, b) => b.base.length - a.base.length)[0];
}
