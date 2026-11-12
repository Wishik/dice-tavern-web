import { clasesDe, nivelTotal, textoClases } from '../multiclase';
import { ListaEfectosCar } from '../efectosCar';
import { Bloq, useFicha } from './Ficha';
import { ChipsEstados } from '../estados';
import { useState } from 'react';
import { BotonAnadir, Etiqueta, Modal, Numero, Seccion, Texto } from '../ui';
import { Contador, useDados } from '../dice';
import { car, CONJUNTO_ESTANDAR, aplicarConjuntoEstandar, avisosTirada, bonoCompetencia, calcularCA, conSigno, desgloseCar, uid, type LineaDesglose, estadoCarga, iniciativa, modificador, percepcionPasiva, pgPorDefecto, valorPrueba } from '../rules';
import { bonoVelocidad } from '../bonos';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo, type RecursoExtra } from '../types';
import { buscarClase } from '../avisos';
import { descansoCorto, descansoLargo, dgRecuperados, extraDadoGolpe, recursosPersonaje, recuperaExtra, resumenCorto } from '../recursos';
import { L, T, RU_CLASES, RU_NOMBRE_ATRIBUTO, idioma } from '../i18n';
import { MAX_DESCANSOS_CORTOS, catalogoRecursos, recordatoriosCorto } from '../descansoCorto';
import { useDatos, type Conjuro } from '../data';
import { ModalDesglose } from './Desglose';

export function TabAtributos() {
  const { p, upd, clases, razas, bloqueado } = useFicha();
  const todosConjuros = useDatos<Conjuro[]>('spells');
  const [corto, setCorto] = useState(false);
  const [anadirRec, setAnadirRec] = useState(false);
  const [editRec, setEditRec] = useState<RecursoExtra | null>(null);
  const cortosQuedan = Math.max(0, MAX_DESCANSOS_CORTOS - (p.descansosCortos ?? 0));
  const { tirarD20, tirar } = useDados();
  const carga = estadoCarga(p);
  const bc = bonoCompetencia(nivelTotal(p));
  const clase = buscarClase(clases, p.clase);
  const dado = clase?.atributos.dadoGolpe ?? '';
  // Multiclase: un botón por cada tipo de dado de golpe de tus clases.
  const dadosDG = [...new Set(clasesDe(p).map((c) => buscarClase(clases, c.clase)?.atributos.dadoGolpe).filter(Boolean) as string[])];
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
  const [desglose, setDesglose] = useState<Atributo | 'CA' | null>(null);
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
            <p className="nota pequena centro">{L(`Por ${textoClases(p)}. Se recupera con descanso largo.`, `${textoClases(p)}. Восстанавливается после долгого отдыха.`)}</p>
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
            {(dadosDG.length ? dadosDG : [dado]).map((d) => (
              <button key={d || 'D'} className="btn dado-pequeno" disabled={!d || !dgQuedan} title={L('Gastar un dado de golpe y tirarlo', 'Потратить кость хитов и бросить её')}
                onClick={() => { if (!d || !dgQuedan) return; tirar(L(`Dado de golpe (${d})`, `Кость хитов (${d})`), `1${d}${extraDg ? `+${extraDg}` : ''}`); upd((x) => { x.dgUsados = Math.min(x.nivel, x.dgUsados + 1); }); }}>{d ? `1${d}` : 'D'}</button>
            ))}
            <span>{dgQuedan} / {p.nivel}</span>
          </div>
          <div className="fila-botones pequena">
            <button className="btn" disabled={!cortosQuedan} title={cortosQuedan ? '' : L('Ya no quedan descansos cortos: haz un descanso largo.', 'Короткие отдыхи закончились: нужен долгий отдых.')}
              onClick={() => setCorto(true)}>☀️ {L('Descanso corto', 'Короткий отдых')} ({cortosQuedan}/{MAX_DESCANSOS_CORTOS})</button>
            <button className="btn" onClick={() => {
              const notas = (p.recursosExtra ?? []).filter((r) => recuperaExtra(r) !== 'corto').map((r) => `\n• ${L(r.es, r.ru)}${r.notas ? `: ${r.notas}` : ''}`).join('');
              if (confirm(L(`¿Descanso largo? Recuperas todos los PG y el maná, ${dgRecuperados(p.nivel)} DG, todos los recursos de clase y quitas 1 nivel de agotamiento.`, `Долгий отдых? Восстановятся все хиты и мана, ${dgRecuperados(p.nivel)} КХ, все ресурсы класса, и снимется 1 уровень истощения.`) + (notas ? L('\n\nTus recursos (recupéralos a mano con +):', '\n\nТвои ресурсы (восстанавливай вручную кнопкой +):') + notas : ''))) upd(descansoLargo);
            }}>🌙 {L('Descanso largo', 'Долгий отдых')}</button>
          </div>
        </Seccion>
      </div>
      {corto && (() => {
        const ru = idioma() === 'ru';
        const auto = resumenCorto(p, clase, ru);
        const extra = recordatoriosCorto(p, razas, todosConjuros, ru);
        const notas = (p.recursosExtra ?? []).filter((r) => recuperaExtra(r) !== 'largo');
        return (
          <Modal titulo={L('Descanso corto', 'Короткий отдых')} onClose={() => setCorto(false)}
            pie={<button className="btn primario" onClick={() => { upd((x) => { descansoCorto(x, clase); }); setCorto(false); }}>☀️ {L('Descansar', 'Отдохнуть')}</button>}>
            <p className="nota">{L(`Te quedan ${cortosQuedan} de ${MAX_DESCANSOS_CORTOS} descansos cortos hasta el próximo descanso largo.`, `Осталось ${cortosQuedan} из ${MAX_DESCANSOS_CORTOS} коротких отдыхов до следующего долгого.`)}</p>
            <h4>{L('Se recupera automáticamente', 'Восстановится автоматически')}</h4>
            {auto.length ? <ul>{auto.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="nota">{L('Nada de tu clase o raza.', 'Ничего от класса или расы.')}</p>}
            <p className="nota">{L('Para curarte, toca el dado de golpe (DG).', 'Чтобы лечиться, нажимай на кость хитов (КХ).')}</p>
            {notas.length > 0 && <>
              <h4>{L('Tus recursos', 'Твои ресурсы')}</h4>
              <p className="nota">{L('No se recuperan solos: súbelos a mano con + si te toca.', 'Сами не восстанавливаются: прибавь кнопкой +, если положено.')}</p>
              <ul>{notas.map((r) => <li key={r.id}><b>{L(r.es, r.ru)}</b> ({Math.max(0, r.max - (p.recursosUsados?.[r.id] ?? 0))}/{r.max}){r.notas ? `: ${r.notas}` : ''}</li>)}</ul>
            </>}
            {extra.length > 0 && <>
              <h4>{L('También puedes recuperar', 'Также можно восстановить')}</h4>
              <ul>{extra.map((t) => <li key={t}>{t}</li>)}</ul>
            </>}
          </Modal>
        );
      })()}

      {(p.efectosCar?.length ?? 0) > 0 && (
        <Seccion titulo={L('Efectos del máster', 'Эффекты от мастера')} className="efectos-master">
          <ListaEfectosCar efectos={p.efectosCar} />
          <p className="nota pequena">{L('Ya están sumados en las tiradas. Solo el máster puede quitarlos.', 'Уже учтены в бросках. Снять их может только мастер.')}</p>
        </Seccion>
      )}
      <div className="rejilla-caracteristicas">
        {ATRIBUTOS.map((a) => {
          const ef = car(p, a);
          const m = modificador(ef);
          return (
            <div key={a} className="caracteristica">
              <div className="car-nombre">{T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}</div>
              {ef === p.caracteristicas[a]
                ? <Bloq><Numero valor={p.caracteristicas[a]} min={1} max={30} set={(n) => upd((x) => { x.caracteristicas[a] = n; })} className="car-valor" /></Bloq>
                : <button className={`campo car-valor car-cambiado ${ef < p.caracteristicas[a] ? 'debuff' : 'buff'}`} onClick={() => setDesglose(a)} title={L(`Base ${p.caracteristicas[a]}: toca para ver de dónde sale`, `База ${p.caracteristicas[a]}: нажми, чтобы посмотреть, откуда`)}>{ef}</button>}
              <button className="car-desglose" onClick={() => setDesglose(a)} title={L('De dónde sale y bonus', 'Откуда и бонусы')}>{ef !== p.caracteristicas[a] ? 'ⓘ' : '＋'}</button>
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
          <button className={`valor-grande tirable-no ${ca.lineas.some((x) => x.id) ? 'con-bonus' : ''}`} onClick={() => setDesglose('CA')} title={L('De dónde sale', 'Откуда')}>{ca.total}</button>
          <button className="btn enlace pequeno" onClick={() => setDesglose('CA')}>ⓘ {L('Ver y añadir bonus', 'Бонусы')}</button>
        </Seccion>
      </div>

      {desglose && <ModalDesglose donde={desglose} onClose={() => setDesglose(null)}
        titulo={desglose === 'CA' ? L('Clase de armadura', 'Класс доспеха') : T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[desglose])}
        calcular={(q) => desglose === 'CA' ? calcularCA(q) : { lineas: desgloseCar(q, desglose), total: car(q, desglose) }}
        base={desglose !== 'CA' && !bloqueado ? { valor: p.caracteristicas[desglose], min: 1, max: 30, aplicar: (q, n) => { q.caracteristicas = { ...q.caracteristicas, [desglose]: n }; } } : undefined}
        nota={desglose !== 'CA' ? L('Los efectos del máster solo los quita el máster.', 'Эффекты мастера снимает только мастер.') : undefined} />}

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
                      <span>{L(r.es, r.ru)}{r.extra && <button type="button" className="quitar-recurso" title={L('Modificar', 'Изменить')} onClick={() => setEditRec(p.recursosExtra?.find((e) => e.id === r.id) ?? null)}>✎</button>}{r.extra && <button type="button" className="quitar-recurso" title={L('Quitar', 'Убрать')} onClick={() => { if (confirm(L(`¿Quitar «${r.es}»?`, `Убрать «${r.ru}»?`))) upd((x) => { x.recursosExtra = (x.recursosExtra ?? []).filter((e) => e.id !== r.id); const u = { ...(x.recursosUsados ?? {}) }; delete u[r.id]; x.recursosUsados = u; }); }}>✕</button>}</span>
                      <span className="contador pequeno">
                        <button type="button" onClick={() => poner(quedan - 1)} disabled={!quedan}>−</button>
                        <span>{quedan}/{r.max}</span>
                        <button type="button" onClick={() => poner(quedan + 1)} disabled={quedan >= r.max}>+</button>
                      </span>
                      {r.notas && <small className="notas-recurso">{r.notas}</small>}
                    </li>
                  );
                })}
              </ul>
            )}
            <BotonAnadir onClick={() => setAnadirRec(true)}>{L('Añadir recurso', 'Добавить ресурс')}</BotonAnadir>
            {anadirRec && <ModalRecurso onClose={() => setAnadirRec(false)} />}
            {editRec && <ModalRecurso editar={editRec} onClose={() => setEditRec(null)} />}
            {/* El campo libre ya no se usa; solo se muestra si quedó texto de antes, para poder pasarlo a recursos. */}
            {!!p.recursos?.trim() && <Texto multilinea filas={4} valor={p.recursos} set={(s) => upd((x) => { x.recursos = s; })} placeholder={L('Otros recursos y notas…', 'Другие ресурсы и заметки…')} />}
          </Seccion>
        </div>
      </div>
    </div>
  );
}

const OPCIONES_RECUPERA = [
  ['corto', 'Descanso corto', 'Короткий отдых'],
  ['largo', 'Descanso largo', 'Долгий отдых'],
  ['ambos', 'Descanso corto y largo', 'Короткий и долгий отдых'],
] as const;

function ModalRecurso({ onClose, editar }: { onClose: () => void; editar?: RecursoExtra }) {
  const { p, upd, razas } = useFicha();
  const cat = catalogoRecursos(p, razas);
  const [form, setForm] = useState<RecursoExtra | null>(editar ? { ...editar, recupera: recuperaExtra(editar), corto: undefined } : null);
  const nuevo = (): RecursoExtra => ({ id: `propio-${Date.now()}`, es: '', ru: '', max: 1, recupera: 'largo', notas: '' });
  const guardar = () => {
    if (!form) return;
    const r: RecursoExtra = { ...form, es: form.es.trim(), ru: (form.ru || form.es).trim(), max: Math.max(1, form.max), notas: form.notas?.trim() || undefined };
    if (!editar && form.id.startsWith('propio-')) r.ru = r.es;
    upd((x) => {
      const l = x.recursosExtra ?? [];
      x.recursosExtra = l.some((e) => e.id === r.id) ? l.map((e) => (e.id === r.id ? r : e)) : [...l, r];
      if (x.recursosUsados?.[r.id] > r.max) x.recursosUsados = { ...x.recursosUsados, [r.id]: r.max };
    });
    onClose();
  };
  const fila = (r: (typeof cat)[number]) => (
    <li key={r.id}><button type="button" className="btn fila-recurso" onClick={() => setForm({ id: r.id, es: r.es, ru: r.ru, max: r.max, recupera: r.corto ? 'corto' : 'largo', notas: '' })}>
      <span>{L(r.es, r.ru)}</span><small>{r.max}</small></button></li>
  );
  if (form) {
    const propio = form.id.startsWith('propio-');
    return (
      <Modal titulo={editar ? L('Modificar recurso', 'Изменить ресурс') : L('Añadir recurso', 'Добавить ресурс')} onClose={onClose}
        pie={<>{!editar && <button type="button" className="btn" onClick={() => setForm(null)}>‹ {L('Lista', 'Список')}</button>}
          <button type="button" className="btn primario" disabled={!form.es.trim()} onClick={guardar}>{editar ? L('Guardar', 'Сохранить') : L('Añadir', 'Добавить')}</button></>}>
        <div className="form-recurso">
          <Etiqueta texto={L('Nombre', 'Название')}>
            <input className="campo" value={propio ? form.es : L(form.es, form.ru)} onChange={(e) => setForm({ ...form, es: e.target.value, ru: e.target.value })} placeholder={L('Nombre', 'Название')} />
          </Etiqueta>
          <Etiqueta texto={L('Usos', 'Использований')}><Numero valor={form.max} min={1} set={(n) => setForm({ ...form, max: n })} /></Etiqueta>
          <Etiqueta texto={L('Se recupera con (a mano)', 'Восстанавливается (вручную)')}>
            <select className="campo" value={form.recupera} onChange={(e) => setForm({ ...form, recupera: e.target.value as RecursoExtra['recupera'] })}>
              {OPCIONES_RECUPERA.map(([v, es, ru]) => <option key={v} value={v}>{L(es, ru)}</option>)}
            </select>
          </Etiqueta>
          <Etiqueta texto={L('Notas (se ven al descansar)', 'Заметки (видны при отдыхе)')}>
            <textarea className="campo" rows={3} value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder={L('Ej.: tira 1d8 por cada dado…', 'Напр.: бросай 1к8 за каждую кость…')} />
          </Etiqueta>
        </div>
      </Modal>
    );
  }
  const tuyos = cat.filter((r) => r.tuyo);
  return (
    <Modal titulo={L('Añadir recurso', 'Добавить ресурс')} onClose={onClose}>
      <BotonAnadir onClick={() => setForm(nuevo())}>{L('Recurso propio', 'Свой ресурс')}</BotonAnadir>
      {tuyos.length > 0 && <><h4>{L('De tu clase, raza y dotes', 'От твоего класса, расы и черт')}</h4><ul className="lista-recursos">{tuyos.map(fila)}</ul></>}
    </Modal>
  );
}

