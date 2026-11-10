export type Atributo = 'FUE' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';
export const ATRIBUTOS: Atributo[] = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
export const NOMBRE_ATRIBUTO: Record<Atributo, string> = {
  FUE: 'Fuerza', DES: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', SAB: 'Sabiduría', CAR: 'Carisma',
};

export type Moneda = 'PM' | 'PL' | 'PO' | 'PE' | 'PP' | 'PC';
export const MONEDAS: Moneda[] = ['PM', 'PL', 'PO', 'PE', 'PP', 'PC'];

export interface Item {
  id: string;
  nombre: string;
  descripcion: string;
  /** Precio libre, p. ej. "25po". Vacío si no se conoce. */
  precio: string;
  cantidad: number;
  /** Máximo de unidades por espacio (flechas/virotes: 20). Sin valor: la pila ocupa 1 espacio. */
  maxPorEspacio?: number;
  tipo: 'pocion' | 'arma' | 'armadura' | 'escudo' | 'herramienta' | 'consumible' | 'monedas' | 'otro';
  /** Bolsa llena de monedas que sale de las bolsas de monedas al pasar de 500. */
  bolsa?: { moneda: Moneda; cantidad: number };
  /** Datos extra mostrados en la ficha del objeto (daño, CA, propiedades...). */
  detalles?: Record<string, string>;
  /** Armas a distancia: munición que lleva en el mismo espacio (máx. 20). */
  municion?: number;
}

export type RanuraEquipo = 'yelmo' | 'amuleto' | 'armadura' | 'capa' | 'manoHabil' | 'manoTorpe';
export const RANURAS_EQUIPO: { id: RanuraEquipo; nombre: string; icono: string }[] = [
  { id: 'yelmo', nombre: 'Yelmo', icono: '⛑️' },
  { id: 'amuleto', nombre: 'Amuleto', icono: '📿' },
  { id: 'armadura', nombre: 'Armadura', icono: '🛡️' },
  { id: 'capa', nombre: 'Capa', icono: '🧥' },
  { id: 'manoHabil', nombre: 'Mano hábil', icono: '🗡️' },
  { id: 'manoTorpe', nombre: 'Mano torpe', icono: '🔰' },
];

export type TamanoCinturon = 'pequeño' | 'mediano' | 'grande';

export interface EntradaTexto { nombre: string; texto: string; origen?: string }

export interface ConjuroPersonaje {
  nombre: string; nivel: number; preparado?: boolean; notas?: string;
  /** Conjuro adicional (de raza, dote, objeto…): no cuenta para el límite de la clase. */
  adicional?: boolean;
  /** Conjuro propio: copia editable del texto de un conjuro base. */
  base?: string;
  descripcion?: string;
  /** Lo puso la hoja sola por un rasgo de raza o una dote (id de la concesión en src/conjurosRasgos.ts). */
  origen?: string;
}

export interface Habilidad { comp: boolean; pericia: boolean; bonus: number }

export interface Viaje {
  raciones: number; // 0-7
  odre: number; // 0-2
  pedernal: number; // usos 0-10
  antorchas: number; // 0-10
  cuerda: '' | 'cañamo' | 'seda' | 'araña';
  ropa: '' | 'templado' | 'frio' | 'calido';
  sacoDormir: boolean;
  manta: boolean;
  tienda: string; // '' o id de tienda
}

export interface Personaje {
  id: string;
  version: 1;
  creado: string;
  actualizado: string;
  // Hoja 1
  nombre: string;
  foto: string; // data URL comprimida
  tamano: string;
  edad: string;
  raza: string;
  clase: string;
  subclase: string;
  nivel: number;
  /** PX acumulados hacia el siguiente nivel (al subir se resta lo gastado). */
  exp: number;
  trasfondoEstilo: string;
  trasfondo: string;
  personalidad: string;
  // Hoja 2
  competencias: string;
  /** Rejilla 15×15: x 0 (legal) → 14 (caótico), y 0 (bueno) → 14 (maligno). orden/moral se deducen de la casilla. */
  alineamiento: { orden: '' | 'legal' | 'neutral' | 'caotico'; moral: '' | 'bueno' | 'neutral' | 'maligno'; x?: number; y?: number };
  idiomas: Record<string, string>; // clave: 'trasfondo-0', 'INT5', 'INT10', 'INT14', 'INT17', 'INT19'
  oficios: Record<string, string>; // 'trasfondo', 'SAB5', 'SAB12', 'SAB18'
  profesiones: Record<string, string>; // 'trasfondo', 'INT5', 'INT12', 'INT18'
  // Hoja 3
  pg: { max: number; actual: number; temp: number };
  pm: { max: number; actual: number };
  /** Puntos de inspiración heroica (0-4). */
  inspiracion: number;
  dgUsados: number;
  /** Subidas de nivel cuyo dado de golpe aún no se ha tirado (al tirar se suma a los PG máximos). */
  subidasPendientes: number;
  caracteristicas: Record<Atributo, number>;
  bonusIniciativa: number;
  velocidad: { andando: number; corriendo: number; trepando: string; nadando: string; volando: string };
  /** Antiguo campo de CA a mano (ya no se usa: la CA se calcula). */
  ca: string;
  /** Ajuste a la CA calculada (anillos, Defensa sin armadura, magia…). */
  bonusCA: number;
  caV2?: boolean;
  bonusPercepcionPasiva: number;
  recursos: string;
  /** Usos gastados de cada recurso de clase (claves de src/recursos.ts); el descanso largo lo vacía. */
  recursosUsados: Record<string, number>;
  /** Descansos cortos hechos desde el último descanso largo. */
  descansosCortos: number;
  /** Recursos con usos que el jugador añade a mano (del catálogo o personalizados). */
  recursosExtra?: { id: string; es: string; ru: string; max: number; corto?: 'uno' | 'todos' }[];
  // Hoja 4
  ataquesTurno: { habil: number; torpe: number };
  ataques: { nombre: string; ataque: string; dano: string }[];
  conjuroCaracteristica: '' | Atributo;
  conjurosTurno: { estandar: string; adicional: string };
  salvaciones: Record<Atributo, { comp: boolean; bonus: number }>;
  muerte: { exitos: number; fallos: number };
  habilidades: Record<string, Habilidad>;
  /** Orden en que se marcaron competencias y pericias (las últimas, si pasan del límite, salen en rojo). */
  ordenHabilidades?: { comp: string[]; pericia: string[] };
  // Rasgos y dotes
  rasgosRaza: string[];
  /** Conjuros elegidos para los rasgos/dotes que dan a escoger (id de concesión → nombres). */
  eleccionesConjuros: Record<string, string[]>; // nombres de rasgos elegidos (únicos o genéricos)
  rasgos: EntradaTexto[]; // rasgos manuales extra
  dotes: EntradaTexto[];
  conjuros: ConjuroPersonaje[];
  // Equipo e inventario
  equipo: Record<RanuraEquipo, Item | null>;
  mochila: Item[];
  cinturon: { tamano: TamanoCinturon; items: Item[] };
  viaje: Viaje;
  monedas: Record<Moneda, number>;
  monturas: Montura[];
  notas: string;
  // Partida
  /** Estados (condiciones) activos: claves de ESTADOS en src/estados.tsx. */
  estados: string[];
  /** Duración y daño personalizado de los estados activos (ver DetallesEstados en src/estados.tsx). */
  estadosDetalle: Record<string, { dur?: number; dano?: string }>;
  /** Nivel de agotamiento 0-6. */
  agotamiento: number;
  /** Última tirada de iniciativa (para el orden del combate); null si no hay combate. */
  iniciativaActual: number | null;
  /** En partida los datos de creación (raza, clase, características, PG máx…) quedan bloqueados; el lápiz de la lista los desbloquea. */
  bloqueado: boolean;
}

/** Montura del personaje: una mini ficha con vida, CA, velocidad, características, rasgos e inventario propio. */
export interface Montura {
  id: string;
  nombre: string;
  tipo: string; // p. ej. «Caballo de guerra» (de la base de monturas cuando la tengamos)
  foto: string;
  pg: { max: number; actual: number };
  ca: string;
  velocidad: { andando: number; volando: string; nadando: string; trepando: string };
  caracteristicas: Record<Atributo, number>;
  rasgos: EntradaTexto[];
  /** Lo que lleva puesto: barda (armadura), silla, bolsas laterales… */
  equipo: Item[];
  espaciosEquipo: number;
  /** Lo que va dentro de las bolsas laterales / alforjas. */
  carga: Item[];
  espaciosCarga: number;
  notas: string;
}
