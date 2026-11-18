import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFicha } from './Ficha';
import { Etiqueta, Texto, TextoLargo } from '../ui';
import { L, T, RU_CLASES, RU_RAZAS, RU_NOMBRE_ATRIBUTO } from '../i18n';
import { td } from '../datosRu';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Atributo } from '../types';
import { buscarClase, buscarRaza } from '../avisos';
import { aplicarClase, aplicarRaza, aplicarTrasfondo } from '../creacion';
import { imagenRaza, retratoRaza } from '../imagenesRazas';
import { CONJUNTO_ESTANDAR, HABILIDADES, RASGOS_RECOMENDADOS, car, conSigno, idHabilidad, modificador } from '../rules';
import { anotarOrden, limitesHabilidades } from '../limitesHabilidades';
import { Elecciones } from './Elecciones';
import { Alineamiento, Huecos, IdiomasEditor } from './TabPersonaje';
import { HUECOS_OFICIOS, HUECOS_PROFESIONES } from '../rules';
import { eleccionesDe, eleccionesPendientes } from '../elecciones';

/**
 * Asistente para crear un personaje por partes (para gente nueva). Se puede saltar en cualquier momento:
 * todo lo que se elige aquí queda en la hoja normal. El paso va guardado en `p.asistente`.
 */
const PASOS = ['bienvenida', 'raza', 'rasgos', 'clase', 'trasfondo', 'caracteristicas', 'habilidades', 'elecciones', 'idiomas', 'oficios', 'alineamiento', 'detalles', 'fin'] as const;
type Paso = (typeof PASOS)[number];
const TITULOS: Record<Paso, [string, string]> = {
  bienvenida: ['Crear tu personaje', 'Создание персонажа'], raza: ['1. Raza', '1. Раса'], rasgos: ['2. Rasgos de tu raza', '2. Особенности расы'],
  clase: ['3. Clase', '3. Класс'], trasfondo: ['4. Trasfondo', '4. Предыстория'], caracteristicas: ['5. Características', '5. Характеристики'],
  habilidades: ['6. Habilidades', '6. Навыки'], elecciones: ['7. Equipo y elecciones', '7. Снаряжение и выборы'], idiomas: ['8. Idiomas', '8. Языки'], oficios: ['9. Oficios y profesiones', '9. Ремёсла и профессии'], alineamiento: ['10. Alineamiento', '10. Мировоззрение'], detalles: ['11. Nombre y detalles', '11. Имя и детали'], fin: ['¡Listo!', 'Готово!'],
};
const nombreAtr = (a: Atributo) => T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a]);

export function Asistente() {
  const { p, upd } = useFicha();
  const i = Math.max(0, Math.min(PASOS.length - 1, p.asistente ?? 0));
  const paso = PASOS[i];
  const ir = (n: number) => { upd((x) => { x.asistente = Math.max(0, Math.min(PASOS.length - 1, n)); }); window.scrollTo({ top: 0 }); };
  const salir = () => upd((x) => { delete x.asistente; });
  const listo = usePuedeSeguir(paso);
  return (
    <div className="tab asistente">
      <div className="asistente-cabecera">
        {i > 0 && <div className="pasos-barra">{PASOS.slice(1).map((s, k) => <span key={s} className={k + 1 < i ? 'hecho' : k + 1 === i ? 'actual' : ''} />)}</div>}
        <h2>{L(...TITULOS[paso])}</h2>
        <button className="btn enlace pequeno" onClick={() => { if (paso === 'fin' || confirm(L('¿Saltar el asistente? Verás la hoja completa con todo lo que llevas elegido.', 'Пропустить помощника? Откроется полный лист со всем выбранным.'))) salir(); }}>
          {paso === 'fin' ? '' : '⏭ ' + L('Saltar el asistente', 'Пропустить помощника')}
        </button>
      </div>
      <PasoActual paso={paso} />
      <div className="asistente-pie">
        {i > 0 && <button className="btn" onClick={() => ir(i - 1)}>← {L('Atrás', 'Назад')}</button>}
        {paso === 'fin'
          ? <button className="btn primario" onClick={salir}>📜 {L('Ver mi hoja de personaje', 'Открыть лист персонажа')}</button>
          : <button className="btn primario" disabled={!listo.ok} onClick={() => ir(i + 1)}>{paso === 'bienvenida' ? L('Empezar', 'Начать') : L('Siguiente', 'Далее')} →</button>}
      </div>
      {!listo.ok && listo.falta && <p className="nota centro pequena">{listo.falta}</p>}
    </div>
  );
}

/** Si se puede pasar al siguiente paso (y qué falta). */
function usePuedeSeguir(paso: Paso): { ok: boolean; falta?: string } {
  const { p, razas } = useFicha();
  if (paso === 'raza' && !p.raza) return { ok: false, falta: L('Elige una raza para seguir.', 'Выбери расу, чтобы продолжить.') };
  if (paso === 'clase' && !p.clase) return { ok: false, falta: L('Elige una clase para seguir.', 'Выбери класс, чтобы продолжить.') };
  if (paso === 'rasgos') { const r = buscarRaza(razas, p.raza); if (r && p.rasgosRaza.length < r.rasgosAElegir) return { ok: true, falta: L(`Te faltan ${r.rasgosAElegir - p.rasgosRaza.length} rasgos (puedes elegirlos luego).`, `Осталось выбрать особенностей: ${r.rasgosAElegir - p.rasgosRaza.length}.`) }; }
  return { ok: true };
}

/** Al tocar una opción de la rejilla, baja hasta su explicación. */
function useBajar(clave: string) {
  const ref = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  useEffect(() => { if (primera.current) { primera.current = false; return; } ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [clave]);
  return ref;
}

function Ayuda({ children }: { children: ReactNode }) { return <p className="ayuda-asistente">💡 {children}</p>; }

function PasoActual({ paso }: { paso: Paso }) {
  switch (paso) {
    case 'bienvenida': return <PasoBienvenida />;
    case 'raza': return <PasoRaza />;
    case 'rasgos': return <PasoRasgos />;
    case 'clase': return <PasoClase />;
    case 'trasfondo': return <PasoTrasfondo />;
    case 'caracteristicas': return <PasoCaracteristicas />;
    case 'habilidades': return <PasoHabilidades />;
    case 'elecciones': return <PasoElecciones />;
    case 'idiomas': return <PasoIdiomas />;
    case 'oficios': return <PasoOficios />;
    case 'alineamiento': return <PasoAlineamiento />;
    case 'detalles': return <PasoDetalles />;
    case 'fin': return <PasoFin />;
  }
}

function PasoBienvenida() {
  return <>
    <p>{L('Vamos a crear tu personaje paso a paso. En cada paso eliges una cosa y te explicamos para qué sirve.', 'Создадим персонажа шаг за шагом. На каждом шаге выбираешь одно, и мы объясняем, зачем это.')}</p>
    <ol className="lista-pasos">
      <li>{L('Raza: qué ser eres (elfo, enano, humano…).', 'Раса: кто ты (эльф, дварф, человек…).')}</li>
      <li>{L('Rasgos de tu raza.', 'Особенности расы.')}</li>
      <li>{L('Clase: a qué te dedicas (guerrero, mago, pícaro…).', 'Класс: чем занимаешься (воин, маг, плут…).')}</li>
      <li>{L('Trasfondo: qué hacías antes de ser aventurero.', 'Предыстория: кем был до приключений.')}</li>
      <li>{L('Características: fuerza, destreza…', 'Характеристики: сила, ловкость…')}</li>
      <li>{L('Habilidades en las que eres bueno.', 'Навыки, в которых ты хорош.')}</li>
      <li>{L('Equipo y otras elecciones.', 'Снаряжение и прочие выборы.')}</li>
      <li>{L('Idiomas que hablas.', 'Языки, которые знаешь.')}</li>
      <li>{L('Oficios y profesiones (si tu trasfondo te los da).', 'Ремёсла и профессии (если даёт предыстория).')}</li>
      <li>{L('Alineamiento: tu forma de ser.', 'Мировоззрение: твой характер.')}</li>
      <li>{L('Nombre y detalles.', 'Имя и детали.')}</li>
    </ol>
    <Ayuda>{L('Puedes saltar el asistente cuando quieras y seguir en la hoja completa. Lo que hayas elegido se queda.', 'Помощника можно пропустить в любой момент — выбранное сохранится.')}</Ayuda>
  </>;
}

function PasoRaza() {
  const { p, upd, razas, clases } = useFicha();
  const [ver, setVer] = useState(p.raza || '');
  const r = buscarRaza(razas, ver);
  const ref = useBajar(ver);
  return <>
    <Ayuda>{L('La raza te da tamaño, velocidad, idiomas y algunos rasgos especiales. Toca una para leer cómo es.', 'Раса даёт размер, скорость, языки и особые черты. Нажми, чтобы прочитать.')}</Ayuda>
    <div className="rejilla-razas">
      {(razas?.razas ?? []).map((x) => (
        <button key={x.nombre} className={`ficha-raza ${ver === x.nombre ? 'vista' : ''} ${p.raza === x.nombre ? 'elegida' : ''}`} onClick={() => setVer(x.nombre)}>
          {retratoRaza(x.nombre) ? <img src={retratoRaza(x.nombre)} alt="" loading="lazy" /> : <span className="sin-img">?</span>}
          <span>{T(RU_RAZAS, x.nombre)}</span>
        </button>
      ))}
    </div>
    {r && <div className="detalle-asistente" ref={ref}>
      {imagenRaza(r.nombre) && <img className="imagen-raza" src={imagenRaza(r.nombre)} alt="" />}
      <h3>{T(RU_RAZAS, r.nombre)}</h3>
      <TextoLargo texto={r.descripcion} />
      <dl className="lista-datos"><dt>{L('Tamaño', 'Размер')}</dt><dd>{td(r.tamano)}</dd><dt>{L('Velocidad', 'Скорость')}</dt><dd>{td(r.velocidad)}</dd><dt>{L('Idiomas', 'Языки')}</dt><dd>{td(r.idiomas)}</dd></dl>
      {r.rasgosFijos.map((x) => <div key={x.nombre} className="rasgo"><strong>{td(x.nombre)}.</strong> {td(x.texto)}</div>)}
      <button className="btn primario ancho" disabled={p.raza === r.nombre} onClick={() => upd((x) => { aplicarRaza(x, r.nombre, razas, clases); })}>
        {p.raza === r.nombre ? `✓ ${L('Elegida', 'Выбрана')}` : L(`Elegir ${r.nombre}`, `Выбрать: ${T(RU_RAZAS, r.nombre)}`)}
      </button>
    </div>}
  </>;
}

function PasoRasgos() {
  const { p, upd, razas } = useFicha();
  const r = buscarRaza(razas, p.raza);
  const [abierto, setAbierto] = useState<string | null>(null);
  if (!r || !r.rasgosAElegir) return <p>{L('Tu raza no tiene rasgos que elegir. ¡Sigue!', 'У твоей расы нет особенностей на выбор. Дальше!')}</p>;
  const excl = razas?.rasgosGenericos.excluyentes ?? [];
  const recom = new Set(RASGOS_RECOMENDADOS[p.clase] ?? []);
  const grupos: [string, { nombre: string; texto: string }[], boolean][] = [
    [L(`Únicos de ${r.nombre}`, `Уникальные: ${T(RU_RAZAS, r.nombre)}`), r.rasgosUnicos, false],
    [L('Genéricos', 'Общие'), razas?.rasgosGenericos.noExcluyentes ?? [], false],
    [L('Genéricos excluyentes (solo uno)', 'Взаимоисключающие (только одна)'), excl, true],
  ];
  const tieneExcl = p.rasgosRaza.some((n) => excl.some((e) => e.nombre === n));
  const lleno = p.rasgosRaza.length >= r.rasgosAElegir;
  const poner = (n: string, esExcl: boolean) => upd((x) => {
    if (x.rasgosRaza.includes(n)) { x.rasgosRaza = x.rasgosRaza.filter((y) => y !== n); return; }
    if (x.rasgosRaza.length >= r.rasgosAElegir) return;
    if (esExcl && x.rasgosRaza.some((y) => excl.some((e) => e.nombre === y))) return;
    x.rasgosRaza.push(n);
  });
  return <>
    <Ayuda>{L(`Elige ${r.rasgosAElegir} rasgos. Los de tu raza (★) suelen ser los más típicos.`, `Выбери ${r.rasgosAElegir} особенности. Расовые (★) — самые типичные.`)} {p.clase && recom.size > 0 && L('👍 = recomendado para tu clase (si ya la tienes pensada).', '👍 = рекомендуется для класса.')}</Ayuda>
    <p className="contador-eleccion">{p.rasgosRaza.length} / {r.rasgosAElegir}</p>
    {grupos.map(([titulo, lista, esExcl], g) => lista.length > 0 && (
      <div key={titulo}>
        <h4>{titulo}</h4>
        <ul className="lista-opciones-asistente">
          {lista.map((x) => {
            const sel = p.rasgosRaza.includes(x.nombre);
            const bloqueada = !sel && (lleno || (esExcl && tieneExcl));
            return <li key={x.nombre} className={sel ? 'sel' : ''}>
              <button className="check-opcion" disabled={bloqueada} onClick={() => poner(x.nombre, esExcl)}>{sel ? '☑' : '☐'}</button>
              <button className="texto-opcion" onClick={() => setAbierto(abierto === x.nombre ? null : x.nombre)}>
                <strong>{g === 0 ? '★ ' : ''}{td(x.nombre)}{recom.has(x.nombre) ? ' 👍' : ''}</strong>
                {abierto === x.nombre ? <span>{td(x.texto)}</span> : <small>{td(x.texto).slice(0, 90)}{x.texto.length > 90 ? '…' : ''}</small>}
              </button>
            </li>;
          })}
        </ul>
      </div>
    ))}
  </>;
}

function PasoClase() {
  const { p, upd, clases } = useFicha();
  const [ver, setVer] = useState(p.clase || '');
  const c = buscarClase(clases, ver);
  const ref = useBajar(ver);
  return <>
    <Ayuda>{L('La clase es lo más importante: decide cómo luchas, qué magia usas y cómo subes de nivel.', 'Класс — главное: как сражаешься, какая магия и как растёшь.')}</Ayuda>
    <div className="lista-clases-asistente">
      {(clases ?? []).map((x) => (
        <button key={x.nombre} className={`opcion-clase ${ver === x.nombre ? 'vista' : ''} ${p.clase === x.nombre ? 'elegida' : ''}`} onClick={() => setVer(x.nombre)}>
          <strong>{T(RU_CLASES, x.nombre)}</strong><small>{td(x.atributos.caracteristicaPrincipal)} · {x.atributos.dadoGolpe}</small>
        </button>
      ))}
    </div>
    {c && <div className="detalle-asistente" ref={ref}>
      <h3>{T(RU_CLASES, c.nombre)}</h3>
      <TextoLargo texto={c.descripcion} />
      <dl className="lista-datos">
        <dt>{L('Característica principal', 'Основная характеристика')}</dt><dd>{td(c.atributos.caracteristicaPrincipal)}</dd>
        <dt>{L('Dado de golpe', 'Кость хитов')}</dt><dd>{c.atributos.dadoGolpe}</dd>
        <dt>{L('Salvaciones', 'Спасброски')}</dt><dd>{c.atributos.salvaciones.join(', ')}</dd>
        <dt>{L('Armaduras', 'Доспехи')}</dt><dd>{td(c.atributos.armaduras) || '—'}</dd>
        <dt>{L('Armas', 'Оружие')}</dt><dd>{td(c.atributos.armas)}</dd>
      </dl>
      <button className="btn primario ancho" disabled={p.clase === c.nombre} onClick={() => upd((x) => { aplicarClase(x, c.nombre, clases); })}>
        {p.clase === c.nombre ? `✓ ${L('Elegida', 'Выбран')}` : L(`Elegir ${c.nombre}`, `Выбрать: ${T(RU_CLASES, c.nombre)}`)}
      </button>
    </div>}
  </>;
}

function PasoTrasfondo() {
  const { p, upd, trasfondos, dotes } = useFicha();
  const t = trasfondos?.find((x) => x.nombre === p.trasfondoEstilo);
  const doteOrigen = p.dotes.find((d) => d.origen === 'origen' || t?.dotes.includes(d.nombre));
  const elegirDote = (n: string) => upd((x) => {
    x.dotes = x.dotes.filter((d) => !(d.origen === 'origen' || t?.dotes.includes(d.nombre)));
    const d = dotes?.find((y) => y.nombre === n);
    x.dotes.unshift({ nombre: n, texto: d?.descripcion ?? '', origen: 'origen' });
  });
  return <>
    <Ayuda>{L('El trasfondo es tu vida antes de la aventura. Te da dos habilidades y una dote de origen.', 'Предыстория — жизнь до приключений. Даёт два навыка и черту происхождения.')}</Ayuda>
    <ul className="lista-opciones-asistente">
      {(trasfondos ?? []).map((x) => <li key={x.nombre} className={p.trasfondoEstilo === x.nombre ? 'sel' : ''}>
        <button className="texto-opcion" onClick={() => upd((y) => { aplicarTrasfondo(y, x.nombre, trasfondos); })}>
          <strong>{p.trasfondoEstilo === x.nombre ? '✓ ' : ''}{td(x.nombre)}</strong>
          <small>{L('Habilidades', 'Навыки')}: {x.habilidades.map(td).join(', ')} · {L('Dote', 'Черта')}: {x.dotes.map(td).join(' / ')}</small>
          {p.trasfondoEstilo === x.nombre && <span>{td(x.descripcion)}</span>}
        </button>
      </li>)}
    </ul>
    {t && <div className="detalle-asistente">
      <h4>{L('Dote de origen', 'Черта происхождения')}</h4>
      <div className="chips">{t.dotes.map((n) => <button key={n} className={`chip ${doteOrigen?.nombre === n ? 'activo' : ''}`} onClick={() => elegirDote(n)}>{td(n)}</button>)}</div>
      {doteOrigen && <p className="nota">{td(dotes?.find((d) => d.nombre === doteOrigen.nombre)?.descripcion ?? '')}</p>}
    </div>}
  </>;
}

function PasoCaracteristicas() {
  const { p, upd, razas } = useFicha();
  const [cambiar, setCambiar] = useState<Atributo | null>(null);
  const r = buscarRaza(razas, p.raza);
  const est = CONJUNTO_ESTANDAR[p.clase];
  const intercambiar = (a: Atributo) => {
    if (!cambiar) { setCambiar(a); return; }
    if (cambiar !== a) upd((x) => { const v = x.caracteristicas[a]; x.caracteristicas[a] = x.caracteristicas[cambiar]; x.caracteristicas[cambiar] = v; });
    setCambiar(null);
  };
  const bono = (k: 0 | 1, a: Atributo) => upd((x) => { const b = [...(x.bonoRaza ?? [])]; b[k] = a; if (b[1 - k] === a) b[1 - k] = undefined as unknown as Atributo; x.bonoRaza = b; });
  return <>
    <Ayuda>{L('Tus seis características dicen en qué eres bueno. Te hemos puesto el reparto recomendado para tu clase; toca dos para intercambiarlas.', 'Шесть характеристик показывают, в чём ты силён. Мы поставили рекомендованный набор для класса; нажми две, чтобы поменять местами.')}</Ayuda>
    <div className="rejilla-car-asistente">
      {ATRIBUTOS.map((a) => (
        <button key={a} className={`car-asistente ${cambiar === a ? 'cambiando' : ''}`} onClick={() => intercambiar(a)}>
          <small>{nombreAtr(a)}</small>
          <strong>{car(p, a)}</strong>
          <span>{conSigno(modificador(car(p, a)))}</span>
          {car(p, a) !== p.caracteristicas[a] && <em>{L('base', 'база')} {p.caracteristicas[a]}</em>}
        </button>
      ))}
    </div>
    {cambiar && <p className="nota centro">{L(`Toca la característica con la que cambiar ${nombreAtr(cambiar)}.`, `Нажми, с чем поменять: ${nombreAtr(cambiar)}.`)}</p>}
    {est && <p className="nota centro pequena">{L('Reparto estándar', 'Стандартный набор')}: 15, 14, 13, 12, 10, 8</p>}
    {r && <div className="detalle-asistente">
      <h4>{L('Bonificador de tu raza', 'Бонус расы')}</h4>
      <p className="nota">{td(r.caracteristicas)} {L('Lo normal es subir la característica principal de tu clase.', 'Обычно повышают основную характеристику класса.')}</p>
      {([0, 1] as const).map((k) => <div key={k} className="fila-bono-raza"><span>{k === 0 ? '+2' : '+1'}</span>
        <div className="chips">{ATRIBUTOS.map((a) => <button key={a} className={`chip ${p.bonoRaza?.[k] === a ? 'activo' : ''}`} onClick={() => bono(k, a)}>{a}</button>)}</div></div>)}
    </div>}
  </>;
}

function PasoHabilidades() {
  const { p, upd, clases, trasfondos } = useFicha();
  const c = buscarClase(clases, p.clase);
  const t = trasfondos?.find((x) => x.nombre === p.trasfondoEstilo);
  const deTras = new Set((t?.habilidades ?? []).map(idHabilidad).filter(Boolean) as string[]);
  const opciones = !c || c.atributos.habilidades.includes('*') ? HABILIDADES.map((h) => h.id) : c.atributos.habilidades.map(idHabilidad).filter(Boolean) as string[];
  const n = c?.atributos.habilidadesN ?? 0;
  const elegidas = HABILIDADES.filter((h) => p.habilidades[h.id]?.comp && !deTras.has(h.id)).map((h) => h.id);
  const poner = (id: string) => upd((x) => {
    const on = !x.habilidades[id].comp;
    if (on && elegidas.length >= n) return;
    x.habilidades[id].comp = on;
    const quitaP = !on && x.habilidades[id].pericia;
    if (!on) x.habilidades[id].pericia = false;
    const o = x.ordenHabilidades ?? { comp: [], pericia: [] };
    x.ordenHabilidades = { comp: anotarOrden(o.comp, id, on), pericia: quitaP ? anotarOrden(o.pericia, id, false) : o.pericia };
  });
  const nombre = (id: string) => HABILIDADES.find((h) => h.id === id)?.nombre ?? id;
  const nPer = limitesHabilidades(p, c, trasfondos).pericia;
  const competentes = HABILIDADES.filter((h) => p.habilidades[h.id]?.comp).map((h) => h.id);
  const pericias = competentes.filter((id) => p.habilidades[id]?.pericia);
  const ponerPericia = (id: string) => upd((x) => {
    const on = !x.habilidades[id].pericia;
    if (on && pericias.length >= nPer) return;
    x.habilidades[id].pericia = on;
    const o = x.ordenHabilidades ?? { comp: [], pericia: [] };
    x.ordenHabilidades = { comp: o.comp, pericia: anotarOrden(o.pericia, id, on) };
  });
  return <>
    <Ayuda>{L('Ser competente en una habilidad suma tu bonificador de competencia (+2 a nivel 1) a esas tiradas.', 'Владение навыком добавляет бонус мастерства (+2 на 1 уровне) к этим броскам.')}</Ayuda>
    {deTras.size > 0 && <p>{L('Por tu trasfondo ya tienes', 'От предыстории уже есть')}: <strong>{[...deTras].map(nombre).join(', ')}</strong>.</p>}
    {c && <>
      <p>{L(`Tu clase te deja elegir ${n} de estas`, `Класс даёт выбрать ${n} из этих`)}: <span className="contador-eleccion">{elegidas.length} / {n}</span></p>
      <div className="chips">
        {opciones.filter((id) => !deTras.has(id)).map((id) => {
          const sel = !!p.habilidades[id]?.comp;
          return <button key={id} className={`chip ${sel ? 'activo' : ''}`} disabled={!sel && elegidas.length >= n} onClick={() => poner(id)}>{td(nombre(id))}</button>;
        })}
      </div>
    </>}
    {nPer > 0 && <>
      <h4>{L('Pericia', 'Компетентность')}</h4>
      <Ayuda>{L('Pericia: en estas habilidades sumas el doble de tu bonificador de competencia. Se elige entre las habilidades en las que ya eres competente.', 'Компетентность: к этим навыкам прибавляется двойной бонус мастерства. Выбирается из навыков, которыми уже владеешь.')}</Ayuda>
      <p>{L(`Elige ${nPer}`, `Выбери ${nPer}`)}: <span className="contador-eleccion">{pericias.length} / {nPer}</span></p>
      {competentes.length === 0
        ? <p className="nota">{L('Primero elige arriba tus habilidades.', 'Сначала выбери навыки выше.')}</p>
        : <div className="chips">
          {competentes.map((id) => {
            const sel = !!p.habilidades[id]?.pericia;
            return <button key={id} className={`chip ${sel ? 'activo' : ''}`} disabled={!sel && pericias.length >= nPer} onClick={() => ponerPericia(id)}>{td(nombre(id))}</button>;
          })}
        </div>}
    </>}
  </>;
}

function PasoElecciones() {
  const { p, razas, clases } = useFicha();
  const lista = eleccionesDe(p, clases, buscarRaza(razas, p.raza));
  if (!lista.length) return <p>{L('No hay nada más que elegir. ¡Sigue!', 'Больше выбирать нечего. Дальше!')}</p>;
  return <>
    <Ayuda>{L('Tu clase y tu raza te piden elegir algunas cosas: el equipo inicial, maestrías con armas, idiomas… Si dudas, puedes dejarlo para luego: saldrá con punto rojo en la hoja.', 'Класс и раса просят выбрать: стартовое снаряжение, мастерство оружия, языки… Можно отложить — в листе будет красная точка.')}</Ayuda>
    {eleccionesPendientes(p, lista) === 0 && <p className="nota">✓ {L('Todo elegido.', 'Всё выбрано.')}</p>}
    <Elecciones />
  </>;
}

function PasoIdiomas() {
  return <>
    <Ayuda>{L('Estos son los idiomas que hablas. Los de tu raza ya vienen puestos, pero puedes cambiarlos si tu personaje se crió en otro sitio. Más adelante, jugando, podrás aprender otros según tu Inteligencia.', 'Это языки, которые ты знаешь. Расовые уже стоят, но их можно поменять. Позже в игре можно выучить другие — по Интеллекту.')}</Ayuda>
    <div className="detalle-asistente"><IdiomasEditor soloCreacion /></div>
  </>;
}

function PasoOficios() {
  const { p, upd } = useFicha();
  return <>
    <Ayuda>{L('Solo si tu trasfondo te da un oficio (herrero, cocinero…) o una profesión (escriba, comerciante…). No es obligatorio: si no te da ninguno, déjalo vacío y sigue. Los demás se aprenden jugando.', 'Только если предыстория даёт ремесло (кузнец, повар…) или профессию (писарь, торговец…). Не обязательно: если нет — оставь пустым. Остальные учатся в игре.')}</Ayuda>
    <div className="detalle-asistente">
      <h4>{L('Oficio', 'Ремесло')}</h4>
      <Huecos huecos={HUECOS_OFICIOS.filter((h) => !('aprendido' in h))} valores={p.oficios} set={(k, v) => upd((x) => { x.oficios[k] = v; })} p={p} />
      <h4>{L('Profesión', 'Профессия')}</h4>
      <Huecos huecos={HUECOS_PROFESIONES.filter((h) => !('aprendido' in h))} valores={p.profesiones} set={(k, v) => upd((x) => { x.profesiones[k] = v; })} p={p} />
    </div>
  </>;
}

function PasoAlineamiento() {
  const { p, upd } = useFicha();
  return <>
    <Ayuda>{L('El alineamiento resume cómo es tu personaje. De izquierda a derecha: si respeta las normas (legal) o va a su aire (caótico). De arriba abajo: si es bueno, neutral o malvado. Toca la casilla que mejor le pegue.', 'Мировоззрение описывает характер. Слева направо: чтит законы (законный) или живёт как хочет (хаотичный). Сверху вниз: добрый, нейтральный или злой. Нажми подходящую клетку.')}</Ayuda>
    <div className="detalle-asistente"><Alineamiento p={p} set={(a) => upd((x) => { x.alineamiento = a; })} /></div>
  </>;
}

function PasoDetalles() {
  const { p, upd } = useFicha();
  return <>
    <Ayuda>{L('Ponle nombre a tu personaje. Lo demás es opcional y puedes cambiarlo cuando quieras.', 'Дай персонажу имя. Остальное — по желанию.')}</Ayuda>
    <div className="detalle-asistente detalles-asistente">
      {p.foto && <img className="retrato-asistente" src={p.foto} alt="" />}
      <Etiqueta texto="Nombre"><Texto valor={p.nombre === L('Nuevo personaje', 'Новый персонаж') ? '' : p.nombre} placeholder={L('Nombre de tu personaje', 'Имя персонажа')} set={(s) => upd((x) => { x.nombre = s; })} /></Etiqueta>
      <Etiqueta texto="Edad"><Texto valor={p.edad} set={(s) => upd((x) => { x.edad = s; })} /></Etiqueta>
      <Etiqueta texto="Rasgos de personalidad"><Texto multilinea valor={p.personalidad} placeholder={L('¿Cómo es? ¿Qué le importa?', 'Какой он? Что для него важно?')} set={(s) => upd((x) => { x.personalidad = s; })} /></Etiqueta>
    </div>
    <p className="nota pequena">{L('La foto: se ha puesto el retrato de tu raza. Puedes subir la tuya en la hoja, pestaña Personaje.', 'Фото: поставлен портрет расы. Своё можно загрузить во вкладке «Персонаж».')}</p>
  </>;
}

function PasoFin() {
  const { p, avisos } = useFicha();
  const faltan = avisos.total.general + avisos.total.habilidades + avisos.total.magia + avisos.total.rasgos;
  return <>
    <p>{L(`¡${p.nombre || 'Tu personaje'} está listo para jugar!`, `${p.nombre || 'Персонаж'} готов к игре!`)}</p>
    <dl className="lista-datos">
      <dt>{L('Raza', 'Раса')}</dt><dd>{T(RU_RAZAS, p.raza)}</dd>
      <dt>{L('Clase', 'Класс')}</dt><dd>{T(RU_CLASES, p.clase)}</dd>
      <dt>{L('Trasfondo', 'Предыстория')}</dt><dd>{td(p.trasfondoEstilo) || '—'}</dd>
      <dt>PG</dt><dd>{p.pg.max}</dd>
    </dl>
    {faltan > 0
      ? <Ayuda>{L(`Aún quedan ${faltan} cosas por completar (salen con punto rojo en las pestañas): conjuros, idiomas… Puedes hacerlo con calma en la hoja.`, `Осталось заполнить ещё ${faltan} (красные точки на вкладках): заклинания, языки… Можно спокойно доделать в листе.`)}</Ayuda>
      : <p className="nota">✓ {L('No falta nada.', 'Ничего не осталось.')}</p>}
  </>;
}
