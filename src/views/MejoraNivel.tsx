import { useState } from 'react';
import { useFicha } from './Ficha';
import { Buscador, Modal } from '../ui';
import { L, T, RU_NOMBRE_ATRIBUTO } from '../i18n';
import { td } from '../datosRu';
import type { Dote } from '../data';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo, type EntradaTexto, type Personaje } from '../types';
import { car } from '../rules';
import { DOTE_MEJORA, mejoraDe, opcionesMejora, requisitoDote, type OpcionesMejora } from '../mejoras';
import { dotesDeClases, nivelTotal, nivelesMejora } from '../multiclase';
import { esDoteDeEstilo } from '../elecciones';
import type { Clase, Trasfondo } from '../data';

const nombreAtr = (a: Atributo) => T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a]);

/** Cuántas «Mejora de característica» / «Don épico» de las clases faltan por resolver (con características o con una dote). */
export function mejorasPendientes(p: Personaje, clases: Clase[] | null, trasfondos: Trasfondo[] | null): number {
  return Math.max(0, dotesDeClases(p, clases?.find((c) => c.nombre === p.clase)) - dotesTomadas(p, trasfondos));
}
/** Dotes que gastan una «Mejora de característica» de la clase (sin la de origen del trasfondo ni los estilos de combate). */
function dotesTomadas(p: Personaje, trasfondos: Trasfondo[] | null): number {
  const deOrigen = new Set(trasfondos?.find((t) => t.nombre === p.trasfondoEstilo)?.dotes ?? []);
  let origenUsado = false;
  return p.dotes.filter((d) => {
    if (esDoteDeEstilo(d)) return false;
    // La primera dote de origen (la del trasfondo) no cuenta: es la de nivel 1.
    if (!origenUsado && (d.origen === 'origen' || deOrigen.has(d.nombre))) { origenUsado = true; return false; }
    return true;
  }).length;
}
/** De qué nivel es la siguiente mejora pendiente («Nivel 8»). */
export const siguienteMejora = (p: Personaje, clases: Clase[] | null, trasfondos: Trasfondo[] | null) =>
  nivelesMejora(p, clases?.find((c) => c.nombre === p.clase))[dotesTomadas(p, trasfondos)] ?? `Nivel ${nivelTotal(p)}`;

/** Elegir a qué característica(s) va el +1 de una dote (o los +2 de la Mejora de Característica). */
export function ElegirAtributos({ op, valor, inicial, onListo }: { op: OpcionesMejora; valor: (a: Atributo) => number; inicial?: Atributo[]; onListo: (a: Atributo[]) => void }) {
  const [sel, setSel] = useState<Atributo[]>(inicial?.slice(0, op.cantidad) ?? []);
  const sube = (a: Atributo) => sel.filter((x) => x === a).length;
  const cabe = (a: Atributo) => valor(a) + sube(a) < op.max;
  const poner = (a: Atributo) => setSel((s) => (op.cantidad === 1 ? [a] : s.length >= op.cantidad ? [s[1], a] : [...s, a]));
  return (
    <div className="elegir-mejora">
      <p className="nota">{op.cantidad === 2
        ? L('Elige dos veces: puede ser la misma característica (+2) o dos distintas (+1 y +1).', 'Выбери дважды: одну характеристику (+2) или две разные (+1 и +1).')
        : L('¿A qué característica va el +1?', 'Какой характеристике +1?')} {L(`Máximo ${op.max}.`, `Максимум ${op.max}.`)}</p>
      <div className="chips">
        {ATRIBUTOS.filter((a) => op.atrs.includes(a)).map((a) => (
          <button key={a} className={`chip ${sube(a) ? 'activo' : ''}`} disabled={!cabe(a) && !(op.cantidad === 1 && sube(a))} onClick={() => poner(a)}>
            {nombreAtr(a)} {valor(a)}{sube(a) ? ` → ${Math.min(op.max, valor(a) + sube(a))}` : ''}
          </button>
        ))}
      </div>
      {op.cantidad === 2 && sel.length > 0 && <button className="btn enlace pequeno" onClick={() => setSel([])}>↺ {L('Empezar de nuevo', 'Сначала')}</button>}
      <div className="fila-botones"><button className="btn primario" disabled={sel.length < op.cantidad} onClick={() => onListo(sel)}>✓ {L('Confirmar', 'Подтвердить')}</button></div>
    </div>
  );
}

/** Valor sin contar esta dote (para enseñar «14 → 15»). */
const valorSin = (p: Personaje, i: number | null) => (a: Atributo) => {
  if (i === null) return car(p, a);
  const otra = { ...p, dotes: p.dotes.filter((_, k) => k !== i) };
  return car(otra, a);
};

/** Ventana de la Mejora de característica: subir características o coger una dote (con sus requisitos). */
export function ModalMejoraNivel({ onClose, onMasTarde }: { onClose: () => void; onMasTarde?: () => void }) {
  const tarde = onMasTarde ?? onClose;
  return <Modal titulo={L('Mejora de característica', 'Увеличение характеристик')} onClose={tarde}><CuerpoMejora onHecho={onClose} onMasTarde={tarde} /></Modal>;
}

/** Contenido de la Mejora de característica (también va dentro de la subida de nivel, sin «más tarde»). */
export function CuerpoMejora({ onHecho, onMasTarde }: { onHecho: () => void; onMasTarde?: () => void }) {
  const tarde = onMasTarde;
  const { p, upd, dotes, clases, trasfondos } = useFicha();
  const [paso, setPaso] = useState<'inicio' | 'carac' | 'dote'>('inicio');
  const [dote, setDote] = useState<Dote | null>(null);
  const epico = nivelTotal(p) >= 19;
  const mejora = dotes?.find((d) => d.nombre === DOTE_MEJORA);
  const valor = (a: Atributo) => car(p, a);
  const anadir = (e: EntradaTexto) => { upd((x) => { x.dotes.push({ ...e, fuente: siguienteMejora(x, clases, trasfondos) }); }); setPaso('inicio'); setDote(null); onHecho(); };
  const opDote = dote && opcionesMejora({ nombre: dote.nombre, texto: dote.descripcion });
  return (
    <>
      {paso === 'inicio' && <>
        <p>{L('Al llegar a este nivel puedes mejorar tus características o adquirir una dote.', 'На этом уровне можно увеличить характеристики или взять черту.')}</p>
        <div className="opciones-mejora">
          <button className="btn primario" onClick={() => setPaso('carac')}>📈 {L('Mejorar características', 'Увеличить характеристики')}<small>{L('+2 a una o +1 a dos', '+2 к одной или +1 к двум')}</small></button>
          <button className="btn" onClick={() => setPaso('dote')}>⭐ {L('Adquirir una dote', 'Взять черту')}<small>{epico ? L('generales o dones épicos', 'общие или эпические дары') : L('de las que cumples los requisitos', 'из тех, чьи требования выполняешь')}</small></button>
        </div>
        {tarde && <p className="nota pequena centro"><button className="btn enlace pequeno" onClick={tarde}>{L('Decidir más tarde', 'Решить позже')}</button> · {L('queda pendiente en «Rasgos» → Dotes.', 'останется в «Особенности» → Черты.')}</p>}
      </>}
      {paso === 'carac' && <ElegirAtributos op={{ atrs: [...ATRIBUTOS], cantidad: 2, max: 20 }} valor={valor}
        onListo={(m) => anadir({ nombre: DOTE_MEJORA, texto: mejora?.descripcion ?? '', origen: 'general', mejora: m })} />}
      {paso === 'dote' && !dote && <>
        <Buscador<Dote>
          items={(dotes ?? []).filter((d) => (d.categoria === 'general' || (epico && d.categoria === 'don épico')) && d.nombre !== DOTE_MEJORA)}
          texto={(d) => d.nombre} placeholder="Busca una dote…"
          filtro={(d) => !p.dotes.some((x) => x.nombre === d.nombre) && requisitoDote(p, d, valor).ok}
          render={(d) => { const r = requisitoDote(p, d, valor).texto; return <span className="res-conjuro"><strong>{td(d.nombre)}</strong><small>{td(d.categoria)}{r ? ` · ${L('Requisitos', 'Требования')}: ${r}` : ''}</small></span>; }}
          onElegir={(d) => {
            if (typeof d === 'string') return;
            const o = opcionesMejora({ nombre: d.nombre, texto: d.descripcion });
            if (!o || o.atrs.length === 1) anadir({ nombre: d.nombre, texto: d.descripcion, origen: d.categoria });
            else setDote(d);
          }}
        />
        <p className="nota pequena">{L('Solo salen las dotes cuyo nivel y características cumples. Si pide una competencia o ser lanzador, compruébalo tú.', 'Показаны черты, чьи требования по уровню и характеристикам выполнены. Владения и «быть заклинателем» проверь сам.')}</p>
      </>}
      {dote && opDote && <>
        <p><strong>{td(dote.nombre)}</strong></p>
        <ElegirAtributos op={opDote} valor={valor} onListo={(m) => anadir({ nombre: dote.nombre, texto: dote.descripcion, origen: dote.categoria, mejora: m })} />
      </>}
      {paso !== 'inicio' && <p className="nota pequena centro"><button className="btn enlace pequeno" onClick={() => { if (dote) setDote(null); else setPaso('inicio'); }}>← {L('Volver', 'Назад')}</button></p>}
    </>
  );
}

/** Elegir (o cambiar) la característica de una dote ya cogida. */
export function ModalElegirMejora({ i, onClose }: { i: number; onClose: () => void }) {
  const { p, upd } = useFicha();
  const d = p.dotes[i];
  const op = d && opcionesMejora(d);
  if (!op) return null;
  return (
    <Modal titulo={td(d.nombre)} onClose={onClose}>
      <ElegirAtributos op={op} valor={valorSin(p, i)} inicial={mejoraDe(d)} onListo={(m) => { upd((x) => { x.dotes[i].mejora = m; }); onClose(); }} />
    </Modal>
  );
}
