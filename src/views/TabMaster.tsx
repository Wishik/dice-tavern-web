import { useState } from 'react';
import { useFicha } from './Ficha';
import { calcularCA, car, conSigno, iniciativa, modificador, percepcionPasiva } from '../rules';
import { ChipsEstados, estadosPorVida } from '../estados';
import { Numero, Seccion } from '../ui';
import { Contador } from '../dice';
import { L, RU_ATRIBUTOS, T } from '../i18n';
import { ATRIBUTOS } from '../types';
import { ListaEfectosCar, NuevoEfectoCar } from '../efectosCar';

/** Lo que el máster puede tocar de la hoja de un jugador: vida, estados e iniciativa (el inventario va en su pestaña). */
export function TabMaster() {
  const { p, upd } = useFicha();
  const [cant, setCant] = useState(0);
  const danar = (n: number) => upd((x) => {
    let resto = n;
    const t = Math.min(x.pg.temp, resto); x.pg.temp -= t; resto -= t;
    x.pg.actual = Math.max(0, x.pg.actual - resto);
    x.estados = estadosPorVida(x.estados, x.pg.actual, false);
  });
  const curar = (n: number) => upd((x) => {
    const antes = x.pg.actual;
    x.pg.actual = Math.min(x.pg.max, Math.max(0, x.pg.actual) + n);
    if (antes <= 0 && x.pg.actual > 0) x.estados = estadosPorVida(x.estados, x.pg.actual, false);
  });
  return (
    <div className="tab">
      <p className="aviso-local">👑 {L('Como máster puedes cambiar la vida, los estados, la iniciativa, el inventario y poner efectos temporales en las características. El resto lo cambia el jugador.', 'Как мастер ты можешь менять хиты, состояния, инициативу, инвентарь и временно менять характеристики. Остальное меняет сам игрок.')}</p>
      <div className="fila-3-tarjetas">
        <Seccion titulo="PG (vida)" className="pg">
          <div className="pg-actual">
            <Contador valor={p.pg.actual} set={(n) => upd((x) => { x.pg.actual = Math.min(n, x.pg.max); x.estados = estadosPorVida(x.estados, x.pg.actual, false); })} min={-99} max={p.pg.max} />
            <span className="de">/ {p.pg.max}</span>
          </div>
          <div className="barra-vida"><div style={{ width: `${p.pg.max ? Math.max(0, Math.min(100, (p.pg.actual / p.pg.max) * 100)) : 0}%` }} /></div>
          <div className="fila-dano">
            <Numero valor={cant} min={0} set={setCant} ancho={70} />
            <button className="btn peligro" disabled={!cant} onClick={() => { danar(cant); setCant(0); }}>− {L('Daño', 'Урон')}</button>
            <button className="btn primario" disabled={!cant} onClick={() => { curar(cant); setCant(0); }}>+ {L('Curar', 'Лечение')}</button>
          </div>
          <p className="nota">{L('Temporales', 'Временные')}: <Numero valor={p.pg.temp} min={0} ancho={60} set={(n) => upd((x) => { x.pg.temp = n; })} /></p>
        </Seccion>
        <Seccion titulo="Estados">
          <ChipsEstados estados={p.estados} agotamiento={p.agotamiento} detalles={p.estadosDetalle} quien={p.nombre} vacio set={(e, a, d) => upd((x) => { x.estados = e; x.agotamiento = a; x.estadosDetalle = d; })} />
        </Seccion>
        <Seccion titulo="Iniciativa">
          <p className="valor-grande">{p.iniciativaActual ?? '—'}</p>
          <div className="fila-botones">
            <Numero valor={p.iniciativaActual ?? 0} set={(n) => upd((x) => { x.iniciativaActual = n; })} ancho={70} />
            <button className="btn" onClick={() => upd((x) => { x.iniciativaActual = null; })}>{L('Quitar', 'Сбросить')}</button>
          </div>
          <p className="nota">{L('Bono', 'Бонус')}: {conSigno(iniciativa(p))}</p>
        </Seccion>
      </div>
      <Seccion titulo={L('Efectos en características', 'Эффекты на характеристики')}>
        <p className="nota">{L('Sube o baja una característica de forma temporal (veneno, maldición, bendición…). El jugador lo verá con tu nota de cómo quitarlo. Se quita solo cuando tú lo quites.', 'Временно понизь или повысь характеристику (яд, проклятие, благословение…). Игрок увидит это вместе с твоей подсказкой, как снять. Снимается только тобой.')}</p>
        <ListaEfectosCar efectos={p.efectosCar} quitar={(id) => upd((x) => { x.efectosCar = (x.efectosCar ?? []).filter((e) => e.id !== id); })} />
        <NuevoEfectoCar onAnadir={(e) => upd((x) => { x.efectosCar = [...(x.efectosCar ?? []), e]; })} />
      </Seccion>
      <Seccion titulo={L('Resumen (solo lectura)', 'Сводка (только просмотр)')}>
        <div className="resumen-master">
          <span>🛡 {L('CA', 'КД')} <strong>{calcularCA(p).total}</strong></span>
          <span>👁 {L('Percepción pasiva', 'Пассивная внимательность')} <strong>{percepcionPasiva(p)}</strong></span>
          {p.pm.max > 0 && <span>🔷 {L('Maná', 'Мана')} <strong>{p.pm.actual}/{p.pm.max}</strong></span>}
          {ATRIBUTOS.map((a) => <span key={a}>{T(RU_ATRIBUTOS, a)} <strong>{car(p, a)}</strong> ({conSigno(modificador(car(p, a)))})</span>)}
        </div>
      </Seccion>
    </div>
  );
}
