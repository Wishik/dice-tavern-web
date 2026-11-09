import { useEffect, useState } from 'react';

/** Idioma de la interfaz. Los textos del manual (conjuros, rasgos, clases…) siguen en español. */
export type Idioma = 'es' | 'ru';
const CLAVE = 'dicetavern.idioma';
let actual: Idioma = (() => { try { return localStorage.getItem(CLAVE) === 'ru' ? 'ru' : 'es'; } catch { return 'es'; } })();
const oyentes = new Set<() => void>();

export const idioma = () => actual;
export function cambiarIdioma(i: Idioma) {
  actual = i;
  try { localStorage.setItem(CLAVE, i); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = i;
  oyentes.forEach((f) => f());
}
/** Hace que el componente se vuelva a pintar al cambiar de idioma. */
export function useIdioma(): Idioma {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((x) => x + 1); oyentes.add(f); return () => { oyentes.delete(f); }; }, []);
  return actual;
}
/** Texto en el idioma actual: L('Añadir', 'Добавить'). */
export const L = (es: string, ru: string) => (actual === 'ru' ? ru : es);
/** Busca la traducción de un nombre (clase, raza, habilidad…); si no hay, deja el original. */
export const T = (mapa: Record<string, string>, s: string) => (actual === 'ru' ? mapa[s] ?? s : s);

export const RU_CLASES: Record<string, string> = {
  'Bárbaro': 'Варвар', 'Bardo': 'Бард', 'Brujo': 'Колдун', 'Clérigo': 'Жрец', 'Druida': 'Друид', 'Explorador': 'Следопыт',
  'Guerrero': 'Воин', 'Hechicero': 'Чародей', 'Mago': 'Волшебник', 'Monje': 'Монах', 'Paladín': 'Паладин', 'Pícaro': 'Плут',
};
export const RU_RAZAS: Record<string, string> = {
  'Aasimar': 'Аасимар', 'Anuro': 'Ануро', 'Araina': 'Араина', 'Asura': 'Асура', 'Avianthar': 'Авиантар', 'Charr': 'Чарр',
  'Diablillo': 'Бесёнок', 'Dracónido': 'Драконорождённый', 'Altos Elfos': 'Высшие эльфы', 'Elfos de los Bosques': 'Лесные эльфы',
  'Elfo Oscuro (Drow)': 'Тёмный эльф (дроу)', 'Enanos de las Montañas': 'Горные дварфы', 'Enanos de las Colinas': 'Холмовые дварфы',
  'Enanos Grises (Duergar)': 'Серые дварфы (дуэргары)', 'Félidos': 'Фелиды', 'Fúngicos': 'Грибовики', 'Githyanki': 'Гитъянки',
  'Gnomo': 'Гном', 'Gnomos Grises (Svirfneblin)': 'Глубинные гномы (свирфнеблины)', 'Goblin': 'Гоблин', 'Humano': 'Человек',
  'Insectoide': 'Инсектоид', 'Kitsune': 'Кицунэ', 'Kobold': 'Кобольд', 'Medianos': 'Полурослики', 'Norn': 'Норн', 'Orco': 'Орк',
  'Rátidos': 'Крысолюды', 'Reptilianos': 'Рептилоиды', 'Semi-Alto elfo': 'Полуэльф (высший)', 'Semi-Elfo del Bosque': 'Полуэльф (лесной)',
  'Semi-Elfo Oscuro (Ni’Ssilin)': 'Полуэльф (тёмный, Ни’Сcилин)', 'Semiorco': 'Полуорк', 'Sylvari': 'Сильвари', 'Taratuga': 'Таратуга',
  'Tiefling': 'Тифлинг', 'Trol de hielo (Drakkari)': 'Ледяной тролль (Драккари)', 'Trol de la jungla (Gurubashi)': 'Тролль джунглей (Гурубаши)',
  'Trol del bosque (Amani)': 'Лесной тролль (Амани)', 'Trol lanza-negra': 'Тролль Черного Копья', 'Trol zandalari': 'Зандаларский тролль',
};
export const RU_ATRIBUTOS: Record<string, string> = { FUE: 'СИЛ', DES: 'ЛОВ', CON: 'ТЕЛ', INT: 'ИНТ', SAB: 'МДР', CAR: 'ХАР' };
export const RU_NOMBRE_ATRIBUTO: Record<string, string> = {
  Fuerza: 'Сила', Destreza: 'Ловкость', 'Constitución': 'Телосложение', Inteligencia: 'Интеллект', 'Sabiduría': 'Мудрость', Carisma: 'Харизма',
};
export const RU_HABILIDADES: Record<string, string> = {
  arcano: 'Магия', historia: 'История', investigacion: 'Анализ', medicina: 'Медицина', naturaleza: 'Природа', religion: 'Религия',
  supervivencia: 'Выживание', acrobacias: 'Акробатика', atletismo: 'Атлетика', juegoManos: 'Ловкость рук', percepcion: 'Внимательность',
  sigilo: 'Скрытность', engano: 'Обман', interpretacion: 'Выступление', intimidacion: 'Запугивание', perspicacia: 'Проницательность',
  persuasion: 'Убеждение', animales: 'Уход за животными',
};
export const RU_MONEDAS: Record<string, string> = { Mithril: 'Мифрил', Platino: 'Платина', Oro: 'Золото', Electro: 'Электрум', Plata: 'Серебро', Cobre: 'Медь' };
