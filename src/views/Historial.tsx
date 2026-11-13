import { useEffect, useState } from 'react';
import { tiradasPartida, type TiradaPartida } from '../tiradasPartida';
import type { TiradaMaster } from '../partidas';
import { L } from '../i18n';

/** Lo que no es de combate, salvación ni habilidad (tiradas antiguas, de antes de filtrar al tirar). */
const NO_HISTORIAL = /^(Prueba de|Проверка|Dado de golpe|Кость хитов|PG al subir|Хиты за уровень|\d+d\d+)/i;

/** Historial de tiradas de un combate (solo lo ve el máster): las de sus jugadores y las del máster en ese combate, desde `desde`. */
export function HistorialTiradas({ partida, pjs, master, desde }: { partida: string; pjs: string[]; master: TiradaMaster[]; desde?: string }) {
  const [l, setL] = useState<TiradaPartida[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') tiradasPartida(partida).then((x) => { setL(x); setError(''); }).catch((e) => setError(e.message)); };
    f(); const t = setInterval(f, 4000);
    return () => clearInterval(t);
  }, [partida]);
  const hora = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const despues = (s: string) => !desde || s > desde;
  const todas = l && [
    ...l.filter((t) => !NO_HISTORIAL.test(t.etiqueta) && t.personaje && pjs.includes(t.personaje) && despues(t.creada)).map((t) => ({ ...t, id: String(t.id), master: false })),
    ...master.filter((t) => despues(t.creada)).map((t) => ({ ...t, master: true })),
  ].sort((a, b) => b.creada.localeCompare(a.creada)).slice(0, 100);
  return (
    <section className="tarjeta historial-partida">
      <h3>{L('Historial de tiradas', 'История бросков')}</h3>
      {error && <p className="error">{error}</p>}
      {!todas ? <p className="nota">{L('Cargando…', 'Загрузка…')}</p> : todas.length === 0
        ? <p className="nota">{L('Aún no hay tiradas en este combate. Aquí salen los ataques, el daño, las salvaciones y las habilidades de sus jugadores, y lo que tires por los enemigos.', 'В этом бою бросков пока нет. Здесь будут атаки, урон, спасброски и навыки его игроков, а также твои броски за врагов.')}</p>
        : <ul className="historial">{todas.map((t) => (
          <li key={(t.master ? 'm' : 'j') + t.id} className={`${t.critico ? `critico-${t.critico}` : ''} ${t.master ? 'de-master' : ''}`}>
            <small className="hora">{hora(t.creada)}</small>
            <span className="ht-texto"><b>{t.master ? '👑' : (t.quien || '?')}</b> · {t.etiqueta}{t.modo !== 'normal' && <small> ({t.modo === 'ventaja' ? L('ventaja', 'преимущество') : L('desventaja', 'помеха')})</small>}
              <small className="ht-detalle">{t.formula}: {t.detalle}</small></span>
            <strong>{t.total}</strong>
          </li>))}</ul>}
    </section>
  );
}
