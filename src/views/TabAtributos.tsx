import { Bloq, useFicha } from './Ficha';
import { ChipsEstados } from '../estados';
import { useState } from 'react';
import { Etiqueta, Modal, Numero, Seccion, Texto } from '../ui';
import { Contador, useDados } from '../dice';
import { CONJUNTO_ESTANDAR, aplicarConjuntoEstandar, avisosTirada, bonoCompetencia, calcularCA, conSigno, estadoCarga, iniciativa, modificador, percepcionPasiva, pgPorDefecto, valorPrueba } from '../rules';
import { bonoVelocidad } from '../bonos';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from '../types';
import { buscarClase } from '../avisos';
import { descansoCorto, descansoLargo, dgRecuperados, extraDadoGolpe, recursosPersonaje, resumenCorto } from '../recursos';
import { L, T, RU_CLASES, RU_NOMBRE_ATRIBUTO, idioma } from '../i18n';
import { MAX_DESCANSOS_CORTOS, recordatoriosCorto } from '../descansoCorto';
import { useDatos, type Conjuro } from '../data';

export function TabAtributos() {
  const { p, upd, clases, razas, bloqueado } = useFicha();
  const todosConjuros = useDatos<Conjuro[]>('spells');
  const [corto, setCorto] = useState(false);
  const cortosQuedan = Math.max(0, MAX_DESCANSOS_CORTOS - (p.descansosCortos ?? 0));
  const { tirarD20, tirar } = useDados();
  const carga = estadoCarga(p);
  const bc = bonoCompetencia(p.nivel);
  const clase = buscarClase(clases, p.clase);
  const dado = clase?.atributos.dadoGolpe ?? '';
  const recursos = recursosPersonaje(p, clase);
  const dgQuedan = Math.max(0, p.nivel - p.dgUsados);
  const extraDg = extraDadoGolpe(p);
  const pen = carga.penalizacion;
  const vel = bonoVelocidad(p);
  const ajusteVel = (base: number, mult: number) => {
    const d = vel * mult + pen * mult;
    return d !== 0 && <b className={d < 0 ? 'penal' : 'extra'}> ({[vel && `+${vel * mult} ${L('rasgos', 'особенности')}`, pen && `${pen * mult} ${L('carga', 'груз')}`].filter(Boolean).join(', ')}) = {Math.max(0, base + d)}</b>;
  };
  const [corregir, setCorregir] = useState(false);
  const ca = calcularCA(p);
  const pgDef = pgPorDefecto(p, dado);

  return (
    <div className="tab">
      <Seccion titulo="Estados" className="seccion-estados">
        <ChipsEstados estados={p.estados} agotamiento={p.agotamiento} detalles={p.estadosDetalle} quien={p.nombre} vacio set={(e, a, d) => upd((x) => { x.estados = e; x.agotamiento = a; x.estadosDetalle = d; })} />
      </Seccion>
      <div className="fila-3-tarjetas">
        <Seccion titulo="PG (vida)" className="pg">
          <div className="pg-actual">
            <Contador valor={p.pg.actual} set={(n) => upd((x) => { x.pg.actual = Math.min(n, x.pg.max); })} min={-99} max={p.pg.max} />
            <button className="de enlace-max" disabled={bloqueado} onClick={() => setCorregir(true)} title={L('Corregir máximo', 'Исправить максимум')}>/ {p.pg.max}</button>
          </div>
          <Etiqueta texto="Temporales"><Numero valor={p.pg.temp} min={0} set={(n) => upd((x) => { x.pg.temp = n; })} /></Etiqueta>
          {corregir && (
            <Modal titulo="Corregir PG máximos" onClose={() => setCorregir(false)}>
              <p className="nota">{L('Los PG máximos suben solos al tirar el dado de golpe al subir de nivel. Cámbialos aquí solo si hay que corregir algo.', 'Максимум хитов растёт сам, когда бросаешь кость хитов при повышении уровня. Меняй здесь, только если нужно что-то исправить.')}</p>
              <Etiqueta texto="PG máximos"><Numero valor={p.pg.max} min={1} set={(n) => upd((x) => { x.pg.max = n; x.pg.actual = Math.min(x.pg.actual, n); })} /></Etiqueta>
            </Modal>
          )}
          {!bloqueado && pgDef > 0 && p.nivel === 1 && p.pg.max !== pgDef && (
            <button className="btn enlace pequeno" onClick={() => upd((x) => { const sube = x.pg.actual === x.pg.max || x.pg.actual === 0; x.pg.max = pgDef; if (sube) x.pg.actual = pgDef; })}>↺ {L('Por defecto', 'По умолчанию')}: {pgDef}</button>
          )}
          <div className="barra-vida"><div style={{ width: `${p.pg.max ? Math.max(0, Math.min(100, (p.pg.actual / p.pg.max) * 100)) : 0}%` }} /></div>
        </Seccion>
        {p.pm.max > 0 && (
          <Seccion titulo="Maná" className="pg mana">
            <div className="pg-actual">
              <Contador valor={p.pm.actual} set={(n) => upd((x) => { x.pm.actual = Math.max(0, Math.min(n, x.pm.max)); })} min={0} max={p.pm.max} />
              <span className="de">/ {p.pm.max}</span>
            </div>
            <div className="barra-vida barra-mana"><div style={{ width: `${Math.max(0, Math.min(100, (p.pm.actual / p.pm.max) * 100))}%` }} /></div>
            <p className="nota pequena centro">{L(`Por ${p.clase} nivel ${p.nivel}. Se recupera con descanso largo.`, `${T(RU_CLASES, p.clase)}, ${p.nivel} уровень. Восстанавливается после долгого отдыха.`)}</p>
          </Seccion>
        )}
        <Seccion titulo="Inspiración">
          <div className="fila-inspiracion">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} className={`inspiracion ${p.inspiracion > i ? 'activa' : ''}`} aria-label={`${i + 1}`}
                onClick={() => upd((x) => { x.inspiracion = x.inspiracion === i + 1 ? i : i + 1; })}>✦</button>
            ))}
          </div>
          <p className="nota centro">{p.inspiracion ? L(`${p.inspiracion} de 4`, `${p.inspiracion} из 4`) : L('Sin inspiración', 'Нет вдохновения')}</p>
        </Seccion>
        <Seccion titulo="DG">
          <div className="dg">
            <button className="btn dado-pequeno" disabled={!dado || !dgQuedan} title={L('Gastar un dado de golpe y tirarlo', 'Потратить кость хитов и бросить её')}
              onClick={() => { if (!dado || !dgQuedan) return; tirar(L(`Dado de golpe (${dado})`, `Кость хитов (${dado})`), `1${dado}${extraDg ? `+${extraDg}` : ''}`); upd((x) => { x.dgUsados = Math.min(x.nivel, x.dgUsados + 1); }); }}>{dado ? `1${dado}` : 'D'}</button>
            <span>{dgQuedan} / {p.nivel}</span>
          </div>
          <div className="fila-botones pequena">
            <button className="btn" disabled={!cortosQuedan} title={cortosQuedan ? '' : L('Ya no quedan descansos cortos: haz un descanso largo.', 'Короткие отдыхи закончились: нужен долгий отдых.')}
              onClick={() => setCorto(true)}>☀️ {L('Descanso corto', 'Короткий отдых')} ({cortosQuedan}/{MAX_DESCANSOS_CORTOS})</button>
            <button className="btn" onClick={() => { if (confirm(L(`¿Descanso largo? Recuperas todos los PG y el maná, ${dgRecuperados(p.nivel)} DG, todos los recursos de clase y quitas 1 nivel de agotamiento.`, `Долгий отдых? Восстановятся все хиты и мана, ${dgRecuperados(p.nivel)} КХ, все ресурсы класса, и снимется 1 уровень истощения.`))) upd(descansoLargo); }}>🌙 {L('Descanso largo', 'Долгий отдых')}</button>
          </div>
        </Seccion>
      </div>
      {corto && (() => {
        const ru = idioma() === 'ru';
        const auto = resumenCorto(p, clase, ru);
        const extra = recordatoriosCorto(p, razas, todosConjuros, ru);
        return (
          <Modal titulo={L('Descanso corto', 'Короткий отдых')} onClose={() => setCorto(false)}
            pie={<button className="btn primario" onClick={() => { upd((x) => { descansoCorto(x, clase); }); setCorto(false); }}>☀️ {L('Descansar', 'Отдохнуть')}</button>}>
            <p className="nota">{L(`Te quedan ${cortosQuedan} de ${MAX_DESCANSOS_CORTOS} descansos cortos hasta el próximo descanso largo.`, `Осталось ${cortosQuedan} из ${MAX_DESCANSOS_CORTOS} коротких отдыхов до следующего долгого.`)}</p>
            <h4>{L('Se recupera automáticamente', 'Восстановится автоматически')}</h4>
            {auto.length ? <ul>{auto.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="nota">{L('Nada de tu clase o raza.', 'Ничего от класса или расы.')}</p>}
            <p className="nota">{L('Para curarte, toca el dado de golpe (DG).', 'Чтобы лечиться, нажимай на кость хитов (КХ).')}</p>
            {extra.length > 0 && <>
              <h4>{L('También puedes recuperar', 'Также можно восстановить')}</h4>
              <ul>{extra.map((t) => <li key={t}>{t}</li>)}</ul>
            </>}
          </Modal>
        );
      })()}

      <div className="rejilla-caracteristicas">
        {ATRIBUTOS.map((a) => {
          const m = modificador(p.caracteristicas[a]);
          return (
            <div key={a} className="caracteristica">
              <div className="car-nombre">{T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}</div>
              <Bloq><Numero valor={p.caracteristicas[a]} min={1} max={30} set={(n) => upd((x) => { x.caracteristicas[a] = n; })} className="car-valor" /></Bloq>
              <button className="car-mod" onClick={() => tirarD20(L(`Prueba de ${NOMBRE_ATRIBUTO[a]}`, `Проверка: ${T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}`), valorPrueba(p, a), avisosTirada(p, 'prueba', a))} title={L('Tirar prueba', 'Бросить проверку')}>{conSigno(m)}{valorPrueba(p, a) !== m && <small className="extra-rasgo">{conSigno(valorPrueba(p, a) - m)}</small>}</button>
            </div>
          );
        })}
      </div>
      <p className="nota centro">{L('Toca el modificador para tirar 1d20.', 'Нажми на модификатор, чтобы бросить 1d20.')}</p>
      {CONJUNTO_ESTANDAR[p.clase] && (
        <p className="nota centro"><button className="btn enlace pequeno" disabled={bloqueado} onClick={() => { if (confirm(L(`¿Poner el conjunto estándar de ${p.clase} (${CONJUNTO_ESTANDAR[p.clase].join(', ')})?`, `Поставить стандартный набор для класса ${T(RU_CLASES, p.clase)} (${CONJUNTO_ESTANDAR[p.clase].join(', ')})?`))) upd((x) => { aplicarConjuntoEstandar(x, x.clase); }); }}>↺ {L(`Conjunto estándar de ${p.clase}`, `Стандартный набор: ${T(RU_CLASES, p.clase)}`)}</button></p>
      )}

      <div className="fila-3-tarjetas">
        <Seccion titulo="Iniciativa">
          <button className="valor-grande tirable" onClick={() => tirarD20(L('Iniciativa', 'Инициатива'), iniciativa(p), avisosTirada(p, 'prueba', 'DES'), (t) => upd((x) => { x.iniciativaActual = t; }))}>{conSigno(iniciativa(p))}</button>
          {p.iniciativaActual !== null && <p className="nota centro">{L('En este combate', 'В этом бою')}: <strong>{p.iniciativaActual}</strong> <button className="btn enlace pequeno" onClick={() => upd((x) => { x.iniciativaActual = null; })}>✕</button></p>}
          <Etiqueta texto="Bonus extra"><Numero valor={p.bonusIniciativa} set={(n) => upd((x) => { x.bonusIniciativa = n; })} /></Etiqueta>
        </Seccion>
        <Seccion titulo="Competencia">
          <div className="bonif-comp">
            {[1, 5, 9, 13, 17].map((n, i) => <div key={n} className={bc === i + 2 ? 'activo' : ''}><small>{L('Nv', 'Ур')} {n}+</small><strong>+{i + 2}</strong></div>)}
          </div>
        </Seccion>
        <Seccion titulo="CA">
          <div className="valor-grande">{ca.total}</div>
          <p className="nota pequena centro">{ca.partes.join(' · ')}</p>
          <Etiqueta texto="Ajuste"><Numero valor={p.bonusCA} set={(n) => upd((x) => { x.bonusCA = n; })} /></Etiqueta>
        </Seccion>
      </div>

      <div className="fila-2-tarjetas">
        <Seccion titulo="Velocidad">
          <ul className="velocidades">
            <li><span>{L('Andando', 'Шагом')}</span><Numero valor={p.velocidad.andando} min={0} set={(n) => upd((x) => { x.velocidad.andando = n; })} ancho={64} />
              <span className="pies">{L('pies', 'фт')}{ajusteVel(p.velocidad.andando, 1)}</span></li>
            <li><span>{L('Corriendo', 'Бегом')}</span><Numero valor={p.velocidad.corriendo} min={0} set={(n) => upd((x) => { x.velocidad.corriendo = n; })} ancho={64} />
              <span className="pies">{L('pies', 'фт')}{ajusteVel(p.velocidad.corriendo, 2)}</span></li>
            <li><span>{L('Trepando', 'Лазая')}</span><Texto valor={p.velocidad.trepando} set={(s) => upd((x) => { x.velocidad.trepando = s; })} /></li>
            <li><span>{L('Nadando', 'Плавая')}</span><Texto valor={p.velocidad.nadando} set={(s) => upd((x) => { x.velocidad.nadando = s; })} /></li>
            <li><span>{L('Volando', 'Летая')}</span><Texto valor={p.velocidad.volando} set={(s) => upd((x) => { x.velocidad.volando = s; })} /></li>
          </ul>
          {pen < 0 && <p className="aviso-carga">{L('Mochila sobrecargada', 'Рюкзак перегружен')} ({carga.usados}/{carga.libres} {L('espacios', 'ячеек')}). {carga.efecto}</p>}
        </Seccion>
        <div>
          <Seccion titulo="Percepción pasiva">
            <div className="formula-pasiva">10 {conSigno(percepcionPasiva(p) - 10)} = <strong>{percepcionPasiva(p)}</strong></div>
            <Etiqueta texto="Ajuste"><Numero valor={p.bonusPercepcionPasiva} set={(n) => upd((x) => { x.bonusPercepcionPasiva = n; })} /></Etiqueta>
          </Seccion>
          <Seccion titulo="Recursos">
            {recursos.length > 0 && (
              <ul className="recursos-clase">
                {recursos.map((r) => {
                  // Para los que acumulan (estrés) se muestra lo acumulado; para el resto, lo que queda.
                  const usados = p.recursosUsados?.[r.id] ?? 0;
                  const quedan = r.acumula ? usados : Math.max(0, r.max - usados);
                  const poner = (n: number) => upd((x) => { const v = Math.max(0, Math.min(r.max, n)); x.recursosUsados = { ...(x.recursosUsados ?? {}), [r.id]: r.acumula ? v : r.max - v }; });
                  return (
                    <li key={r.id}>
                      <span>{L(r.es, r.ru)}</span>
                      <span className="contador pequeno">
                        <button type="button" onClick={() => poner(quedan - 1)} disabled={!quedan}>−</button>
                        <span>{quedan}/{r.max}</span>
                        <button type="button" onClick={() => poner(quedan + 1)} disabled={quedan >= r.max}>+</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Texto multilinea filas={4} valor={p.recursos} set={(s) => upd((x) => { x.recursos = s; })} placeholder={L('Otros recursos y notas…', 'Другие ресурсы и заметки…')} />
          </Seccion>
        </div>
      </div>
    </div>
  );
}
