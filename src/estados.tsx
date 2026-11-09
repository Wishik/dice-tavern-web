import { useState } from 'react';
import { L, idioma } from './i18n';
import { Modal } from './ui';

/** Estados (condiciones) de D&D 2024 con un resumen corto de su efecto. */
export const ESTADOS: { id: string; icono: string; es: string; ru: string; efEs: string; efRu: string }[] = [
  { id: 'inconsciente', icono: '💤', es: 'Inconsciente', ru: 'Без сознания', efEs: 'Incapacitado y derribado, suelta lo que lleva. Falla salvaciones de FUE y DES. Los ataques contra él tienen ventaja; a 5 pies o menos son críticos.', efRu: 'Недееспособен и сбит с ног, роняет всё из рук. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом, вблизи (5 фт) — критические.' },
  { id: 'paralizado', icono: '⚡', es: 'Paralizado', ru: 'Парализованный', efEs: 'Incapacitado, velocidad 0. Falla salvaciones de FUE y DES. Ataques contra él con ventaja; a 5 pies o menos, críticos.', efRu: 'Недееспособен, скорость 0. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом, вблизи — критические.' },
  { id: 'aturdido', icono: '💫', es: 'Aturdido', ru: 'Ошеломлённый', efEs: 'Incapacitado. Falla salvaciones de FUE y DES. Ataques contra él con ventaja.', efRu: 'Недееспособен. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом.' },
  { id: 'incapacitado', icono: '⛔', es: 'Incapacitado', ru: 'Недееспособный', efEs: 'No puede hacer acciones, acciones adicionales ni reacciones. Pierde la concentración. Desventaja en iniciativa.', efRu: 'Не может совершать действия, бонусные действия и реакции. Теряет концентрацию. Помеха на инициативу.' },
  { id: 'derribado', icono: '🔻', es: 'Derribado', ru: 'Сбит с ног', efEs: 'Solo puede arrastrarse o levantarse (mitad de velocidad). Desventaja en sus ataques. Ataques contra él: ventaja a 5 pies, desventaja más lejos.', efRu: 'Может только ползти или встать (половина скорости). Помеха на его атаки. Атаки по нему: вблизи с преимуществом, издалека с помехой.' },
  { id: 'agarrado', icono: '✊', es: 'Agarrado', ru: 'Схваченный', efEs: 'Velocidad 0. Desventaja en ataques contra quien no sea quien le agarra.', efRu: 'Скорость 0. Помеха на атаки по всем, кроме того, кто схватил.' },
  { id: 'apresado', icono: '⛓️', es: 'Apresado', ru: 'Опутанный', efEs: 'Velocidad 0. Desventaja en sus ataques y en salvaciones de DES. Ataques contra él con ventaja.', efRu: 'Скорость 0. Помеха на его атаки и спасброски ЛОВ. Атаки по нему с преимуществом.' },
  { id: 'cegado', icono: '🙈', es: 'Cegado', ru: 'Ослеплённый', efEs: 'No ve: falla pruebas que requieran vista. Desventaja en sus ataques; ataques contra él con ventaja.', efRu: 'Ничего не видит, проваливает проверки зрения. Помеха на его атаки, атаки по нему с преимуществом.' },
  { id: 'ensordecido', icono: '🙉', es: 'Ensordecido', ru: 'Оглохший', efEs: 'No oye: falla pruebas que requieran oído.', efRu: 'Ничего не слышит, проваливает проверки слуха.' },
  { id: 'asustado', icono: '😱', es: 'Asustado', ru: 'Испуганный', efEs: 'Desventaja en pruebas y ataques mientras vea la fuente del miedo. No puede acercarse a ella.', efRu: 'Помеха на проверки и атаки, пока видит источник страха. Не может к нему приближаться.' },
  { id: 'hechizado', icono: '💞', es: 'Hechizado', ru: 'Очарованный', efEs: 'No puede atacar a quien le hechizó. Ese ser tiene ventaja en pruebas sociales contra él.', efRu: 'Не может атаковать очаровавшего. Тот получает преимущество на социальные проверки против него.' },
  { id: 'envenenado', icono: '🤢', es: 'Envenenado', ru: 'Отравленный', efEs: 'Desventaja en tiradas de ataque y pruebas de característica.', efRu: 'Помеха на броски атаки и проверки характеристик.' },
  { id: 'invisible', icono: '👻', es: 'Invisible', ru: 'Невидимый', efEs: 'Ventaja en iniciativa y en sus ataques; ataques contra él con desventaja.', efRu: 'Преимущество на инициативу и свои атаки, атаки по нему с помехой.' },
  { id: 'petrificado', icono: '🗿', es: 'Petrificado', ru: 'Окаменевший', efEs: 'Convertido en piedra: incapacitado, velocidad 0, resistencia a todo daño, inmune a veneno.', efRu: 'Превращён в камень: недееспособен, скорость 0, сопротивление всему урону, иммунитет к яду.' },
  { id: 'concentrado', icono: '🎯', es: 'Concentrado', ru: 'Концентрация', efEs: 'Mantiene un conjuro de concentración. Al recibir daño, salvación de CON (CD 10 o la mitad del daño).', efRu: 'Поддерживает заклинание с концентрацией. При уроне — спасбросок ТЕЛ (Сл 10 или половина урона).' },
];
export const nombreEstado = (id: string) => { const e = ESTADOS.find((x) => x.id === id); return e ? (idioma() === 'ru' ? e.ru : e.es) : id; };
export const iconoEstado = (id: string) => ESTADOS.find((x) => x.id === id)?.icono ?? '•';

/** Fila de chips con los estados activos (y el agotamiento). Tocar abre el editor si hay set. */
export function ChipsEstados({ estados, agotamiento, set, vacio }: { estados: string[]; agotamiento: number; set?: (e: string[], agot: number) => void; vacio?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const hay = estados.length > 0 || agotamiento > 0;
  if (!hay && !set && !vacio) return null;
  return (
    <>
      <div className={`chips-estados ${set ? 'editable' : ''}`} onClick={set ? () => setAbierto(true) : undefined} role={set ? 'button' : undefined}>
        {estados.map((e) => <span key={e} className={`chip-estado e-${e}`} title={nombreEstado(e)}>{iconoEstado(e)} {nombreEstado(e)}</span>)}
        {agotamiento > 0 && <span className="chip-estado e-agotamiento">😩 {L('Agotamiento', 'Истощение')} {agotamiento}</span>}
        {!hay && set && <span className="chip-estado vacio">＋ {L('Estado', 'Состояние')}</span>}
      </div>
      {abierto && set && <ModalEstados estados={estados} agotamiento={agotamiento} onClose={() => setAbierto(false)} set={set} />}
    </>
  );
}

function ModalEstados({ estados, agotamiento, set, onClose }: { estados: string[]; agotamiento: number; set: (e: string[], agot: number) => void; onClose: () => void }) {
  const ru = idioma() === 'ru';
  const cambiar = (id: string) => set(estados.includes(id) ? estados.filter((x) => x !== id) : [...estados, id], agotamiento);
  return (
    <Modal titulo={L('Estados', 'Состояния')} onClose={onClose}>
      <ul className="lista-estados">
        {ESTADOS.map((e) => (
          <li key={e.id} className={estados.includes(e.id) ? 'activo' : ''}>
            <button type="button" onClick={() => cambiar(e.id)}>
              <span className="icono-estado">{e.icono}</span>
              <span><strong>{ru ? e.ru : e.es}</strong><small>{ru ? e.efRu : e.efEs}</small></span>
              <span className="marca">{estados.includes(e.id) ? '✓' : ''}</span>
            </button>
          </li>
        ))}
        <li className={agotamiento > 0 ? 'activo' : ''}>
          <div className="fila-agotamiento">
            <span className="icono-estado">😩</span>
            <span><strong>{L('Agotamiento', 'Истощение')}</strong><small>{L('Cada nivel: −2 a las tiradas de d20 y −5 pies de velocidad. A nivel 6, muere. Un descanso largo quita 1 nivel.', 'Каждый уровень: −2 к броскам к20 и −5 фт скорости. На 6-м уровне — смерть. Продолжительный отдых снимает 1 уровень.')}</small></span>
            <span className="contador">
              <button type="button" onClick={() => set(estados, Math.max(0, agotamiento - 1))}>−</button>
              <span>{agotamiento}</span>
              <button type="button" onClick={() => set(estados, Math.min(6, agotamiento + 1))}>+</button>
            </span>
          </div>
        </li>
      </ul>
    </Modal>
  );
}
