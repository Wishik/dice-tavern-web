import { useEffect } from 'react';
import { useFicha } from './Ficha';
import { L, T, RU_CLASES } from '../i18n';
import { td } from '../datosRu';
import { clasesDe } from '../multiclase';
import { HABILIDADES } from '../rules';
import { limitesHabilidades, anotarOrden } from '../limitesHabilidades';
import { eleccionesDe, eleccionesPendientes } from '../elecciones';
import { eleccionesPendientes as conjurosPendientes } from '../conjurosRasgos';
import { buscarClase, buscarRaza } from '../avisos';
import { mejorasPendientes, CuerpoMejora } from './MejoraNivel';
import { Elecciones } from './Elecciones';
import { TabMagia } from './TabMagia';
import { Ayuda, useAlFinal } from './Asistente';
import type { Personaje } from '../types';
import type { Clase, Razas, Trasfondo } from '../data';

/**
 * Después de tirar los PG de la subida de nivel: lo nuevo que da el nivel y, paso a paso, todo lo que hay que elegir
 * (subclase, mejora de característica, habilidades, elecciones, conjuros). No se puede seguir hasta completar cada paso.
 */
type Paso = 'rasgos' | 'subclase' | 'mejora' | 'habilidades' | 'elecciones' | 'conjuros' | 'fin';
const TITULOS: Record<Paso, [string, string]> = {
  rasgos: ['Lo nuevo de tu nivel', 'Что нового на уровне'], subclase: ['Subclase', 'Подкласс'], mejora: ['Mejora de característica', 'Увеличение характеристик'],
  habilidades: ['Habilidades', 'Навыки'], elecciones: ['Por elegir', 'Нужно выбрать'], conjuros: ['Conjuros', 'Заклинания'], fin: ['¡Nivel completado!', 'Уровень готов!'],
};

interface Datos { clases: Clase[] | null; razas: Razas | null; trasfondos: Trasfondo[] | null }
/** Qué falta en cada paso (0 = nada). */
function falta(paso: Paso, p: Personaje, d: Datos, magia: number): number {
  const clase = buscarClase(d.clases, p.clase);
  switch (paso) {
    case 'subclase': return clasesDe(p).filter((c) => c.nivel >= 3 && !c.subclase && buscarClase(d.clases, c.clase)).length;
    case 'mejora': return d.clases ? mejorasPendientes(p, d.clases, d.trasfondos) : 0;
    case 'habilidades': {
      const lim = limitesHabilidades(p, clase, d.trasfondos);
      const comp = Object.values(p.habilidades).filter((h) => h.comp).length, per = Object.values(p.habilidades).filter((h) => h.pericia).length;
      return Math.max(0, lim.comp - comp) + Math.max(0, lim.pericia - per);
    }
    case 'elecciones': return eleccionesPendientes(p, eleccionesDe(p, d.clases, buscarRaza(d.razas, p.raza)));
    case 'conjuros': return magia + conjurosPendientes(p, d.razas).length;
    default: return 0;
  }
}

export function SubidaPasos() {
  const { p, upd, clases, razas, trasfondos, avisos } = useFicha();
  const d = { clases, razas, trasfondos };
  const magia = avisos.trucos + avisos.conjuros;
  const s = p.subida!;
  // La lista de pasos se guarda; si al elegir algo aparece algo nuevo por elegir (p. ej. la subclase trae maniobras), se añade su paso.
  const ORDEN: Paso[] = ['rasgos', 'subclase', 'mejora', 'habilidades', 'elecciones', 'conjuros', 'fin'];
  const conPendiente = ORDEN.filter((x) => x === 'rasgos' || x === 'fin' || falta(x, p, d, magia) > 0);
  const faltanPasos = clases ? conPendiente.filter((x) => !(s.pasos ?? []).includes(x)) : [];
  useEffect(() => {
    if (!faltanPasos.length) return;
    upd((x) => { if (x.subida) { const ya = new Set([...(x.subida.pasos ?? []), ...faltanPasos]); x.subida.pasos = ORDEN.filter((k) => ya.has(k)); } });
  });
  const pasos = (s.pasos ?? ['rasgos', 'fin']) as Paso[];
  const i = Math.min(s.i, pasos.length - 1);
  const paso = pasos[i];
  const abajo = useAlFinal(paso);
  const n = falta(paso, p, d, magia);
  const ir = (k: number) => { upd((x) => { if (x.subida) x.subida.i = k; }); window.scrollTo({ top: 0 }); };
  return (
    <div className="tab asistente">
      <div className="asistente-cabecera">
        <div className="pasos-barra">{pasos.map((x, k) => <span key={x} className={k < i ? 'hecho' : k === i ? 'actual' : ''} />)}</div>
        <h2>{s.cambio?.length ? L('Cambio de clase', 'Смена класса') : L(`Nivel ${p.nivel}`, `Уровень ${p.nivel}`)} · {paso === 'rasgos' && s.cambio?.length ? L('Lo que te da', 'Что это даёт') : L(...TITULOS[paso])}</h2>
      </div>
      {paso === 'rasgos' && <PasoRasgos />}
      {paso === 'subclase' && <PasoSubclase />}
      {paso === 'mejora' && (n > 0 ? <div className="detalle-asistente"><CuerpoMejora key={n} onHecho={() => {}} /></div> : <p className="nota">✓ {L('Hecho.', 'Готово.')}</p>)}
      {paso === 'habilidades' && <PasoHabilidades />}
      {paso === 'elecciones' && <><Ayuda>{L('Lo que te toca elegir con este nivel.', 'Что нужно выбрать на этом уровне.')}</Ayuda><Elecciones /></>}
      {paso === 'conjuros' && <><Ayuda>{L('Elige los trucos y conjuros nuevos que te tocan (los que salen con punto rojo).', 'Выбери новые заговоры и заклинания (с красной точкой).')}</Ayuda><TabMagia /></>}
      {paso === 'fin' && <p>{L('Ya está todo. ¡A jugar!', 'Всё готово. Играем!')}</p>}
      <div className="asistente-pie">
        {i > 0 && <button className="btn" onClick={() => ir(i - 1)}>← {L('Atrás', 'Назад')}</button>}
        {paso === 'fin'
          ? <button className="btn primario" onClick={() => upd((x) => { delete x.subida; })}>📜 {L('Ver mi hoja', 'Открыть лист')}</button>
          : <button className="btn primario" disabled={n > 0 || !abajo} onClick={() => ir(i + 1)}>{!abajo ? '↓ ' + L('Baja hasta el final', 'Пролистай до конца') : <>{L('Siguiente', 'Далее')} →</>}</button>}
      </div>
      {n > 0 && <p className="nota centro falta-asistente">⚠ {L(`Te quedan ${n} cosas por elegir en este paso.`, `Осталось выбрать: ${n}.`)}</p>}
    </div>
  );
}

/** Rasgos de clase y subclase que se ganan en los niveles nuevos. */
function PasoRasgos() {
  const { p, clases } = useFicha();
  const antes = p.subida?.antes ?? {};
  const nuevos = clasesDe(p).flatMap((c) => {
    const datos = buscarClase(clases, c.clase);
    const desde = antes[c.clase] ?? 0;
    const sub = datos?.subclases.find((x) => x.nombre === c.subclase);
    const cambio = p.subida?.cambio?.includes(c.clase);
    return [...(datos?.rasgos ?? []).filter((r) => r.nivel > desde), ...(sub?.rasgos ?? []).filter((r) => cambio || r.nivel > desde)].filter((r) => r.nivel <= c.nivel && !/^Opciones de|^Lista de conjuros/.test(r.nombre)).map((r) => ({ clase: c.clase, ...r }));
  });
  return <>
    <Ayuda>{L('Esto es lo que ganas con el nivel. Lo que da números (recursos, bonos…) ya se ha sumado solo; en los pasos siguientes eliges lo que toque.', 'Вот что даёт уровень. Числа (ресурсы, бонусы) уже добавлены; дальше выбираешь, что нужно.')}</Ayuda>
    {nuevos.length === 0 && <p className="nota">{L('Este nivel no trae rasgos nuevos (solo los PG).', 'Новых умений нет (только хиты).')}</p>}
    {nuevos.map((r) => (
      <details key={`${r.clase}-${r.nombre}`} className="detalle-asistente">
        <summary><strong>{td(r.nombre)}</strong> <small>· {T(RU_CLASES, r.clase)} {r.nivel}</small></summary>
        <p className="texto-rasgo">{r.texto}</p>
      </details>
    ))}
  </>;
}

function PasoSubclase() {
  const { p, upd, clases } = useFicha();
  const sin = clasesDe(p).filter((c) => c.nivel >= 3 && !c.subclase);
  return <>
    <Ayuda>{L('A nivel 3 eliges subclase: la especialidad de tu clase. Toca una para leerla.', 'На 3 уровне выбираешь подкласс. Нажми, чтобы прочитать.')}</Ayuda>
    {sin.length === 0 && <p className="nota">✓ {L('Hecho.', 'Готово.')}</p>}
    {sin.map((c) => {
      const datos = buscarClase(clases, c.clase);
      return <div key={c.clase}>
        <h4>{T(RU_CLASES, c.clase)}</h4>
        {datos?.subclases.map((s) => (
          <details key={s.nombre} className="detalle-asistente">
            <summary><strong>{td(s.nombre)}</strong></summary>
            <p className="texto-rasgo">{s.descripcion}</p>
            <ul>{s.rasgos.filter((r) => r.nivel === 3).map((r) => <li key={r.nombre}><strong>{td(r.nombre)}</strong>: {r.texto.slice(0, 220)}{r.texto.length > 220 ? '…' : ''}</li>)}</ul>
            <button className="btn primario" onClick={() => upd((x) => { if (c.clase === x.clase) x.subclase = s.nombre; else { const m = x.multiclase?.find((y) => y.clase === c.clase); if (m) m.subclase = s.nombre; } })}>{L(`Elegir ${s.nombre}`, `Выбрать: ${s.nombre}`)}</button>
          </details>
        ))}
      </div>;
    })}
  </>;
}

function PasoHabilidades() {
  const { p, upd, clases, trasfondos } = useFicha();
  const lim = limitesHabilidades(p, buscarClase(clases, p.clase), trasfondos);
  const comp = HABILIDADES.filter((h) => p.habilidades[h.id]?.comp).map((h) => h.id);
  const per = comp.filter((id) => p.habilidades[id]?.pericia);
  const poner = (id: string, que: 'comp' | 'pericia') => upd((x) => {
    const h = x.habilidades[id]; const on = !h[que];
    if (on && (que === 'comp' ? comp.length >= lim.comp : per.length >= lim.pericia)) return;
    h[que] = on; if (que === 'comp' && !on) h.pericia = false;
    const o = x.ordenHabilidades ?? { comp: [], pericia: [] };
    x.ordenHabilidades = que === 'comp' ? { comp: anotarOrden(o.comp, id, on), pericia: o.pericia } : { comp: o.comp, pericia: anotarOrden(o.pericia, id, on) };
  });
  return <>
    <Ayuda>{L(`Con este nivel ganas habilidades nuevas: ${lim.fuentes.map((f) => f.es).join(', ')}.`, `На этом уровне новые навыки: ${lim.fuentes.map((f) => f.es).join(', ')}.`)}</Ayuda>
    {lim.comp > comp.length || comp.length > 0 ? <>
      <h4>{L('Competencias', 'Владения')} <span className="contador-eleccion">{comp.length} / {lim.comp}</span></h4>
      <div className="chips">{HABILIDADES.map((h) => { const sel = comp.includes(h.id); return <button key={h.id} className={`chip ${sel ? 'activo' : ''}`} disabled={!sel && comp.length >= lim.comp} onClick={() => poner(h.id, 'comp')}>{td(h.nombre)}</button>; })}</div>
    </> : null}
    {lim.pericia > 0 && <>
      <h4>{L('Pericias', 'Компетентность')} <span className="contador-eleccion">{per.length} / {lim.pericia}</span></h4>
      <div className="chips">{comp.map((id) => { const sel = per.includes(id); return <button key={id} className={`chip ${sel ? 'activo' : ''}`} disabled={!sel && per.length >= lim.pericia} onClick={() => poner(id, 'pericia')}>{td(HABILIDADES.find((h) => h.id === id)?.nombre ?? id)}</button>; })}</div>
    </>}
  </>;
}
