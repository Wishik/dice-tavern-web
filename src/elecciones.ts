import type { Clase, Raza } from './data';
import type { Personaje } from './types';
import { ATRIBUTOS } from './types';
import { L, T, RU_ATRIBUTOS, RU_CLASES } from './i18n';
import { clasesDe } from './multiclase';
import { RASGOS_FIJOS } from './fijos';

/**
 * Cosas que la raza, la clase o una dote mandan ELEGIR (instrumentos, Orden divina, maestría con armas, equipo
 * inicial…). Lo elegido se guarda en `p.elecciones[id]`; lo que falte sale con punto rojo en «Personaje».
 */
export interface Opcion { valor: string; es: string; ru: string; nota_es?: string; nota_ru?: string; /** Descripción larga (qué hace). */ desc?: string }
export interface Eleccion {
  id: string;
  es: string; ru: string;
  /** De dónde viene (para mostrarlo): «Bardo», «Raza», «Músico»… */
  origen: string;
  cantidad: number;
  /** chips = botones (hasta `cantidad`), lista = desplegables, texto = escribir (con sugerencias), armas = desplegables de armas. */
  modo: 'chips' | 'lista' | 'texto' | 'armas';
  opciones: Opcion[];
  ayuda_es?: string; ayuda_ru?: string;
  /** Va a la lista de dotes (Estilo de combate). */
  dote?: boolean;
  /** Equipo inicial: al elegir se mete en el inventario (una vez). */
  equipo?: boolean;
  /** Idiomas: además salen en la sección «Idiomas». */
  idioma?: boolean;
}

const o = (es: string, ru = es, nota_es?: string, nota_ru?: string): Opcion => ({ valor: es, es, ru, nota_es, nota_ru });

export const INSTRUMENTOS: Opcion[] = [
  o('Chirimía', 'Шалмей'), o('Cuerno', 'Рожок'), o('Dulcémele', 'Цимбалы'), o('Flauta', 'Флейта'), o('Flauta de pan', 'Флейта Пана'),
  o('Gaita', 'Волынка'), o('Laúd', 'Лютня'), o('Lira', 'Лира'), o('Tambor', 'Барабан'), o('Viola', 'Виола'),
];
export const ARTESANO: Opcion[] = [
  o('Herramientas de albañil', 'Инструменты каменщика'), o('Herramientas de alfarero', 'Инструменты гончара'), o('Herramientas de carpintero', 'Инструменты плотника'),
  o('Herramientas de cartógrafo', 'Инструменты картографа'), o('Herramientas de curtidor', 'Инструменты кожевника'), o('Herramientas de ebanista', 'Инструменты резчика по дереву'),
  o('Herramientas de herrero', 'Инструменты кузнеца'), o('Herramientas de joyero', 'Инструменты ювелира'), o('Herramientas de manitas', 'Инструменты ремесленника'),
  o('Herramientas de soplador de vidrio', 'Инструменты стеклодува'), o('Herramientas de tejedor', 'Инструменты ткача'), o('Herramientas de zapatero', 'Инструменты сапожника'),
  o('Suministros de alquimista', 'Припасы алхимика'), o('Suministros de calígrafo', 'Припасы каллиграфа'), o('Suministros de cervecero', 'Припасы пивовара'),
  o('Suministros de pintor', 'Припасы художника'), o('Útiles de cocinero', 'Инструменты повара'),
];
/** Invocaciones sobrenaturales (clases.json, «Opciones de invocación sobrenatural»): [nombre, nivel de brujo mínimo, requisito]. */
const INVOCACIONES: [string, number, string][] = [["Armadura de sombras", 1, ""], ["Castigo arcano", 5, "Pacto del filo"], ["Descarga agónica", 2, "truco de brujo que inflija daño"], ["Descarga ahuyentadora", 2, "truco de brujo que inflija daño"], ["Devorador de vida", 9, "Pacto del filo"], ["Don de las profundidades", 5, ""], ["Don de los protectores", 9, "Pacto del grimorio"], ["Filo sediento", 5, "Pacto del filo"], ["Hoja devoradora", 12, "Filo sediento"], ["Inversión del amo de las cadenas", 5, "Pacto de la cadena"], ["Lanza sobrenatural", 2, "truco de brujo que inflija daño"], ["Lecciones de los primeros", 2, ""], ["Maestro de las formas innumerables", 5, ""], ["Mascara de los mil rostros", 2, ""], ["Mente sobrenatural", 1, ""], ["Mirada de la dos mentes", 5, ""], ["Pacto de la cadena", 1, ""], ["Pacto del filo", 1, ""], ["Pacto del grimorio", 1, ""], ["Paso ascendente", 5, ""], ["Salto sobrenatural", 2, ""], ["Susurros del sepulcro", 7, ""], ["Uno con la sombra", 5, ""], ["Vigor infernal", 2, ""], ["Visión bruja", 15, ""], ["Visiones brumosas", 2, ""], ["Visiones de reinos remotos", 9, ""], ["Vista del diablo", 2, ""]];
/** Busca en los rasgos de la clase el apartado «Opciones de …» y lo trocea por nombres (cada opción empieza en una línea). */
function bloqueOpciones(datos: Clase | null | undefined, cabecera: string, fin: string): string {
  const t = datos?.rasgos.map((r) => r.texto).find((x) => x.includes(cabecera) && x.includes(fin)) ?? '';
  const i = t.indexOf(cabecera);
  return i < 0 ? '' : t.slice(i, t.indexOf(fin, i));
}
export function trocearOpciones(bloque: string, nombres: string[]): Record<string, string> {
  const pos = nombres.map((n) => ({ n, i: bloque.search(new RegExp(`(^|\\n)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `)) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  const out: Record<string, string> = {};
  pos.forEach((x, k) => { out[x.n] = bloque.slice(x.i, k + 1 < pos.length ? pos[k + 1].i : undefined).trim().slice(x.n.length).replace(/^\s*/, '').trim(); });
  return out;
}
/** Metamagia (clases.json, «Opciones de metamagia»). El segundo «Conjuro intensificado» del manual es el potenciado. */
function metamagia(datos: Clase | null | undefined): Opcion[] {
  const b = bloqueOpciones(datos, 'Opciones de metamagia Las siguientes', 'Lista de conjuros de hechicero');
  const out: Opcion[] = [];
  const lineas = b.split('\n').slice(1);
  let actual: Opcion | null = null;
  for (const l of lineas) {
    const m = l.match(/^(Conjuro \S+) (Coste: .*)$/);
    if (m) {
      const nombre = out.some((x) => x.valor === m[1]) ? 'Conjuro potenciado' : m[1];
      const coste = m[2].match(/Coste: ([^.]*)\./)?.[1] ?? '';
      actual = { valor: nombre, es: nombre, ru: nombre, nota_es: coste, nota_ru: coste, desc: m[2].replace(/^Coste: [^.]*\.\s*(Descripción:\s*)?/, '') };
      out.push(actual);
    } else if (actual && l.trim()) actual.desc += ' ' + l.trim();
  }
  return out;
}
/** Propiedades de maestría de las armas (resumen de las reglas de 2024). */
export const MAESTRIAS: Record<string, [string, string]> = {
  'Debilitar': ['Si aciertas, el objetivo tiene desventaja en su siguiente tirada de ataque antes del inicio de tu próximo turno.', 'При попадании цель совершает следующий бросок атаки с помехой до начала твоего следующего хода.'],
  'Derribar': ['Si aciertas, el objetivo hace una TS de Constitución (CD 8 + modificador de ataque + competencia) o queda derribado.', 'При попадании цель делает спасбросок Телосложения (Сл 8 + модификатор атаки + мастерство) или падает ничком.'],
  'Empujar': ['Si aciertas, puedes empujar al objetivo hasta 10 pies en línea recta si es Grande o más pequeño.', 'При попадании можешь оттолкнуть цель (Большую или меньше) на 10 футов по прямой.'],
  'Hender': ['Si aciertas cuerpo a cuerpo, puedes atacar a otra criatura a 5 pies del objetivo (una vez por turno); no sumas el modificador al daño salvo que sea negativo.', 'При попадании в ближнем бою можешь атаковать другое существо в 5 футах от цели (раз в ход); модификатор к урону не добавляется, если он не отрицательный.'],
  'Mellar': ['El ataque extra de luchar con dos armas ligeras forma parte de la acción de Atacar, no de la acción adicional (una vez por turno).', 'Дополнительная атака вторым лёгким оружием входит в действие Атака, а не в бонусное действие (раз в ход).'],
  'Molestar': ['Si aciertas y haces daño, tienes ventaja en tu siguiente ataque contra esa criatura antes del final de tu próximo turno.', 'При попадании с уроном следующая твоя атака по этому существу до конца следующего хода — с преимуществом.'],
  'Ralentizar': ['Si aciertas y haces daño, la velocidad del objetivo baja 10 pies hasta el inicio de tu próximo turno.', 'При попадании с уроном скорость цели уменьшается на 10 футов до начала твоего следующего хода.'],
  'Rozar': ['Si fallas, el objetivo recibe igualmente daño igual al modificador de característica del ataque (del mismo tipo).', 'При промахе цель всё равно получает урон, равный модификатору характеристики атаки (того же типа).'],
};
export const textoMaestria = (m: string) => m.split(/\s+o\s+/).filter((x) => MAESTRIAS[x]).map((x) => `${x}: ${L(...MAESTRIAS[x])}`).join(' ');
const LINAJES: Opcion[] = [
  ['Rojo', 'Красный', 'Fuego · TS de Destreza', 'Огонь · спасбросок Ловкости'], ['Oro', 'Золотой', 'Fuego · TS de Destreza', 'Огонь · спасбросок Ловкости'],
  ['Oropel', 'Латунный', 'Fuego · TS de Destreza', 'Огонь · спасбросок Ловкости'], ['Blanco', 'Белый', 'Frío · TS de Constitución', 'Холод · спасбросок Телосложения'],
  ['Plata', 'Серебряный', 'Frío · TS de Constitución', 'Холод · спасбросок Телосложения'], ['Azul', 'Синий', 'Eléctrico · TS de Destreza', 'Электричество · спасбросок Ловкости'],
  ['Bronce', 'Бронзовый', 'Eléctrico · TS de Destreza', 'Электричество · спасбросок Ловкости'], ['Cobre', 'Медный', 'Ácido · TS de Destreza', 'Кислота · спасбросок Ловкости'],
  ['Negro', 'Чёрный', 'Ácido · TS de Destreza', 'Кислота · спасбросок Ловкости'], ['Verde', 'Зелёный', 'Veneno · TS de Constitución', 'Яд · спасбросок Телосложения'],
].map(([es, ru, ne, nr]) => o(es, ru, ne, nr));

/** Dotes de estilo de combate (dotes.json, categoría «estilo de combate»). */
export const ESTILOS = ['Combate con armas a dos manos', 'Combate con armas arrojadizas', 'Combate con dos armas', 'Combate sin armas', 'Defensa', 'Duelo', 'Intercepción', 'Lucha a ciegas', 'Protección', 'Tiro con arco'];

const columna = (c: Clase | null | undefined, nivel: number, col: string) => {
  const v = parseInt(String(c?.tabla.find((f) => f.nivel === nivel)?.[col] ?? ''), 10);
  return isNaN(v) ? 0 : v;
};

/** Opciones del equipo inicial: «A: …. B: 225po.» (Guerrero: A + B, A + C o D). */
export function opcionesEquipo(texto: string): Opcion[] {
  const partes: Record<string, string> = {};
  for (const m of texto.matchAll(/(?:^|\s)([A-D]):\s*(.*?)(?=\s+[A-D]:\s|\s*\(Elige|$)/g)) partes[m[1]] = m[2].trim().replace(/\.$/, '');
  const combos = /A \+ B/.test(texto) ? [['A', 'B'], ['A', 'C'], ['D']] : Object.keys(partes).map((k) => [k]);
  const out: Opcion[] = combos.filter((c) => c.every((k) => partes[k])).map((c) => {
    const nombre = c.join(' + ');
    const desc = c.map((k) => partes[k]).join('. ');
    return { valor: nombre, es: `Opción ${nombre}`, ru: `Вариант ${nombre}`, nota_es: desc, nota_ru: desc };
  });
  out.push(o('Ya lo tengo', 'Уже есть', 'No añade nada al inventario.', 'Ничего не добавляет в инвентарь.'));
  return out;
}

const rasgosDeRaza = (p: Personaje) => new Set([...(RASGOS_FIJOS[p.raza] ?? []), ...(p.rasgosRaza ?? [])]);

/** Todas las elecciones que tocan ahora a este personaje (por raza, clases, nivel y dotes). */
export function eleccionesDe(p: Personaje, clases: Clase[] | null, raza: Raza | null): Eleccion[] {
  const out: Eleccion[] = [];
  const todas = clasesDe(p);
  todas.forEach((c, i) => {
    const datos = clases?.find((x) => x.nombre === c.clase);
    const principal = i === 0;
    const org = T(RU_CLASES, c.clase);
    const id = (s: string) => `${c.clase}:${s}`;
    if (c.clase === 'Bardo') out.push({ id: id('instrumentos'), es: principal ? 'Tres instrumentos musicales' : 'Un instrumento musical', ru: principal ? 'Три музыкальных инструмента' : 'Один музыкальный инструмент', origen: org, cantidad: principal ? 3 : 1, modo: 'chips', opciones: INSTRUMENTOS, ayuda_es: 'Eres competente con ellos.', ayuda_ru: 'Ты владеешь ими.' });
    if (c.clase === 'Monje' && principal) out.push({ id: id('herramienta'), es: 'Herramientas de artesano o instrumento musical', ru: 'Инструменты ремесленника или музыкальный инструмент', origen: org, cantidad: 1, modo: 'lista', opciones: [...ARTESANO, ...INSTRUMENTOS] });
    if (c.clase === 'Clérigo') out.push({ id: id('orden'), es: 'Orden divina', ru: 'Божественный орден', origen: org, cantidad: 1, modo: 'chips', opciones: [
      o('Protector', 'Защитник', 'Competencia con armas marciales y armaduras pesadas.', 'Владение воинским оружием и тяжёлыми доспехами.'),
      o('Taumaturgo', 'Чудотворец', '+1 truco de clérigo y +Mod. SAB a Conocimiento arcano y Religión.', '+1 заговор жреца и +мод. МДР к Магии и Религии.')] });
    if (c.clase === 'Druida') out.push({ id: id('orden'), es: 'Orden primigenia', ru: 'Первородный орден', origen: org, cantidad: 1, modo: 'chips', opciones: [
      o('Guardián', 'Страж', 'Competencia con armas marciales y armaduras medias.', 'Владение воинским оружием и средними доспехами.'),
      o('Mago', 'Маг', '+1 truco de druida y +Mod. SAB a Conocimiento arcano y Naturaleza.', '+1 заговор друида и +мод. МДР к Магии и Природе.')] });
    const maestria = c.clase === 'Bárbaro' || c.clase === 'Guerrero' ? columna(datos, c.nivel, 'Maestría con armas') || (c.clase === 'Guerrero' ? 3 : 2)
      : ['Paladín', 'Explorador', 'Pícaro'].includes(c.clase) ? 2 : 0;
    if (maestria) out.push({ id: id('maestria'), es: `Maestría con armas (${maestria} tipos)`, ru: `Мастерство оружия (${maestria} вида)`, origen: org, cantidad: maestria, modo: 'armas', opciones: [], ayuda_es: 'Puedes usar la propiedad de maestría de esas armas. Tras un descanso largo puedes cambiar una.', ayuda_ru: 'Ты можешь использовать свойство мастерства этого оружия. После долгого отдыха можно поменять одно.' });
    const nivelEstilo = c.clase === 'Guerrero' ? 1 : c.clase === 'Paladín' || c.clase === 'Explorador' ? 2 : 0;
    if (nivelEstilo && c.nivel >= nivelEstilo) out.push({ id: id('estilo'), es: 'Estilo de combate', ru: 'Боевой стиль', origen: org, cantidad: 1, modo: 'lista', dote: true, opciones: [
      ...ESTILOS.map((n) => o(n)),
      ...(c.clase === 'Paladín' ? [o('Guerrero bendito (2 trucos de clérigo)', 'Благословенный воин (2 заговора жреца)')] : c.clase === 'Explorador' ? [o('2 trucos de druida', '2 заговора друида')] : [])],
      ayuda_es: 'Se añade a tus dotes.', ayuda_ru: 'Добавится к твоим чертам.' });
    if (c.clase === 'Brujo') {
      const n = columna(datos, c.nivel, 'Invocaciones sobrenaturales') || 1;
      const textos = trocearOpciones(bloqueOpciones(datos, 'Opciones de invocación sobrenatural Las', 'Lista de conjuros de brujo'), INVOCACIONES.map((x) => x[0]));
      const ops = INVOCACIONES.filter(([, nv]) => nv <= c.nivel).map(([nombre, nv, req]) => {
        const r = [nv > 1 ? `nivel ${nv}+` : '', req].filter(Boolean).join(', ');
        const rr = [nv > 1 ? `${nv}+ ур.` : '', req].filter(Boolean).join(', ');
        return { ...o(nombre, nombre, r ? `requisito: ${r}` : undefined, rr ? `требование: ${rr}` : undefined), desc: (textos[nombre] ?? '').replace(/^Requisitos: [^.]*\.\s*Efecto:\s*/, '') };
      });
      out.push({ id: id('invocaciones'), es: `Invocaciones sobrenaturales (${n})`, ru: `Таинственные воззвания (${n})`, origen: org, cantidad: n, modo: 'lista', opciones: ops, ayuda_es: 'Solo salen las de tu nivel de brujo. Mira el requisito entre paréntesis.', ayuda_ru: 'Показаны только доступные на твоём уровне колдуна. Требование — в скобках.' });
    }
    if (c.clase === 'Hechicero' && c.nivel >= 2) { const n = c.nivel >= 17 ? 6 : c.nivel >= 10 ? 4 : 2; out.push({ id: id('metamagia'), es: `Metamagia (${n})`, ru: `Метамагия (${n})`, origen: org, cantidad: n, modo: 'lista', opciones: metamagia(datos) }); }
    if (c.clase === 'Explorador' && c.nivel >= 2) out.push({ id: id('idiomas'), es: 'Explorador hábil: dos idiomas', ru: 'Ловкий следопыт: два языка', origen: org, cantidad: 2, modo: 'lista', idioma: true, opciones: [] });
    if (principal && datos?.atributos.equipo) out.push({ id: id('equipo'), es: 'Equipo inicial', ru: 'Стартовое снаряжение', origen: org, cantidad: 1, modo: 'chips', equipo: true, opciones: opcionesEquipo(datos.atributos.equipo), ayuda_es: 'Al elegir se mete en el inventario y en las monedas.', ayuda_ru: 'После выбора всё попадёт в инвентарь и кошелёк.' });
  });

  // Raza
  const rr = rasgosDeRaza(p);
  const orgR = L('Raza', 'Раса');
  if (rr.has('Resiliencia')) out.push({ id: 'raza:resiliencia', es: 'Resiliencia: una tirada de salvación', ru: 'Стойкость: один спасбросок', origen: orgR, cantidad: 1, modo: 'chips', opciones: ATRIBUTOS.map((a) => ({ valor: a, es: T(RU_ATRIBUTOS, a), ru: T(RU_ATRIBUTOS, a) })), ayuda_es: 'Ganas competencia en esa TS.', ayuda_ru: 'Получаешь владение этим спасброском.' });
  if (p.raza === 'Norn') out.push({ id: 'raza:espiritu', es: 'Espíritu animal', ru: 'Дух-зверь', origen: orgR, cantidad: 1, modo: 'chips', opciones: [o('Oso', 'Медведь', 'En forma híbrida: +1 FUE y CON; ventaja en Atletismo y TS de Fuerza.', 'В гибридном облике: +1 СИЛ и ТЕЛ; преимущество на Атлетику и спасброски Силы.'), o('Lobo', 'Волк', 'En forma híbrida: +1 DES y CON; ventaja en Percepción por olfato y TS de Destreza.', 'В гибридном облике: +1 ЛОВ и ТЕЛ; преимущество на Восприятие по запаху и спасброски Ловкости.'), o('Cuervo', 'Ворон', 'En forma híbrida: +1 INT y SAB; ventaja en Percepción por vista y TS de Sabiduría.', 'В гибридном облике: +1 ИНТ и МДР; преимущество на Восприятие зрением и спасброски Мудрости.')], ayuda_es: 'Permanente: decide tu forma híbrida.', ayuda_ru: 'Навсегда: определяет гибридный облик.' });
  if (p.raza === 'Dracónido') out.push({ id: 'raza:linaje', es: 'Linaje dracónido', ru: 'Драконье происхождение', origen: orgR, cantidad: 1, modo: 'chips', opciones: LINAJES, ayuda_es: 'Tipo de resistencia, de aliento y de TS. No se puede cambiar.', ayuda_ru: 'Тип сопротивления, дыхания и спасброска. Менять нельзя.' });
  if (raza && /elecci[oó]n/i.test(raza.idiomas)) out.push({ id: 'raza:idioma', es: 'Idioma a tu elección', ru: 'Язык на выбор', origen: orgR, cantidad: 1, modo: 'lista', idioma: true, opciones: [] });

  // Dotes
  const dotes = new Set(p.dotes.map((d) => d.nombre));
  if (dotes.has('Músico')) out.push({ id: 'dote:musico', es: 'Tres instrumentos musicales', ru: 'Три музыкальных инструмента', origen: 'Músico', cantidad: 3, modo: 'chips', opciones: INSTRUMENTOS });
  if (dotes.has('Fabricante')) out.push({ id: 'dote:fabricante', es: 'Tres herramientas de artesano', ru: 'Три набора инструментов ремесленника', origen: 'Fabricante', cantidad: 3, modo: 'lista', opciones: ARTESANO });
  return out;
}

export const elegido = (p: Personaje, id: string) => (p.elecciones?.[id] ?? []).filter((s) => s.trim());
/** Cuántas cosas faltan por elegir. */
export const faltan = (p: Personaje, e: Eleccion) => Math.max(0, e.cantidad - elegido(p, e.id).length);
export const eleccionesPendientes = (p: Personaje, lista: Eleccion[]) => lista.reduce((s, e) => s + faltan(p, e), 0);

/** Cambia lo elegido y aplica sus efectos (salvación de Resiliencia, dote de estilo de combate). */
export function fijarEleccion(p: Personaje, e: Eleccion, valores: string[], descripcionDote?: (n: string) => string) {
  const antes = p.elecciones?.[e.id] ?? [];
  p.elecciones = { ...(p.elecciones ?? {}), [e.id]: valores };
  if (e.id === 'raza:resiliencia') {
    for (const a of antes) if (a in p.salvaciones && !valores.includes(a)) p.salvaciones[a as keyof typeof p.salvaciones].comp = false;
    for (const a of valores) if (a in p.salvaciones) p.salvaciones[a as keyof typeof p.salvaciones].comp = true;
  }
  if (e.dote) {
    const origen = `Estilo de combate · ${e.id.split(':')[0]}`;
    p.dotes = p.dotes.filter((d) => d.origen !== origen);
    for (const v of valores) if (ESTILOS.includes(v)) p.dotes.push({ nombre: v, texto: descripcionDote?.(v) ?? '', origen });
  }
}

/** Dotes que vienen de «Estilo de combate» (no cuentan para el límite de dotes normales). */
export const esDoteDeEstilo = (d: { origen?: string }) => !!d.origen?.startsWith('Estilo de combate · ');

/** Idiomas escritos en las elecciones (Jerga de ladrones, Explorador hábil, raza). */
export const idiomasElegidos = (p: Personaje, lista: Eleccion[]) =>
  lista.filter((e) => e.idioma).flatMap((e) => elegido(p, e.id).map((n) => ({ nombre: n, origen: e.origen })));

/** Armas con maestría elegidas (todas las clases). */
export const armasConMaestria = (p: Personaje) => clasesDe(p).flatMap((c) => elegido(p, `${c.clase}:maestria`));

/** Truco extra de Taumaturgo (clérigo) o Mago (druida). */
export const trucoExtraOrden = (p: Personaje, clase: string) =>
  (clase === 'Clérigo' && p.elecciones?.['Clérigo:orden']?.[0] === 'Taumaturgo') || (clase === 'Druida' && p.elecciones?.['Druida:orden']?.[0] === 'Mago') ? 1 : 0;
