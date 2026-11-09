import { useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Modal, PuntoRojo, Seccion, Texto, TextoLargo } from '../ui';
import { buscarClase, buscarRaza } from '../avisos';
import type { Dote, RasgoDef } from '../data';
import type { EntradaTexto } from '../types';
import { RASGOS_IDIOMA, RASGOS_RECOMENDADOS } from '../rules';
import { L, T, RU_CLASES, RU_RAZAS } from '../i18n';

export function TabRasgos() {
  const { p, upd, razas, clases, dotes, trasfondos, avisos } = useFicha();
  const [modal, setModal] = useState<null | 'rasgoRaza' | 'dote' | 'rasgo'>(null);
  const [ver, setVer] = useState<{ titulo: string; texto: string; quitar?: () => void } | null>(null);
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
  const rasgosClase = [...(clase?.rasgos ?? []), ...(sub?.rasgos ?? []).map((r) => ({ ...r, nombre: `${r.nombre} (${sub!.nombre})` }))]
    .filter((r) => r.nivel <= p.nivel && !RASGOS_IDIOMA[r.nombre]).sort((a, b) => a.nivel - b.nivel);

  return (
    <div className="tab">
      <Seccion titulo="Dotes" aviso={avisos.dotes}>
        {p.dotes.length === 0 && <p className="vacio">{L('Sin dotes.', 'Нет черт.')}</p>}
        <ul className="lista-rasgos">
          {p.dotes.map((d, i) => <li key={i}><button onClick={() => setEditar({ lista: 'dotes', i, e: d })}><strong>{d.nombre}</strong><span>{d.texto.slice(0, 120)}{d.texto.length > 120 ? '…' : ''}</span></button></li>)}
        </ul>
        <BotonAnadir aviso={avisos.dotes > 0} onClick={() => setModal('dote')}>Añadir dote</BotonAnadir>
        {avisos.dotes > 0 && <p className="nota">{L(`Te ${avisos.dotes > 1 ? `faltan ${avisos.dotes} dotes` : 'falta 1 dote'}`, `Не хватает черт: ${avisos.dotes}`)}{tras ? L(` (de origen por ${tras.nombre}: ${tras.dotes.join(', ')})`, ` (черта происхождения от «${tras.nombre}»: ${tras.dotes.join(', ')})`) : ''}{clase ? L('; las «Mejora de característica» de tu clase también cuentan', '; «Увеличение характеристик» класса тоже считается') : ''}.</p>}
      </Seccion>

      {raza && (
        <Seccion titulo={L(`Rasgos de ${raza.nombre}`, `Особенности: ${T(RU_RAZAS, raza.nombre)}`)} aviso={avisos.rasgosRaza}>
          <ul className="lista-rasgos">
            {raza.rasgosFijos.map((r) => <li key={r.nombre}><button onClick={() => setVer({ titulo: r.nombre, texto: r.texto })}><strong>{r.nombre}</strong><small className="etq-fijo">{L('fijo', 'постоянная')}</small></button></li>)}
            {p.rasgosRaza.map((n) => {
              const r = opciones.find((o) => o.nombre === n);
              return <li key={n}><button onClick={() => setVer({ titulo: n, texto: r?.texto ?? '', quitar: () => upd((x) => { x.rasgosRaza = x.rasgosRaza.filter((y) => y !== n); }) })}><strong>{n}</strong><small>{L('elegido', 'выбрана')}</small></button></li>;
            })}
          </ul>
          <BotonAnadir aviso={avisos.rasgosRaza > 0} onClick={() => setModal('rasgoRaza')}>{L('Elegir rasgo', 'Выбрать особенность')} ({p.rasgosRaza.length}/{raza.rasgosAElegir})</BotonAnadir>
        </Seccion>
      )}

      {clase && (
        <Seccion titulo={`${L(`Rasgos de ${clase.nombre}`, `Умения: ${T(RU_CLASES, clase.nombre)}`)}${sub ? ` · ${sub.nombre}` : ''}`}>
          <ul className="lista-rasgos">
            {rasgosClase.map((r, i) => <li key={i}><button onClick={() => setVer({ titulo: r.nombre, texto: r.texto })}><strong>{r.nombre}</strong><small>{L('Nivel', 'Уровень')} {r.nivel}</small></button></li>)}
          </ul>
          {avisos.subclase && <p className="aviso-rojo"><PuntoRojo /> {L('A nivel 3 eliges subclase (en «Personaje»).', 'На 3 уровне выбираешь подкласс (во вкладке «Персонаж»).')}</p>}
        </Seccion>
      )}

      <Seccion titulo="Otros rasgos">
        <ul className="lista-rasgos">
          {p.rasgos.map((d, i) => <li key={i}><button onClick={() => setEditar({ lista: 'rasgos', i, e: d })}><strong>{d.nombre}</strong><span>{d.texto.slice(0, 120)}</span></button></li>)}
        </ul>
        <BotonAnadir onClick={() => { upd((x) => { x.rasgos.push({ nombre: L('Nuevo rasgo', 'Новая особенность'), texto: '' }); }); setEditar({ lista: 'rasgos', i: p.rasgos.length, e: { nombre: L('Nuevo rasgo', 'Новая особенность'), texto: '' } }); }}>Añadir rasgo</BotonAnadir>
      </Seccion>

      {modal === 'rasgoRaza' && (
        <Modal titulo="Elegir rasgo racial" onClose={() => setModal(null)}>
          <p className="nota pequena">{L('★ = rasgo de tu raza · 👍 = recomendado para', '★ = особенность твоей расы · 👍 = рекомендуется для')} {p.clase ? T(RU_CLASES, p.clase) : L('tu clase', 'твоего класса')}</p>
          <Buscador<(typeof opciones)[number]>
            items={opciones} texto={(r) => r.nombre} placeholder="Busca un rasgo…"
            filtro={(r) => !p.rasgosRaza.includes(r.nombre) && !(tieneExcl && r.grupo.includes('excluyentes'))}
            render={(r) => <span className={`res-conjuro ${r.deRaza ? 'de-raza' : ''}`}><strong>{r.deRaza ? '★ ' : ''}{r.nombre}{r.recomendado ? ' 👍' : ''}</strong><small>{r.deRaza ? L(r.grupo, `Уникальные: ${T(RU_RAZAS, raza?.nombre ?? '')}`) : r.grupo.includes('excluyentes') ? L(r.grupo, 'Общие взаимоисключающие (только одна)') : L(r.grupo, 'Общие')} · {r.texto.slice(0, 90)}…</small></span>}
            onElegir={(r) => { const n = typeof r === 'string' ? r : r.nombre; upd((x) => { x.rasgosRaza.push(n); }); setModal(null); }}
          />
        </Modal>
      )}
      {modal === 'dote' && (
        <Modal titulo="Añadir dote" onClose={() => setModal(null)}>
          <Buscador<Dote>
            items={dotes ?? []} texto={(d) => d.nombre} placeholder="Busca una dote…"
            filtro={(d) => !p.dotes.some((x) => x.nombre === d.nombre) || d.nombre === 'Mejora de Característica'}
            render={(d) => <span className="res-conjuro"><strong>{d.nombre}{tras?.dotes.includes(d.nombre) ? ' ★' : ''}</strong><small>{L('Dote', 'Черта')} {d.categoria} · {d.descripcion.slice(0, 80)}…</small></span>}
            onElegir={(d) => {
              const e = typeof d === 'string' ? { nombre: d, texto: '' } : { nombre: d.nombre, texto: d.descripcion, origen: d.categoria };
              upd((x) => { x.dotes.push(e); }); setModal(null);
              if (typeof d === 'string') setEditar({ lista: 'dotes', i: p.dotes.length, e });
            }}
          />
          {tras && <p className="nota">{L('★ = dote de origen de tu trasfondo.', '★ = черта происхождения твоей предыстории.')}</p>}
        </Modal>
      )}
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
