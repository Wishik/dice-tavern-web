import { useState } from 'react';
import { Bloq, useFicha } from './Ficha';
import { PuntoRojo, Seccion } from '../ui';
import { L } from '../i18n';
import { td } from '../datosRu';
import { buscarRaza } from '../avisos';
import { cargarObjetos, useDatos, type Arma } from '../data';
import { type Eleccion, eleccionesDe, eleccionesPendientes, elegido, faltan, fijarEleccion } from '../elecciones';
import { meterEquipoInicial } from '../equipoInicial';

/** «Por elegir»: lo que la raza, la clase o una dote mandan escoger. Lo pendiente sale con punto rojo. */
export function Elecciones() {
  const { p, razas, clases } = useFicha();
  const lista = eleccionesDe(p, clases, buscarRaza(razas, p.raza));
  if (!lista.length) return null;
  const pendientes = eleccionesPendientes(p, lista);
  const orden = [...lista.filter((e) => faltan(p, e) > 0), ...lista.filter((e) => faltan(p, e) === 0)];
  return (
    <Seccion titulo={L('Por elegir', 'Нужно выбрать')} aviso={pendientes}>
      <p className="nota pequena">{pendientes > 0
        ? L('Tu raza, tu clase o tus dotes te piden elegir esto. Lo que falta tiene un punto rojo.', 'Раса, класс или черты требуют выбрать это. Где не выбрано — красная точка.')
        : L('Todo elegido. Puedes cambiarlo con ✎.', 'Всё выбрано. Изменить можно через ✎.')}</p>
      <div className="lista-elecciones">{orden.map((e) => <FilaEleccion key={e.id} e={e} />)}</div>
    </Seccion>
  );
}

const etiqueta = (e: Eleccion, v: string) => { const op = e.opciones.find((o) => o.valor === v); return op ? L(op.es, op.ru) : td(v); };

function FilaEleccion({ e }: { e: Eleccion }) {
  const { p, upd, dotes } = useFicha();
  const armas = useDatos<Arma[]>('armas');
  const [abierta, setAbierta] = useState(false);
  const valores = elegido(p, e.id);
  const falta = faltan(p, e);
  const hecho = falta === 0;
  const fijar = (v: string[]) => upd((x) => fijarEleccion(x, e, v, (n) => dotes?.find((d) => d.nombre === n)?.descripcion ?? ''));
  const ranuras = Array.from({ length: e.cantidad }, (_, i) => p.elecciones?.[e.id]?.[i] ?? '');
  const ponerRanura = (i: number, v: string) => { const r = [...ranuras]; r[i] = v; fijar(r); };

  const elegirEquipo = async (valor: string) => {
    const op = e.opciones.find((o) => o.valor === valor);
    if (valor !== 'Ya lo tengo' && op?.nota_es) {
      const base = await cargarObjetos();
      const instrumento = elegido(p, 'Bardo:instrumentos')[0] ?? elegido(p, 'Monje:herramienta')[0];
      upd((x) => { meterEquipoInicial(x, op.nota_es!, base, instrumento); fijarEleccion(x, e, [valor]); });
    } else fijar([valor]);
  };

  let cuerpo: React.ReactNode = null;
  if (e.equipo && hecho) cuerpo = <p className="nota pequena">{valores[0] === 'Ya lo tengo' ? L('Marcado como ya puesto a mano.', 'Отмечено: уже добавлено вручную.') : L('Ya está en tu mochila y en tus monedas.', 'Уже в рюкзаке и в кошельке.')}</p>;
  else if (hecho && !abierta) cuerpo = (
    <div className="resumen-eleccion">
      <span>{valores.map((v) => etiqueta(e, v)).join(', ')}</span>
      <button className="btn enlace pequeno" onClick={() => setAbierta(true)} title={L('Cambiar', 'Изменить')}>✎</button>
    </div>
  );
  else if (e.modo === 'chips') {
    const grande = e.opciones.some((o) => o.nota_es);
    cuerpo = (
      <div className={grande ? 'opciones-grandes' : 'opciones-chips'}>
        {e.opciones.map((o) => {
          const activo = valores.includes(o.valor);
          return (
            <button key={o.valor} type="button" className={`opcion-eleccion ${activo ? 'activo' : ''}`} onClick={() => {
              if (e.equipo) { elegirEquipo(o.valor); return; }
              if (e.cantidad === 1) fijar(activo ? [] : [o.valor]);
              else if (activo) fijar(valores.filter((v) => v !== o.valor));
              else if (valores.length < e.cantidad) fijar([...valores, o.valor]);
            }}>
              <strong>{L(o.es, o.ru)}</strong>{o.nota_es && <small>{L(o.nota_es, o.nota_ru ?? o.nota_es)}</small>}
            </button>
          );
        })}
      </div>
    );
  } else if (e.modo === 'lista' || e.modo === 'armas') {
    const ops = e.modo === 'armas'
      ? (armas ?? []).filter((a) => 'dano' in a && a.maestria).map((a) => ({ valor: a.nombre, texto: `${td(a.nombre)} (${td(a.maestria)})` }))
      : e.opciones.map((o) => ({ valor: o.valor, texto: L(o.es, o.ru) }));
    cuerpo = (
      <div className="ranuras-eleccion">
        {ranuras.map((v, i) => (
          <select key={i} className="campo" value={v} onChange={(ev) => ponerRanura(i, ev.target.value)}>
            <option value="">{L('— Elige —', '— Выбери —')}</option>
            {ops.filter((o) => o.valor === v || !ranuras.includes(o.valor)).map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        ))}
      </div>
    );
  } else {
    const idLista = `sug-${e.id}`;
    cuerpo = (
      <div className="ranuras-eleccion">
        {ranuras.map((v, i) => <input key={i} className="campo" list={e.opciones.length ? idLista : undefined} value={v} placeholder={L('Escribe…', 'Впиши…')} onChange={(ev) => ponerRanura(i, ev.target.value)} />)}
        {e.opciones.length > 0 && <datalist id={idLista}>{e.opciones.map((o) => <option key={o.valor} value={o.valor}>{L(o.es, o.ru)}</option>)}</datalist>}
      </div>
    );
  }

  return (
    <div className={`eleccion ${hecho ? 'hecha' : 'pendiente'}`}>
      <div className="cab-eleccion">
        <strong>{L(e.es, e.ru)}</strong>
        <small>{e.origen}</small>
        {!hecho && <PuntoRojo n={falta} titulo={L('Falta elegir', 'Нужно выбрать')} />}
        {hecho && abierta && <button className="btn enlace pequeno" onClick={() => setAbierta(false)}>{L('Listo', 'Готово')}</button>}
      </div>
      {e.ayuda_es && (!hecho || abierta) && <p className="nota pequena">{L(e.ayuda_es, e.ayuda_ru ?? e.ayuda_es)}</p>}
      {e.equipo ? <Bloq>{cuerpo}</Bloq> : cuerpo}
    </div>
  );
}
