import { NOMBRES_CATALOGO, recursosCatalogoActivos } from './descansoCorto';
import { recursosTexto } from './recursosTexto';
import { clasesDe, conSubclase, datosClase, esMulticlase, nivelEn, nivelTotal, vistaClase } from './multiclase';
import type { Clase } from './data';
import type { Personaje, RecursoExtra } from './types';
import { bonoCompetencia, car, modificador } from './rules';

/**
 * Recurso de clase o raza con usos limitados. Todos se recuperan con un descanso largo;
 * `corto` dice qué devuelve un descanso corto (uno o todos). `acumula`: cuenta lo que se acumula (p. ej. estrés) en vez de lo que queda.
 */
export interface Recurso { id: string; es: string; ru: string; max: number; corto?: 'uno' | 'todos'; acumula?: boolean; /** Añadido a mano por el jugador. */ extra?: boolean; notas?: string }

/** Columnas de la tabla de cada clase que son usos (Furias, Puntos de ki…). */
// Qué recupera el descanso corto, según el manual: Furia, Canalizar divinidad, Forma salvaje y Tomar aliento recuperan uno; el ki, todos.
const COLUMNAS: Record<string, { col: string; id: string; es: string; ru: string; corto?: 'uno' | 'todos' }[]> = {
  'Bárbaro': [{ col: 'Furias', id: 'furia', es: 'Furia', ru: 'Ярость', corto: 'uno' }],
  'Clérigo': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал', corto: 'uno' }],
  'Paladín': [{ col: 'Canalizar divinidad', id: 'canalizar', es: 'Canalizar divinidad', ru: 'Божественный канал', corto: 'uno' }],
  'Druida': [{ col: 'Forma salvaje', id: 'formaSalvaje', es: 'Forma salvaje', ru: 'Дикий облик', corto: 'uno' }],
  'Explorador': [{ col: 'Enemigo predilecto', id: 'enemigoPredilecto', es: 'Enemigo predilecto', ru: 'Излюбленный враг' }],
  'Guerrero': [{ col: 'Tomar aliento', id: 'tomarAliento', es: 'Tomar aliento', ru: 'Второе дыхание', corto: 'uno' }],
  'Hechicero': [{ col: 'Puntos de hechicería', id: 'puntosHechiceria', es: 'Puntos de hechicería', ru: 'Очки чародейства' }],
  'Monje': [{ col: 'Puntos de ki', id: 'ki', es: 'Puntos de ki', ru: 'Очки ки', corto: 'todos' }],
};

const TROLES = ['Trol de hielo (Drakkari)', 'Trol de la jungla (Gurubashi)', 'Trol del bosque (Amani)', 'Trol lanza-negra', 'Trol zandalari'];
const tieneRasgo = (p: Personaje, nombre: string) => (p.rasgosRaza ?? []).some((r) => r.toLowerCase() === nombre.toLowerCase());

/** Recursos que da la raza (o un rasgo racial elegido). */
export function recursosRaza(p: Personaje): Recurso[] {
  const out: Recurso[] = [];
  if (TROLES.includes(p.raza)) out.push({ id: 'trance', es: 'Puntos de Trance', ru: 'Очки транса', max: bonoCompetencia(nivelTotal(p)), corto: 'uno' });
  if (p.raza === 'Norn') out.push(
    { id: 'formaTotal', es: 'Forma total', ru: 'Полный облик', max: 1 },
    { id: 'estres', es: 'Estrés espiritual', ru: 'Духовный стресс', max: 3, corto: 'uno', acumula: true },
  );
  if (tieneRasgo(p, 'Agilidad Zorruna')) out.push({ id: 'agilidadZorruna', es: 'Agilidad zorruna', ru: 'Лисья ловкость', max: 1, corto: 'todos' });
  if (tieneRasgo(p, 'Concentración Firme')) out.push({ id: 'concentracionFirme', es: 'Concentración firme', ru: 'Твёрдая концентрация', max: 1, corto: 'todos' });
  return out;
}

/** Todos los recursos con usos del personaje: los de su clase y los de su raza. */
export const recursosPersonaje = (p: Personaje, clase: Clase | null | undefined): Recurso[] => {
  const auto = [...recursosClase(p, clase), ...recursosRaza(p)];
  // Rasgos de raza, genéricos y dotes del catálogo (Alas celestiales, Aliento de dragón, Don del destino…): ya van solos.
  for (const r of recursosCatalogoActivos(p)) if (!auto.some((x) => x.id === r.id)) auto.push(r);
  // Los añadidos a mano que ahora salen solos no se repiten.
  const fijos = [...auto, ...(p.recursosExtra ?? []).filter((e) => !auto.some((x) => x.id === e.id)).map(recursoDeExtra)];
  // Lo que el texto de los rasgos dice que tiene usos (Luz divina, Poder de los Altos Cielos, Afortunado…).
  const ya = [...fijos.map((r) => r.es.replace(/\s*\(d\d+\)$/, '')), ...NO_RECURSO, ...NOMBRES_CATALOGO];
  return [...fijos, ...recursosTexto(p, clase, ya)];
};
/** Rasgos cuyo texto habla de usos pero que ya se llevan de otra forma (columnas de la tabla, maná, recordatorios). */
const NO_RECURSO = ['Furia', 'Canalizar divinidad', 'Forma salvaje', 'Tomar aliento', 'Puntos de hechicería', 'Fuente de magia', 'Puntos de ki', 'Disciplina monástica', 'Concentración', 'Enemigo predilecto', 'Inspiración bárdica', 'Imponer las manos', 'Superioridad en combate', 'Trance', 'Trance Trol', 'Bendición de los Espíritus', 'Hibernar', 'Conocimiento Astral', 'Fabricante', 'Chef', 'Líder inspirador', 'Maestro de armas', 'Don de la resistencia a energías', 'Mejora de Característica', 'Magia Duergar', 'Conjuros característicos', 'Vampiro'];

export function recursoDeExtra(r: RecursoExtra): Recurso {
  // Los recursos añadidos no se recuperan solos: el descanso solo los recuerda.
  return { id: r.id, es: r.es, ru: r.ru, max: r.max, extra: true, notas: r.notas };
}

/** Recupera de un recurso añadido (las fichas antiguas no lo tienen). */
export const recuperaExtra = (r: RecursoExtra): 'corto' | 'largo' | 'ambos' => r.recupera ?? (r.corto ? 'ambos' : 'largo');

/** Recursos de todas las clases del personaje (multiclase: cada una a su nivel), sin repetir. */
export function recursosClase(p: Personaje, clase: Clase | null | undefined): Recurso[] {
  if (!esMulticlase(p)) return recursosUnaClase(p, clase);
  const out: Recurso[] = [];
  for (const c of clasesDe(p)) for (const r of recursosUnaClase(vistaClase(p, c), datosClase(c.clase, clase))) if (!out.some((x) => x.id === r.id)) out.push(r);
  return out;
}

/** Recursos de la clase del personaje a su nivel actual, sacados de la tabla de la clase del manual. */
function recursosUnaClase(p: Personaje, clase: Clase | null | undefined): Recurso[] {
  if (!clase) return [];
  const fila = clase.tabla.find((f) => f.nivel === p.nivel) ?? clase.tabla[clase.tabla.length - 1];
  const out: Recurso[] = [];
  for (const c of COLUMNAS[clase.nombre] ?? []) {
    const n = parseInt(String(fila?.[c.col] ?? ''), 10);
    if (n > 0) out.push({ id: c.id, es: c.es, ru: c.ru, max: n, corto: c.corto });
  }
  // Sin columna en la tabla: usos según el texto del rasgo.
  if (clase.nombre === 'Bardo') out.unshift({ id: 'inspiracionBardica', es: 'Inspiración bárdica', ru: 'Бардовское вдохновение', max: Math.max(1, modificador(car(p, 'CAR'))), corto: p.nivel >= 5 ? 'todos' : undefined });
  if (clase.nombre === 'Paladín') out.unshift({ id: 'imponerManos', es: 'Imponer las manos (PG)', ru: 'Наложение рук (хиты)', max: 5 * p.nivel });
  for (const r of RECURSOS_CLASE) if (r.sub === clase.nombre && p.nivel >= r.nivel) out.push({ id: r.id, es: r.es, ru: r.ru, max: Math.max(1, r.max(p)), corto: r.corto });
  out.push(...recursosSubclase(p));
  return out;
}

// ---------------------------------------------------------------- Subclases
/** Un recurso de subclase: desde qué nivel de clase, cuántos usos y qué devuelve el descanso corto. */
interface RecSub { sub: string; nivel: number; id: string; es: string; ru: string; max: (p: Personaje) => number; corto?: 'uno' | 'todos'; /** Desde este nivel el descanso corto lo devuelve todo. */ cortoDesde?: number; dado?: (p: Personaje) => string }
const modMin1 = (p: Personaje, a: 'SAB' | 'INT' | 'CAR') => Math.max(1, modificador(car(p, a)));
const uno = () => 1;
const porNivel = (p: Personaje, tabla: [number, number][]) => tabla.reduce((v, [n, x]) => (p.nivel >= n ? x : v), 0);
const dadoPorNivel = (p: Personaje, tabla: [number, string][]) => tabla.reduce((v, [n, x]) => (p.nivel >= n ? x : v), '');
/** Dados de energía psiónica (Guerrero psiónico y Rebanaalmas, manual de 2024). */
const PSI_N: [number, number][] = [[3, 4], [5, 6], [9, 8], [13, 10], [17, 12]];
const PSI_D: [number, string][] = [[3, 'd6'], [5, 'd8'], [11, 'd10'], [17, 'd12']];

/** Rasgos de clase con usos que no salen en la tabla de la clase (aquí `sub` es el nombre de la clase). */
export const RECURSOS_CLASE: RecSub[] = [
  { sub: 'Guerrero', nivel: 9, id: 'indomito', es: 'Indómito', ru: 'Неукротимый', max: (p) => porNivel(p, [[9, 1], [13, 2], [17, 3]]) },
  { sub: 'Druida', nivel: 20, id: 'archidruida', es: 'Archidruida', ru: 'Архидруид', max: uno },
  { sub: 'Guerrero', nivel: 2, id: 'accionSubita', es: 'Acción súbita', ru: 'Всплеск действий', max: (p) => (p.nivel >= 17 ? 2 : 1), corto: 'todos' },
  { sub: 'Brujo', nivel: 2, id: 'astuciaMagica', es: 'Astucia mágica', ru: 'Магическая хитрость', max: uno },
  { sub: 'Brujo', nivel: 9, id: 'contactarPatron', es: 'Contactar patrón', ru: 'Связь с покровителем', max: uno },
  { sub: 'Brujo', nivel: 11, id: 'arcanumMistico', es: 'Arcanum místico', ru: 'Таинственный арканум', max: (p) => porNivel(p, [[11, 1], [13, 2], [15, 3], [17, 4]]) },
  { sub: 'Clérigo', nivel: 10, id: 'intervencionDivina', es: 'Intervención divina', ru: 'Божественное вмешательство', max: uno },
  { sub: 'Druida', nivel: 5, id: 'resurgimientoSalvaje', es: 'Resurgimiento salvaje', ru: 'Дикое возрождение', max: uno },
  { sub: 'Explorador', nivel: 10, id: 'infatigable', es: 'Infatigable', ru: 'Неутомимый', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Explorador', nivel: 14, id: 'veloNaturaleza', es: 'Velo de la naturaleza', ru: 'Покров природы', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Hechicero', nivel: 5, id: 'recuperacionMagica', es: 'Recuperación mágica', ru: 'Магическое восстановление', max: uno },
  { sub: 'Mago', nivel: 1, id: 'recuperacionArcana', es: 'Recuperación arcana', ru: 'Магическое восстановление', max: uno },
  { sub: 'Monje', nivel: 2, id: 'metabolismo', es: 'Metabolismo asombroso', ru: 'Поразительный метаболизм', max: uno },
  { sub: 'Pícaro', nivel: 20, id: 'golpeSuerte', es: 'Golpe de suerte', ru: 'Удачный удар', max: uno, corto: 'todos' },
];

/** Usos de los rasgos de subclase (los que se gastan: «X veces igual a tu modificador…», «no podrás volver a hacerlo hasta…»). */
export const RECURSOS_SUBCLASE: RecSub[] = [
  // Bárbaro
  { sub: 'Senda del berserker', nivel: 14, id: 'presenciaIntimidante', es: 'Presencia intimidante', ru: 'Пугающее присутствие', max: uno },
  { sub: 'Senda del fanático', nivel: 3, id: 'guerreroDioses', es: 'Guerrero de los dioses (d12 de curación)', ru: 'Воин богов (к12 лечения)', max: (p) => porNivel(p, [[3, 4], [6, 5], [12, 6], [17, 7]]) },
  { sub: 'Senda del fanático', nivel: 10, id: 'presenciaFerviente', es: 'Presencia ferviente', ru: 'Пылкое присутствие', max: uno },
  { sub: 'Senda del fanático', nivel: 14, id: 'furiaDioses', es: 'Furia de los dioses', ru: 'Ярость богов', max: uno },
  // Bardo
  { sub: 'Colegio del glamour', nivel: 3, id: 'magiaCautivadora', es: 'Magia cautivadora', ru: 'Чарующая магия', max: uno },
  { sub: 'Colegio del glamour', nivel: 6, id: 'mantoMajestad', es: 'Manto de majestad', ru: 'Мантия величия', max: uno },
  { sub: 'Colegio del glamour', nivel: 14, id: 'majestad', es: 'Majestad inquebrantable', ru: 'Несокрушимое величие', max: uno, corto: 'todos' },
  // Brujo
  { sub: 'Filo maléfico', nivel: 3, id: 'maldicionFilo', es: 'Maleficio gratis (Maldición del filo)', ru: 'Бесплатный «Сглаз»', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Filo maléfico', nivel: 10, id: 'armaduraMaleficios', es: 'Armadura de maleficios', ru: 'Броня проклятий', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Patrón celestial', nivel: 3, id: 'luzSanadora', es: 'Luz sanadora (d6)', ru: 'Исцеляющий свет (к6)', max: (p) => 1 + p.nivel },
  { sub: 'Patrón celestial', nivel: 14, id: 'venganzaArdiente', es: 'Venganza ardiente', ru: 'Пылающая месть', max: uno },
  { sub: 'Patrón feérico', nivel: 3, id: 'pasosFeericos', es: 'Pasos feéricos', ru: 'Шаги фей', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Patrón feérico', nivel: 10, id: 'defensasSeductoras', es: 'Defensas seductoras', ru: 'Чарующая защита', max: uno },
  { sub: 'Patrón infernal', nivel: 6, id: 'suerteOscuro', es: 'La suerte del oscuro', ru: 'Удача тёмного', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Patrón infernal', nivel: 14, id: 'arrastrarInfierno', es: 'Arrastrar por el infierno', ru: 'Низвержение в ад', max: uno },
  { sub: 'Patrón primigenio', nivel: 6, id: 'clarividente', es: 'Combatiente clarividente', ru: 'Ясновидящий боец', max: uno, corto: 'todos' },
  // Clérigo
  { sub: 'Dominio de la guerra', nivel: 3, id: 'sacerdoteGuerrero', es: 'Sacerdote guerrero', ru: 'Жрец войны', max: (p) => modMin1(p, 'SAB'), corto: 'todos' },
  { sub: 'Dominio de la luz', nivel: 3, id: 'fulgorProtector', es: 'Fulgor protector', ru: 'Защитная вспышка', max: (p) => modMin1(p, 'SAB'), cortoDesde: 6 },
  { sub: 'Dominio de la luz', nivel: 17, id: 'haloLuz', es: 'Halo de luz', ru: 'Ореол света', max: (p) => modMin1(p, 'SAB') },
  // Druida
  { sub: 'Círculo de la luna', nivel: 10, id: 'pasoLuzLunar', es: 'Paso de la luz lunar', ru: 'Шаг лунного света', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Círculo de la tierra', nivel: 6, id: 'recuperacionNatural', es: 'Recuperación natural', ru: 'Природное восстановление', max: uno },
  { sub: 'Círculo de las estrellas', nivel: 3, id: 'mapaEstelar', es: 'Mapa estelar (Guía / Saeta guía)', ru: 'Звёздная карта', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Círculo de las estrellas', nivel: 6, id: 'presagioCosmico', es: 'Presagio cósmico', ru: 'Космическое знамение', max: (p) => modMin1(p, 'SAB') },
  // Explorador
  { sub: 'Acechador en la penumbra', nivel: 3, id: 'emboscadorPavoroso', es: 'Emboscador pavoroso', ru: 'Ужасающий засадчик', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Errante feérico', nivel: 11, id: 'refuerzosFeericos', es: 'Refuerzos feéricos (Invocar feérico gratis)', ru: 'Подкрепление фей', max: uno },
  { sub: 'Errante feérico', nivel: 15, id: 'erranteBrumoso', es: 'Errante brumoso', ru: 'Туманный странник', max: (p) => modMin1(p, 'SAB') },
  // Guerrero
  { sub: 'Arquero arcano', nivel: 3, id: 'disparoArcano', es: 'Disparo arcano', ru: 'Магический выстрел', max: (p) => modMin1(p, 'INT'), corto: 'todos', dado: (p) => dadoPorNivel(p, [[3, 'd6'], [10, 'd8'], [15, 'd10'], [18, 'd12']]) },
  { sub: 'Caballero de la orden', nivel: 7, id: 'fortalezaInquebrantable', es: 'Fortaleza inquebrantable', ru: 'Несокрушимая стойкость', max: uno },
  { sub: 'Caballero de la orden', nivel: 18, id: 'golpePerfecto', es: 'Golpe perfecto', ru: 'Идеальный удар', max: uno },
  { sub: 'Guerrero psiónico', nivel: 3, id: 'dadosPsionicos', es: 'Dados de energía psiónica', ru: 'Кости псионической энергии', max: (p) => porNivel(p, PSI_N), corto: 'uno', dado: (p) => dadoPorNivel(p, PSI_D) },
  { sub: 'Guerrero psiónico', nivel: 3, id: 'telequinesis', es: 'Movimiento telequinético', ru: 'Телекинетическое перемещение', max: uno, corto: 'todos' },
  { sub: 'Guerrero psiónico', nivel: 7, id: 'adeptoTelequinetico', es: 'Adepto telequinético', ru: 'Телекинетический адепт', max: uno, corto: 'todos' },
  { sub: 'Guerrero psiónico', nivel: 15, id: 'bastionFuerza', es: 'Bastión de fuerza', ru: 'Бастион силы', max: uno },
  { sub: 'Guerrero psiónico', nivel: 18, id: 'maestroTelequinetico', es: 'Maestro telequinético', ru: 'Мастер телекинеза', max: uno },
  { sub: 'Maestro del combate', nivel: 3, id: 'dadosSupremacia', es: 'Dados de supremacía', ru: 'Кости превосходства', max: (p) => porNivel(p, [[3, 4], [7, 5], [15, 6]]), corto: 'todos', dado: (p) => dadoPorNivel(p, [[3, 'd8'], [10, 'd10'], [18, 'd12']]) },
  { sub: 'Maestro del combate', nivel: 7, id: 'conoceEnemigo', es: 'Conoce a tu enemigo', ru: 'Знай своего врага', max: uno },
  // Hechicero
  { sub: 'Hechicería aberrante', nivel: 18, id: 'implosion', es: 'Implosión deformadora', ru: 'Искажающая имплозия', max: uno },
  { sub: 'Hechicería de magia salvaje', nivel: 3, id: 'mareasCaos', es: 'Mareas del caos', ru: 'Волны хаоса', max: uno },
  { sub: 'Hechicería de magia salvaje', nivel: 18, id: 'sobrecargaDomada', es: 'Sobrecarga domada', ru: 'Укрощённый всплеск', max: uno },
  { sub: 'Hechicería dracónica', nivel: 14, id: 'alasDragon', es: 'Alas de dragón', ru: 'Крылья дракона', max: uno },
  { sub: 'Hechicería dracónica', nivel: 18, id: 'companeroDragon', es: 'Compañero dragón (Invocar dragón gratis)', ru: 'Драконий спутник', max: uno },
  { sub: 'Hechicería mecánica', nivel: 3, id: 'restablecerEquilibrio', es: 'Restablecer equilibrio', ru: 'Восстановление равновесия', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Hechicería mecánica', nivel: 14, id: 'tranceOrden', es: 'Trance de orden', ru: 'Транс порядка', max: uno },
  { sub: 'Hechicería mecánica', nivel: 18, id: 'cabalgataMecanica', es: 'Cabalgata mecánica', ru: 'Механическая кавалькада', max: uno },
  // Mago
  { sub: 'Abjurador', nivel: 3, id: 'salvaguarda', es: 'Salvaguarda arcana (PG)', ru: 'Магическая защита (хиты)', max: (p) => 2 * p.nivel + modificador(car(p, 'INT')) },
  { sub: 'Adivino', nivel: 3, id: 'presagio', es: 'Presagio (d20 guardados)', ru: 'Знамение (сохранённые к20)', max: (p) => (p.nivel >= 14 ? 3 : 2) },
  { sub: 'Adivino', nivel: 10, id: 'tercerOjo', es: 'El tercer ojo', ru: 'Третий глаз', max: uno, corto: 'todos' },
  { sub: 'Conjurador', nivel: 3, id: 'invocacionAgil', es: 'Invocación ágil', ru: 'Ловкий призыв', max: (p) => modMin1(p, 'INT') },
  { sub: 'Conjurador', nivel: 6, id: 'conjuracionInstantanea', es: 'Conjuración instantánea', ru: 'Мгновенный призыв', max: uno },
  { sub: 'Conjurador', nivel: 14, id: 'senorPuertas', es: 'Señor de las puertas', ru: 'Владыка врат', max: uno },
  { sub: 'Ilusionista', nivel: 10, id: 'yoIlusorio', es: 'Yo ilusorio', ru: 'Иллюзорное «я»', max: uno, corto: 'todos' },
  { sub: 'Transmutador', nivel: 6, id: 'metamorfosisArcana', es: 'Metamorfosis arcana', ru: 'Магическая метаморфоза', max: uno },
  { sub: 'Transmutador', nivel: 6, id: 'polimorfarGratis', es: 'Polimorfar gratis', ru: 'Бесплатное «Превращение»', max: uno },
  { sub: 'Transmutador', nivel: 14, id: 'arsPrimordialis', es: 'Ars primordialis', ru: 'Ars primordialis', max: uno },
  { sub: 'Universalista', nivel: 6, id: 'teoriaArcana', es: 'Teoría arcana', ru: 'Магическая теория', max: (p) => modMin1(p, 'INT'), corto: 'todos' },
  { sub: 'Universalista', nivel: 10, id: 'armoniaArcana', es: 'Armonía arcana', ru: 'Магическая гармония', max: uno },
  { sub: 'Universalista', nivel: 14, id: 'sintesisArcana', es: 'Síntesis arcana', ru: 'Магический синтез', max: uno },
  // Monje
  { sub: 'Monje de la mano abierta', nivel: 6, id: 'plenitudCuerpo', es: 'Plenitud de cuerpo', ru: 'Целостность тела', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Monje de la misericordia', nivel: 11, id: 'rafagaCuracion', es: 'Ráfaga de curación y aflicción', ru: 'Шквал исцеления и страдания', max: (p) => modMin1(p, 'SAB') },
  { sub: 'Monje de la misericordia', nivel: 17, id: 'misericordiaSuprema', es: 'Mano de misericordia suprema', ru: 'Высшая длань милосердия', max: uno },
  // Paladín
  { sub: 'Juramento de entrega', nivel: 20, id: 'haloSagrado', es: 'Halo sagrado', ru: 'Священный ореол', max: uno },
  { sub: 'Juramento de gloria', nivel: 15, id: 'defensaGloriosa', es: 'Defensa gloriosa', ru: 'Славная защита', max: (p) => modMin1(p, 'CAR') },
  { sub: 'Juramento de gloria', nivel: 20, id: 'leyendaViviente', es: 'Leyenda viviente', ru: 'Живая легенда', max: uno },
  { sub: 'Juramento de los antiguos', nivel: 15, id: 'centinelaImperecedero', es: 'Centinela imperecedero', ru: 'Неувядающий страж', max: uno },
  { sub: 'Juramento de los antiguos', nivel: 20, id: 'campeonAncestral', es: 'Campeón ancestral', ru: 'Древний чемпион', max: uno },
  { sub: 'Juramento de venganza', nivel: 20, id: 'angelVengador', es: 'Ángel vengador', ru: 'Ангел мщения', max: uno },
  // Pícaro
  { sub: 'Embaucador arcano', nivel: 17, id: 'ladronConjuros', es: 'Ladrón de conjuros', ru: 'Похититель заклинаний', max: uno },
  { sub: 'Rebanaalmas', nivel: 3, id: 'dadosPsionicos', es: 'Dados de energía psiónica', ru: 'Кости псионической энергии', max: (p) => porNivel(p, PSI_N), corto: 'uno', dado: (p) => dadoPorNivel(p, PSI_D) },
  { sub: 'Rebanaalmas', nivel: 13, id: 'veloPsiquico', es: 'Velo psíquico', ru: 'Психическая вуаль', max: uno },
  { sub: 'Rebanaalmas', nivel: 17, id: 'desgarroMental', es: 'Desgarro mental', ru: 'Разрыв разума', max: uno },
];

/** Recursos de la subclase del personaje (p ya es la vista de una sola clase). */
export function recursosSubclase(p: Personaje): Recurso[] {
  const sub = (p.subclase ?? '').toLowerCase();
  if (!sub) return [];
  return RECURSOS_SUBCLASE.filter((r) => r.sub.toLowerCase() === sub && p.nivel >= r.nivel).map((r) => {
    const d = r.dado?.(p);
    return { id: r.id, es: d ? `${r.es} (${d})` : r.es, ru: d ? `${r.ru} (${d.replace('d', 'к')})` : r.ru, max: Math.max(1, r.max(p)), corto: r.cortoDesde && p.nivel >= r.cortoDesde ? 'todos' : r.corto };
  });
}

/** Dados de golpe que se recuperan con un descanso largo: la mitad del máximo, redondeando abajo (mínimo 1). */
export const dgRecuperados = (nivel: number) => Math.max(1, Math.floor(nivel / 2));

/** Descanso largo: PG y maná al máximo, mitad de los DG, todos los recursos de clase, −1 agotamiento. */
export function descansoLargo(x: Personaje) {
  x.pg.actual = x.pg.max;
  x.pg.temp = 0;
  x.pm.actual = x.pm.max;
  x.dgUsados = Math.max(0, x.dgUsados - dgRecuperados(x.nivel));
  // Los recursos añadidos a mano conservan lo gastado: se recuperan a mano.
  const usados: Record<string, number> = {};
  for (const r of x.recursosExtra ?? []) if (x.recursosUsados?.[r.id]) usados[r.id] = x.recursosUsados[r.id];
  x.recursosUsados = usados;
  x.potenciadores = [];
  x.descansosCortos = 0;
  x.agotamiento = Math.max(0, (x.agotamiento ?? 0) - 1);
  x.muerte = { exitos: 0, fallos: 0 };
  if (x.pg.actual > 0) x.estados = (x.estados ?? []).filter((e) => e !== 'inconsciente' && e !== 'moribundo');
}

/** Bonificador extra al tirar un dado de golpe (Taratuga: + bonificador por competencia en descanso corto). */
export const extraDadoGolpe = (p: Personaje) => (p.raza === 'Taratuga' ? bonoCompetencia(nivelTotal(p)) : 0);

/** Descanso corto: devuelve los usos que marca el manual y quita 1 de agotamiento al Explorador de nivel 10+. Devuelve qué ha recuperado. */
export function descansoCorto(x: Personaje, clase: Clase | null | undefined): string[] {
  const hecho: string[] = [];
  const usados = { ...(x.recursosUsados ?? {}) };
  for (const r of recursosPersonaje(x, clase)) {
    const u = usados[r.id] ?? 0;
    if (!r.corto || u <= 0) continue;
    usados[r.id] = r.corto === 'todos' ? 0 : u - 1;
    hecho.push(r.id);
  }
  x.recursosUsados = usados;
  x.descansosCortos = (x.descansosCortos ?? 0) + 1;
  if (nivelEn(x, 'Explorador') >= 10 && x.agotamiento > 0) { x.agotamiento -= 1; hecho.push('agotamiento'); }
  return hecho;
}

/**
 * Al tirar iniciativa, lo que los rasgos devuelven solos: Disparo siempre listo (Arquero arcano 7; 2 usos con Reserva arcana 18),
 * Forma salvaje permanente (Archidruida), Inspiración superior (Bardo 18, hasta 2) y Concentración perfecta (Monje 15, ki hasta 4).
 * Devuelve qué ha recuperado (para avisarlo).
 */
export function alTirarIniciativa(x: Personaje, clase: Clase | null | undefined): string[] {
  const hecho: string[] = [];
  const recs = recursosPersonaje(x, clase);
  const usados = { ...(x.recursosUsados ?? {}) };
  const quedan = (id: string) => { const r = recs.find((y) => y.id === id); return r ? r.max - (usados[id] ?? 0) : null; };
  const hasta = (id: string, n: number, es: string) => {
    const r = recs.find((y) => y.id === id); const q = quedan(id);
    if (!r || q === null || q >= Math.min(n, r.max)) return;
    usados[id] = Math.max(0, r.max - Math.min(n, r.max)); hecho.push(es);
  };
  if (conSubclase(x, 'Guerrero', 'Arquero arcano', 7) && quedan('disparoArcano') === 0) hasta('disparoArcano', conSubclase(x, 'Guerrero', 'Arquero arcano', 18) ? 2 : 1, 'Disparo siempre listo');
  if (nivelEn(x, 'Druida') >= 20 && quedan('formaSalvaje') === 0) hasta('formaSalvaje', 1, 'Archidruida');
  if (nivelEn(x, 'Bardo') >= 18) hasta('inspiracionBardica', 2, 'Inspiración superior');
  if (nivelEn(x, 'Monje') >= 15 && (quedan('ki') ?? 99) <= 3) hasta('ki', 4, 'Concentración perfecta');
  x.recursosUsados = usados;
  return hecho;
}

/** Texto de lo que recupera un descanso corto, para avisar antes de hacerlo. */
export function resumenCorto(p: Personaje, clase: Clase | null | undefined, ru: boolean): string[] {
  const out = recursosPersonaje(p, clase).filter((r) => r.corto).map((r) => `${ru ? r.ru : r.es} (${r.corto === 'todos' ? (ru ? 'все' : 'todos') : '+1'})`);
  if (nivelEn(p, 'Explorador') >= 10) out.push(ru ? 'истощение −1' : 'agotamiento −1');
  return out;
}
