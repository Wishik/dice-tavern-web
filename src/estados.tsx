import { useContext, useState } from 'react';
import { L, idioma } from './i18n';
import { Modal } from './ui';
import { DiceCtx } from './dice';

/** Estados (condiciones) de D&D 2024 con un resumen corto de su efecto. */
export const ESTADOS: { id: string; icono: string; es: string; ru: string; efEs: string; efRu: string; dano?: string }[] = [
  { id: 'agarrado', icono: '✊', es: 'Agarrado', ru: 'Схваченный', efEs: 'Velocidad 0. Desventaja en ataques contra quien no sea quien te agarra. Te puede arrastrar (cada pie le cuesta 1 extra, salvo que seas Diminuto o 2+ tamaños menor).', efRu: 'Скорость 0. Помеха на атаки по всем, кроме того, кто схватил. Он может тащить тебя (каждый фут стоит ему 1 лишний, если ты не Крошечный и не меньше на 2+ размера).' },
  { id: 'apresado', icono: '⛓️', es: 'Apresado', ru: 'Опутанный', efEs: 'Velocidad 0. Ataques contra ti con ventaja y tus ataques con desventaja. Desventaja en TS de Destreza.', efRu: 'Скорость 0. Атаки по тебе с преимуществом, твои атаки с помехой. Помеха на спасброски ЛОВ.' },
  { id: 'ardiendo', icono: '🔥', dano: '1d4', es: 'Ardiendo', ru: 'Горящий', efEs: '1d4 de daño de fuego al principio de cada turno. Como acción puedes apagarlo derribándote y rodando. También se apaga si te empapas, sumerges o ahogas.', efRu: '1к4 урона огнём в начале каждого хода. Действием можно потушить: лечь (сбит с ног) и кататься по земле. Гаснет и если промокнуть, погрузиться в воду или задохнуться.' },
  { id: 'asfixiandose', icono: '🫁', es: 'Asfixiándose', ru: 'Задыхающийся', efEs: 'Aguantas la respiración 1 + mod. CON minutos (mín. 30 s). Sin aire, sumas 1 nivel de cansancio al final de cada turno. Al recuperar el aliento pierdes esos niveles.', efRu: 'Дыхание задерживается на 1 + мод. ТЕЛ минут (мин. 30 с). Без воздуха +1 уровень истощения в конце каждого хода. Когда снова дышишь, эти уровни уходят.' },
  { id: 'asustado', icono: '😱', es: 'Asustado', ru: 'Испуганный', efEs: 'Desventaja en pruebas de característica y ataques mientras veas la fuente del miedo. No puedes acercarte a ella voluntariamente.', efRu: 'Помеха на проверки характеристик и атаки, пока видишь источник страха. Нельзя добровольно к нему приближаться.' },
  { id: 'aturdido', icono: '💫', es: 'Aturdido', ru: 'Ошеломлённый', efEs: 'Incapacitado. Fallas las TS de Fuerza y Destreza. Ataques contra ti con ventaja.', efRu: 'Недееспособен. Автоматически проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом.' },
  { id: 'cegado', icono: '🙈', es: 'Cegado', ru: 'Ослеплённый', efEs: 'No ves: fallas las pruebas que requieran la vista. Ataques contra ti con ventaja y tus ataques con desventaja.', efRu: 'Ничего не видит, проваливает проверки зрения. Атаки по нему с преимуществом, его атаки с помехой.' },
  { id: 'derribado', icono: '🔻', es: 'Derribado', ru: 'Сбит с ног', efEs: 'Puedes arrastrarte o gastar la mitad del movimiento para levantarte (no si tu velocidad es 0). Desventaja en tus ataques; cuerpo a cuerpo contra ti con ventaja, a distancia con desventaja.', efRu: 'Можно ползти или потратить половину перемещения, чтобы встать (нельзя при скорости 0). Помеха на свои атаки; ближние атаки по тебе с преимуществом, дальние с помехой.' },
  { id: 'deslumbrado', icono: '😵', es: 'Deslumbrado', ru: 'Ослеплённый светом', efEs: 'Desventaja en pruebas que requieran la vista. −2 a las tiradas de ataque y a la CA.', efRu: 'Помеха на проверки, требующие зрения. −2 к броскам атаки и к КД.' },
  { id: 'ensordecido', icono: '🙉', es: 'Ensordecido', ru: 'Оглохший', efEs: 'No oyes: fallas las pruebas que requieran el oído.', efRu: 'Ничего не слышит, проваливает проверки слуха.' },
  { id: 'envenenado', icono: '🤢', es: 'Envenenado', ru: 'Отравленный', efEs: 'Salvo que el efecto diga otra cosa: desventaja en tiradas de ataque y pruebas de característica.', efRu: 'Если эффект не говорит иное: помеха на броски атаки и проверки характеристик.' },
  { id: 'hechizado', icono: '💞', es: 'Hechizado', ru: 'Очарованный', efEs: 'No puedes atacar ni elegir como objetivo de efectos dañinos o mágicos a quien te hechizó. Tiene ventaja en pruebas sociales contigo.', efRu: 'Нельзя атаковать очаровавшего или выбирать его целью вредных и магических эффектов. Он получает преимущество на социальные проверки с тобой.' },
  { id: 'incapacitado', icono: '⛔', es: 'Incapacitado', ru: 'Недееспособный', efEs: 'Sin acciones, acciones adicionales ni reacciones. Velocidad 0. Pierdes la concentración. No puedes hablar. Desventaja en iniciativa.', efRu: 'Нет действий, бонусных действий и реакций. Скорость 0. Теряет концентрацию. Не может говорить. Помеха на инициативу.' },
  { id: 'inconsciente', icono: '💤', es: 'Inconsciente', ru: 'Без сознания', efEs: 'Derribado e incapacitado, sueltas lo que llevas. Ataques contra ti con ventaja; los cuerpo a cuerpo que aciertan son críticos. Fallas las TS de FUE y DES. No eres consciente del entorno.', efRu: 'Сбит с ног и недееспособен, роняет всё из рук. Атаки по нему с преимуществом, попадания вблизи критические. Проваливает спасброски СИЛ и ЛОВ. Не осознаёт окружение.' },
  { id: 'invisible', icono: '👻', es: 'Invisible', ru: 'Невидимый', efEs: 'Ventaja en iniciativa y en ataques contra quien no te vea. No te afectan efectos que requieran verte. Quien sepa dónde estás te ataca con desventaja.', efRu: 'Преимущество на инициативу и атаки по тем, кто тебя не видит. Эффекты, которым нужно тебя видеть, не действуют. Кто знает, где ты, атакует с помехой.' },
  { id: 'maltrecho', icono: '🤕', es: 'Maltrecho', ru: 'Израненный', efEs: 'Tiene menos del 50% de sus PG máximos.', efRu: 'Меньше 50% от максимума хитов.' },
  { id: 'moribundo', icono: '💀', es: 'Moribundo', ru: 'При смерти', efEs: 'Inconsciente. TS contra la muerte al inicio de cada turno: 3 éxitos te estabilizas, 3 fallos mueres. Un 20 te deja con 1 PG; un 1 cuenta como dos fallos.', efRu: 'Без сознания. Спасбросок от смерти в начале каждого хода: 3 успеха — стабилизация, 3 провала — смерть. 20 — сразу 1 хит; 1 — два провала.' },
  { id: 'paralizado', icono: '⚡', es: 'Paralizado', ru: 'Парализованный', efEs: 'Incapacitado. Fallas las TS de Fuerza y Destreza. Ataques contra ti con ventaja; los que aciertan son críticos.', efRu: 'Недееспособен. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом, все попадания критические.' },
  { id: 'petrificado', icono: '🗿', es: 'Petrificado', ru: 'Окаменевший', efEs: 'Convertido en piedra (peso ×10), incapacitado, no envejeces. Ataques contra ti con ventaja. Fallas TS de FUE y DES. Resistencia a todo el daño, inmune a envenenado.', efRu: 'Превращён в камень (вес ×10), недееспособен, не стареет. Атаки по нему с преимуществом. Проваливает спасброски СИЛ и ЛОВ. Сопротивление всему урону, иммунитет к отравлению.' },
  { id: 'sangrando', icono: '🩸', dano: '1d4', es: 'Sangrando', ru: 'Кровотечение', efEs: '1d4 PG de daño al inicio de cada turno (o lo que diga el efecto). Termina con curación mágica o con Medicina CD 17 tuya o de un aliado a 5 pies (con útiles de sanador, sin tirada).', efRu: '1к4 урона в начале каждого хода (или сколько сказано в эффекте). Прекращается от магического лечения или проверки Медицины Сл 17 (своей или союзника в 5 фт; с набором целителя — без броска).' },
  { id: 'concentrado', icono: '🎯', es: 'Concentrado', ru: 'Концентрация', efEs: 'Mantiene un conjuro de concentración. Al recibir daño, salvación de CON (CD 10 o la mitad del daño).', efRu: 'Поддерживает заклинание с концентрацией. При уроне — спасбросок ТЕЛ (Сл 10 или половина урона).' },
];
export const nombreEstado = (id: string) => { const e = ESTADOS.find((x) => x.id === id); return e ? (idioma() === 'ru' ? e.ru : e.es) : id; };
export const iconoEstado = (id: string) => ESTADOS.find((x) => x.id === id)?.icono ?? '•';

/** Duración (en rondas; sin valor = hasta que se quite) y daño personalizado de cada estado activo. */
export interface DetalleEstado { dur?: number; dano?: string }
export type DetallesEstados = Record<string, DetalleEstado>;
type SetEstados = (e: string[], agot: number, det: DetallesEstados) => void;

const danoBase = (id: string) => ESTADOS.find((x) => x.id === id)?.dano;
/** Fórmula de daño que hace el estado ahora (la personalizada si la hay). */
export const danoEstado = (id: string, det?: DetallesEstados) => det?.[id]?.dano || danoBase(id);
const ronda = (n: number) => (idioma() === 'ru' ? `${n} р.` : `${n} r.`);

/** Pasa una ronda: resta 1 a cada duración y quita los estados que llegan a 0. Devuelve null si no cambia nada. */
export function pasarRonda(estados: string[], det: DetallesEstados = {}): { estados: string[]; detalles: DetallesEstados } | null {
  let cambia = false;
  const nd: DetallesEstados = {};
  let ne = estados;
  for (const [id, d] of Object.entries(det)) {
    if (!estados.includes(id)) { cambia = true; continue; }
    if (d.dur && d.dur > 0) {
      cambia = true;
      if (d.dur - 1 <= 0) { ne = ne.filter((x) => x !== id); continue; }
      nd[id] = { ...d, dur: d.dur - 1 };
    } else nd[id] = d;
  }
  return cambia ? { estados: ne, detalles: nd } : null;
}

/** Fila de chips con los estados activos (y el agotamiento). Tocar abre el editor si hay set. */
export function ChipsEstados({ estados, agotamiento, detalles = {}, set, vacio, quien }: { estados: string[]; agotamiento: number; detalles?: DetallesEstados; set?: SetEstados; vacio?: boolean; quien?: string }) {
  const [abierto, setAbierto] = useState(false);
  const hay = estados.length > 0 || agotamiento > 0;
  if (!hay && !set && !vacio) return null;
  return (
    <>
      <div className={`chips-estados ${set ? 'editable' : ''}`} onClick={set ? () => setAbierto(true) : undefined} role={set ? 'button' : undefined}>
        {estados.map((e) => {
          const dano = danoEstado(e, detalles); const dur = detalles[e]?.dur;
          return <span key={e} className={`chip-estado e-${e}`} title={nombreEstado(e)}>{iconoEstado(e)} {nombreEstado(e)}{dano ? ` ${dano}` : ''}{dur ? <small className="dur">⏳{ronda(dur)}</small> : null}</span>;
        })}
        {agotamiento > 0 && <span className="chip-estado e-agotamiento">😩 {L('Agotamiento', 'Истощение')} {agotamiento}</span>}
        {!hay && set && <span className="chip-estado vacio">＋ {L('Estado', 'Состояние')}</span>}
      </div>
      {abierto && set && <ModalEstados estados={estados} agotamiento={agotamiento} detalles={detalles} quien={quien} onClose={() => setAbierto(false)} set={set} />}
    </>
  );
}

function ModalEstados({ estados, agotamiento, detalles, set, onClose, quien }: { estados: string[]; agotamiento: number; detalles: DetallesEstados; set: SetEstados; onClose: () => void; quien?: string }) {
  const ru = idioma() === 'ru';
  const dados = useContext(DiceCtx);
  const cambiar = (id: string) => {
    if (estados.includes(id)) { const d = { ...detalles }; delete d[id]; set(estados.filter((x) => x !== id), agotamiento, d); }
    else set([...estados, id], agotamiento, detalles);
  };
  const detalle = (id: string, cambio: DetalleEstado) => {
    const d = { ...(detalles[id] ?? {}), ...cambio };
    if (!d.dur) delete d.dur;
    if (d.dano === undefined) delete d.dano;
    set(estados, agotamiento, { ...detalles, [id]: d });
  };
  return (
    <Modal titulo={L('Estados', 'Состояния')} onClose={onClose}>
      <ul className="lista-estados">
        {ESTADOS.map((e) => {
          const activo = estados.includes(e.id);
          const det = detalles[e.id] ?? {};
          const propio = det.dano !== undefined;
          const formula = danoEstado(e.id, detalles) ?? '';
          return (
            <li key={e.id} className={activo ? 'activo' : ''}>
              <button type="button" onClick={() => cambiar(e.id)}>
                <span className="icono-estado">{e.icono}</span>
                <span><strong>{ru ? e.ru : e.es}</strong><small>{ru ? e.efRu : e.efEs}</small></span>
                <span className="marca">{activo ? '✓' : ''}</span>
              </button>
              {activo && (
                <div className="extra-estado">
                  <span className="etq-dur">⏳ {L('Duración', 'Длительность')}</span>
                  <span className="contador pequeno">
                    <button type="button" onClick={() => detalle(e.id, { dur: Math.max(0, (det.dur ?? 0) - 1) })}>−</button>
                    <span>{det.dur ? ronda(det.dur) : '∞'}</span>
                    <button type="button" onClick={() => detalle(e.id, { dur: (det.dur ?? 0) + 1 })}>+</button>
                  </span>
                  {e.dano && (
                    <div className="dano-estado">
                      <span className="segmentado">
                        <button type="button" className={!propio ? 'sel' : ''} onClick={() => detalle(e.id, { dano: undefined })}>{L('Normal', 'Обычный')} ({e.dano})</button>
                        <button type="button" className={propio ? 'sel' : ''} onClick={() => detalle(e.id, { dano: det.dano ?? e.dano })}>{L('Personalizado', 'Свой')}</button>
                      </span>
                      {propio && <input className="campo formula" value={det.dano} placeholder="2d6+1" onChange={(ev) => detalle(e.id, { dano: ev.target.value })} />}
                      {dados && <button type="button" className="btn pequeno" disabled={!formula} onClick={() => dados.tirar(`${quien ? quien + ': ' : ''}${ru ? e.ru : e.es}`, formula)}>🎲 {formula}</button>}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        <li className={agotamiento > 0 ? 'activo' : ''}>
          <div className="fila-agotamiento">
            <span className="icono-estado">😩</span>
            <span><strong>{L('Agotamiento', 'Истощение')}</strong><small>{L('Agotado o cansado. Cada nivel: −2 a las tiradas de d20 y −5 pies de velocidad. A nivel 6, mueres. Un descanso largo quita 1 nivel.', 'Каждый уровень: −2 к броскам к20 и −5 фт скорости. На 6-м уровне — смерть. Продолжительный отдых снимает 1 уровень.')}</small></span>
            <span className="contador">
              <button type="button" onClick={() => set(estados, Math.max(0, agotamiento - 1), detalles)}>−</button>
              <span>{agotamiento}</span>
              <button type="button" onClick={() => set(estados, Math.min(6, agotamiento + 1), detalles)}>+</button>
            </span>
          </div>
        </li>
      </ul>
    </Modal>
  );
}
