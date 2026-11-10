import type { Conjuro, Razas } from './data';
import type { Personaje } from './types';
import { FUENTES, concesionesActivas, fuenteActiva } from './conjurosRasgos';

/** Descansos cortos que se pueden hacer entre dos descansos largos (regla de la mesa). */
export const MAX_DESCANSOS_CORTOS = 2;

/**
 * Cosas que el manual deja recuperar con un descanso corto pero que la hoja no puede hacer sola
 * (hay que elegir, o no se lleva la cuenta en la hoja). Se muestran como recordatorio al descansar.
 */
interface Recordatorio {
  es: string; ru: string;
  clase?: string; subclase?: string; nivel?: number;
  /** Rasgo de raza (fijo o elegido) o rasgo genérico. */
  rasgo?: string; razas?: string[];
  dote?: string;
}

const R: Recordatorio[] = [
  // Clases y subclases
  { clase: 'Bardo', subclase: 'Colegio del glamour', nivel: 14, es: 'Majestad inquebrantable vuelve a estar disponible.', ru: '«Несокрушимое величие» снова доступно.' },
  { clase: 'Brujo', subclase: 'Patrón infernal', nivel: 10, es: 'Resistencia infernal: puedes elegir otro tipo de daño.', ru: '«Адская стойкость»: можно выбрать другой тип урона.' },
  { clase: 'Brujo', subclase: 'Patrón primigenio', nivel: 6, es: 'Combatiente clarividente vuelve a estar disponible.', ru: '«Ясновидящий боец» снова доступен.' },
  { clase: 'Clérigo', subclase: 'Dominio de la guerra', nivel: 3, es: 'Sacerdote guerrero: recuperas todos los usos (mod. SAB, mín. 1).', ru: '«Жрец войны»: восстанавливаются все использования (мод. МДР, мин. 1).' },
  { clase: 'Clérigo', subclase: 'Dominio de la luz', nivel: 6, es: 'Fulgor protector: recuperas todos los usos.', ru: '«Защитная вспышка»: восстанавливаются все использования.' },
  { clase: 'Druida', subclase: 'Círculo de la tierra', nivel: 6, es: 'Recuperación natural: puedes recuperar maná o espacios de conjuro gastados (1 vez por descanso largo).', ru: '«Природное восстановление»: можно вернуть потраченную ману или ячейки (1 раз за долгий отдых).' },
  { clase: 'Druida', subclase: 'Círculo de las estrellas', nivel: 3, es: 'Mapa estelar: si lo perdiste, puedes rehacerlo con una ceremonia de 1 hora.', ru: '«Звёздная карта»: если потеряна, можно сделать новую за ритуал в 1 час.' },
  { clase: 'Explorador', subclase: 'Cazador', nivel: 3, es: 'El cazador y la presa: puedes cambiar la opción elegida.', ru: '«Охотник и добыча»: можно поменять выбранный вариант.' },
  { clase: 'Explorador', subclase: 'Cazador', nivel: 7, es: 'Tácticas defensivas: puedes cambiar la opción elegida.', ru: '«Оборонительная тактика»: можно поменять выбранный вариант.' },
  { clase: 'Guerrero', nivel: 2, es: 'Acción súbita vuelve a estar disponible.', ru: '«Всплеск действий» снова доступен.' },
  { clase: 'Guerrero', subclase: 'Caballero arcano', nivel: 3, es: 'Vínculo de guerra: puedes hacer el ritual (1 hora) durante el descanso.', ru: '«Боевая связь»: во время отдыха можно провести ритуал (1 час).' },
  { clase: 'Guerrero', subclase: 'Guerrero psiónico', nivel: 3, es: 'Dados de energía psiónica: recuperas uno. Telequinesis vuelve a estar disponible.', ru: 'Кости псионической энергии: +1. Телекинез снова доступен.' },
  { clase: 'Guerrero', subclase: 'Guerrero psiónico', nivel: 7, es: 'Adepto telequinético vuelve a estar disponible.', ru: '«Телекинетический адепт» снова доступен.' },
  { clase: 'Guerrero', subclase: 'Maestro del combate', nivel: 3, es: 'Dados de supremacía: recuperas todos.', ru: 'Кости превосходства: восстанавливаются все.' },
  { clase: 'Hechicero', nivel: 5, es: 'Recuperación mágica: puedes recuperar puntos de hechicería hasta la mitad de tu nivel (1 vez por descanso largo).', ru: '«Магическое восстановление»: можно вернуть очки чародейства до половины уровня (1 раз за долгий отдых).' },
  { clase: 'Mago', nivel: 1, es: 'Recuperación arcana: puedes recuperar maná o espacios de conjuro estudiando tu libro.', ru: '«Магическое восстановление»: можно вернуть ману или ячейки, изучая книгу заклинаний.' },
  { clase: 'Mago', nivel: 5, es: 'Memorizar conjuro: puedes cambiar un conjuro preparado por otro de tu libro.', ru: '«Запоминание заклинания»: можно заменить одно подготовленное заклинание другим из книги.' },
  { clase: 'Mago', subclase: 'Universalista', nivel: 6, es: 'Teoría arcana: recuperas los usos (mod. INT).', ru: '«Магическая теория»: восстанавливаются использования (мод. ИНТ).' },
  { clase: 'Pícaro', subclase: 'Rebanaalmas', nivel: 3, es: 'Dados de energía psiónica: recuperas uno.', ru: 'Кости псионической энергии: +1.' },
  // Razas
  { rasgo: 'Alas Celestiales', razas: ['Aasimar'], es: 'Alas celestiales vuelven a estar disponibles.', ru: '«Небесные крылья» снова доступны.' },
  { rasgo: 'Linaje Dracónido', razas: ['Dracónido'], es: 'Aliento de dragón vuelve a estar disponible.', ru: 'Драконье дыхание снова доступно.' },
  { rasgo: 'Influencia Psiónica', razas: ['Githyanki'], es: 'Influencia psiónica vuelve a estar disponible.', ru: '«Псионическое влияние» снова доступно.' },
  { rasgo: 'Resistencia de Piedra', razas: ['Norn'], es: 'Resistencia de piedra vuelve a estar disponible.', ru: '«Каменная стойкость» снова доступна.' },
  { rasgo: 'Hibernar', razas: ['Taratuga'], es: 'Hibernar: al gastar dados de golpe sumas tu bonificador por competencia (la hoja ya lo suma al tirar).', ru: '«Спячка»: при трате костей хитов прибавляется бонус мастерства (лист прибавляет сам).' },
  { rasgo: 'Alas demoníacas', razas: ['Tiefling'], es: 'Alas demoníacas vuelven a estar disponibles.', ru: '«Демонические крылья» снова доступны.' },
  { rasgo: 'Vampiro', es: 'Vampiro: puedes volver a convertirte en enjambre de murciélagos y quitar 1 contador de decrepitud si te alimentaste.', ru: 'Вампир: снова можно превратиться в рой летучих мышей и снять 1 счётчик дряхлости, если ты питался.' },
  { rasgo: 'Conjurador Experto', es: 'Conjurador experto vuelve a estar disponible.', ru: '«Опытный заклинатель» снова доступен.' },
  { rasgo: 'Instinto de Supervivencia', es: 'Instinto de supervivencia vuelve a estar disponible.', ru: '«Инстинкт выживания» снова доступен.' },
  { rasgo: 'Lengua Veloz', es: 'Lengua veloz vuelve a estar disponible.', ru: '«Быстрый язык» снова доступен.' },
  { rasgo: 'Reflejos Rápidos', es: 'Reflejos rápidos (+2 a la iniciativa) vuelve a estar disponible.', ru: '«Быстрые рефлексы» (+2 к инициативе) снова доступны.' },
  { rasgo: 'Veterano de Batalla', es: 'Veterano de batalla (+1d4 a un ataque) vuelve a estar disponible.', ru: '«Ветеран битв» (+1к4 к атаке) снова доступен.' },
  { rasgo: 'Voluntad de Acero', es: 'Voluntad de acero vuelve a estar disponible.', ru: '«Стальная воля» снова доступна.' },
  // Dotes
  { dote: 'Azote de magos', es: 'Azote de magos: puedes volver a repetir una TS fallada.', ru: '«Бич магов»: снова можно перебросить проваленный спасбросок.' },
  { dote: 'Chef', es: 'Chef: puedes preparar la comida especial (+1d8 PG a quien gaste DG en este descanso).', ru: '«Повар»: можно приготовить особую еду (+1к8 хитов тем, кто тратит КХ на этом отдыхе).' },
  { dote: 'Líder inspirador', es: 'Líder inspirador: puedes dar tu discurso (PG temporales a los aliados).', ru: '«Вдохновляющий лидер»: можно произнести речь (временные хиты союзникам).' },
  { dote: 'Don del destino', es: 'Don del destino vuelve a estar disponible.', ru: '«Дар судьбы» снова доступен.' },
];

/** Rasgos de raza cuyos conjuros se pueden lanzar «1 vez/descanso» (también el corto). */
const CONJUROS_POR_DESCANSO = ['Magia Drow', 'Magia Sylvari', 'Vampiro', 'Legado de'];

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;

function tieneRasgo(p: Personaje, razas: Razas | null, nombre: string, lista?: string[]) {
  if (lista && !lista.includes(p.raza)) return false;
  const empieza = (r: string) => igual(r, nombre) || r.toLowerCase().startsWith(nombre.toLowerCase());
  if ((p.rasgosRaza ?? []).some(empieza)) return true;
  return !!razas?.razas.find((r) => r.nombre === p.raza)?.rasgosFijos.some((r) => empieza(r.nombre));
}

/** Recordatorios para el descanso corto de este personaje, en el idioma pedido. */
export function recordatoriosCorto(p: Personaje, razas: Razas | null, todos: Conjuro[] | null, ru: boolean): string[] {
  const out = R.filter((r) => {
    if (r.clase && (r.clase !== p.clase || p.nivel < (r.nivel ?? 1))) return false;
    if (r.subclase && !igual(r.subclase, p.subclase ?? '')) return false;
    if (r.rasgo && !tieneRasgo(p, razas, r.rasgo, r.razas)) return false;
    if (r.dote && !(p.dotes ?? []).some((d) => igual(d.nombre, r.dote!))) return false;
    return true;
  }).map((r) => (ru ? r.ru : r.es));
  // Conjuros de raza que se lanzan gratis 1 vez por descanso.
  const nombres = concesionesActivas(p, razas)
    .filter((c) => CONJUROS_POR_DESCANSO.some((n) => c.fuente.rasgo.startsWith(n)) && FUENTES.includes(c.fuente) && fuenteActiva(c.fuente, p, razas))
    .flatMap((c) => c.conjuros ?? p.eleccionesConjuros?.[c.id] ?? [])
    .filter((n) => (todos?.find((s) => igual(s.nombre, n))?.nivel ?? 1) > 0);
  if (nombres.length) out.push(ru ? `Снова можно бесплатно наложить: ${nombres.join(', ')}.` : `Puedes volver a lanzar sin gastar recursos: ${nombres.join(', ')}.`);
  return out;
}
