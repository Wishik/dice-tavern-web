import { nivelEn, nivelTotal } from './multiclase';
import type { Conjuro, Razas } from './data';
import type { ConjuroPersonaje, Personaje } from './types';
import { bonoCompetencia } from './rules';
import { esMejorable } from './conjurosMejorados';

/**
 * Conjuros que dan los rasgos de raza y las dotes del manual.
 * Se añaden solos a «Conjuros adicionales» (no cuentan para el límite de la clase) al llegar al nivel indicado;
 * cuando hay que elegir, la hoja lo pide en la pestaña de conjuros.
 */
export interface Eleccion {
  cantidad: number;
  /** Lista cerrada de conjuros entre los que elegir… */
  de?: string[];
  /** …o un filtro sobre la lista de conjuros. */
  nivelConjuro?: number;
  clases?: string[];
  escuelas?: string[];
  /** Solo conjuros que se pueden lanzar como ritual. */
  ritual?: boolean;
  /** La cantidad es el bonificador por competencia (sube con el nivel). */
  porBC?: boolean;
}
/** Cuántos conjuros se eligen ahora. */
export const cantidadEleccion = (e: Eleccion, p: Personaje) => (e.porBC ? bonoCompetencia(nivelTotal(p)) : e.cantidad);
export interface Concesion { id: string; nivel: number; conjuros?: string[]; elegir?: Eleccion }
export interface Fuente { rasgo: string; razas?: string[]; dote?: boolean; /** Conjuros de subclase: se cuentan por el nivel en esa clase. */ clase?: string; subclase?: string; /** Círculo de la tierra: solo el terreno elegido (p.elecciones['Druida:terreno']). */ terreno?: string; /** Invocación sobrenatural elegida (p.elecciones['Brujo:invocaciones']). */ invocacion?: boolean; concesiones: Concesion[] }

const TROLES = ['Trol de hielo (Drakkari)', 'Trol de la jungla (Gurubashi)', 'Trol del bosque (Amani)', 'Trol lanza-negra', 'Trol zandalari'];
const tiefling = (rasgo: string, truco: string, n3: string, n5: string): Fuente => ({
  rasgo, razas: ['Tiefling'], concesiones: [
    { id: `${rasgo}:1`, nivel: 1, conjuros: [truco] }, { id: `${rasgo}:3`, nivel: 3, conjuros: [n3] }, { id: `${rasgo}:5`, nivel: 5, conjuros: [n5] },
  ],
});

const inv = (rasgo: string, conjuro: string): Fuente => ({ rasgo, invocacion: true, concesiones: [{ id: `invocacion:${rasgo}`, nivel: 1, conjuros: [conjuro] }] });
export const FUENTES: Fuente[] = [
  inv('Armadura de sombras', 'Armadura de mago'), inv('Don de las profundidades', 'Respirar bajo el agua'), inv('Maestro de las formas innumerables', 'Alterar el propio aspecto'),
  inv('Mascara de los mil rostros', 'Disfrazarse'), inv('Paso ascendente', 'Levitar'), inv('Salto sobrenatural', 'Salto'), inv('Susurros del sepulcro', 'Hablar con los muertos'),
  inv('Uno con la sombra', 'Invisibilidad'), inv('Vigor infernal', 'Falsa vida'), inv('Visiones brumosas', 'Imagen silenciosa'), inv('Visiones de reinos remotos', 'Ojo arcano'),
  inv('Pacto de la cadena', 'Encontrar familiar'),
  { rasgo: 'Pacto del grimorio', invocacion: true, concesiones: [
    { id: 'invocacion:grimorio:trucos', nivel: 1, elegir: { cantidad: 3, nivelConjuro: 0 } },
    { id: 'invocacion:grimorio:rituales', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 1, ritual: true } }] },
  { rasgo: 'Portador de Luz', razas: ['Aasimar'], concesiones: [{ id: 'aasimar:1', nivel: 1, conjuros: ['Luz'] }, { id: 'aasimar:5', nivel: 5, conjuros: ['Luz del día'] }] },
  { rasgo: 'Llamar al viento', razas: ['Avianthar'], concesiones: [{ id: 'avianthar:1', nivel: 1, conjuros: ['Ráfaga de viento'] }] },
  { rasgo: 'Magia del Bosque', razas: ['Elfos de los Bosques'], concesiones: [{ id: 'elfoBosque:1', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 0, clases: ['druida'] } }] },
  { rasgo: 'Magia del Bosque', razas: ['Semi-Elfo del Bosque'], concesiones: [{ id: 'semielfoBosque:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 0, clases: ['druida'] } }] },
  { rasgo: 'Magia Drow', razas: ['Elfo Oscuro (Drow)'], concesiones: [
    { id: 'drow:1', nivel: 1, conjuros: ['Luces danzantes'] },
    { id: 'drow:1b', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 0, clases: ['mago', 'brujo'] } },
    { id: 'drow:3', nivel: 3, conjuros: ['Fuego feérico'] }, { id: 'drow:5', nivel: 5, conjuros: ['Oscuridad'] },
  ] },
  { rasgo: 'Magia Drow', razas: ['Semi-Elfo Oscuro (Ni’Ssilin)'], concesiones: [{ id: 'nissilin:1', nivel: 1, conjuros: ['Luces danzantes'] }, { id: 'nissilin:3', nivel: 3, conjuros: ['Fuego feérico'] }] },
  { rasgo: 'Magia Duergar', razas: ['Enanos Grises (Duergar)'], concesiones: [{ id: 'duergar:1', nivel: 1, conjuros: ['Agrandar/Reducir'] }, { id: 'duergar:3', nivel: 3, conjuros: ['Invisibilidad'] }] },
  { rasgo: 'Poder Psiónico Gith', razas: ['Githyanki'], concesiones: [
    { id: 'gith:1', nivel: 1, conjuros: ['Mano de mago'] },
    { id: 'gith:3', nivel: 3, elegir: { cantidad: 1, de: ['Salto', 'Escudo'] } },
    { id: 'gith:5', nivel: 5, elegir: { cantidad: 1, de: ['Paso brumoso', 'Detectar pensamientos'] } },
  ] },
  { rasgo: 'Magia Gnomica', razas: ['Gnomo'], concesiones: [{ id: 'gnomo:1', nivel: 1, elegir: { cantidad: 1, de: ['Detectar magia', 'Dormir', 'Escudo', 'Ola atronadora', 'Proyectil mágico'] } }] },
  { rasgo: 'Afinidad Mágica', razas: ['Gnomos Grises (Svirfneblin)'], concesiones: [{ id: 'svirfneblin:1', nivel: 1, elegir: { cantidad: 1, de: ['Imagen silenciosa', 'Armadura de mago', 'Hechizar persona', 'Orbe cromático', 'Risa horrible de Tasha'] } }] },
  { rasgo: 'Llamas Azules', razas: ['Kitsune'], concesiones: [{ id: 'kitsuneLlama:1', nivel: 1, conjuros: ['Crear llama'] }] },
  { rasgo: 'Magia Kitsune', razas: ['Kitsune'], concesiones: [{ id: 'kitsune:1', nivel: 1, conjuros: ['Prestidigitación'] }, { id: 'kitsune:3', nivel: 3, conjuros: ['Hechizar persona'] }, { id: 'kitsune:5', nivel: 5, conjuros: ['Imagen múltiple'] }] },
  { rasgo: 'Magia Sylvari', razas: ['Sylvari'], concesiones: [
    { id: 'sylvari:1', nivel: 1, conjuros: ['Látigo de espinas'] }, { id: 'sylvari:3', nivel: 3, conjuros: ['Enmarañar'] },
    { id: 'sylvari:5', nivel: 5, elegir: { cantidad: 1, de: ['Crecimiento espinoso', 'Espíritu sanador'] } },
  ] },
  tiefling('Legado de Baalzebul', 'Taumaturgia', 'Rayo debilitador', 'Corona de la locura'),
  tiefling('Legado de Levistus', 'Rayo de escarcha', 'Armadura de Agathys', 'Oscuridad'),
  tiefling('Legado de Mammon', 'Mano de mago', 'Disco flotante de Tenser', 'Cerradura arcana'),
  tiefling('Legado de Mefistófeles', 'Mano de mago', 'Manos ardientes', 'Hoja de fuego'),
  tiefling('Legado de Zariel', 'Taumaturgia', 'Castigo abrasador', 'Castigo brillante'),
  tiefling('Legado de Maladomini', 'Burla dañina', 'Hechizar persona', 'Embelesar'),
  tiefling('Legado de Dispater', 'Taumaturgia', 'Disfrazarse', 'Detectar pensamientos'),
  tiefling('Legado de Phlegethos', 'Amistad', 'Hechizar persona', 'Sugestión'),
  tiefling('Legado de Malebolgia', 'Ilusión menor', 'Disfrazarse', 'Invisibilidad'),
  { rasgo: 'Pacto con los Loa', razas: TROLES, concesiones: [{ id: 'loa:1', nivel: 1, conjuros: ['Taumaturgia'] }, { id: 'loa:3', nivel: 3, conjuros: ['Protección contra el bien y el mal'] }, { id: 'loa:5', nivel: 5, conjuros: ['Auxilio'] }] },
  { rasgo: 'Aléjate del vudú', razas: ['Trol lanza-negra'], concesiones: [
    { id: 'vudu:1', nivel: 1, elegir: { cantidad: 1, de: ['Fragmento mental', 'Tañido por los muertos'] } },
    { id: 'vudu:3', nivel: 3, elegir: { cantidad: 1, de: ['Maleficio', 'Perdición'] } },
    { id: 'vudu:5', nivel: 5, elegir: { cantidad: 1, de: ['Clavo mental', 'Corona de la locura', 'Sugestión'] } },
  ] },
  { rasgo: 'Bendición de los Loa', razas: ['Trol zandalari'], concesiones: [{ id: 'zandalari:1', nivel: 1, conjuros: ['Bendición'] }] },
  { rasgo: 'Vampiro', concesiones: [{ id: 'vampiro:1', nivel: 1, conjuros: ['Hechizar persona'] }] },
  // Subclases: «siempre conocidos, no cuentan para el límite» (tablas de clases.json).
  { rasgo: "Conjuros del filo maléfico", clase: 'Brujo', subclase: "Filo maléfico", concesiones: [{ id: 'sub:filo-malefico:3', nivel: 3, conjuros: ["Vigor arcano", "Maleficio", "Arma mágica", "Escudo", "Castigo furioso"] }, { id: 'sub:filo-malefico:5', nivel: 5, conjuros: ["Conjurar descarga de proyectiles", "Disipar magia"] }, { id: 'sub:filo-malefico:7', nivel: 7, conjuros: ["Libertad de movimiento", "Castigo abrumador"] }, { id: 'sub:filo-malefico:9', nivel: 9, conjuros: ["Animar objetos", "Golpe de viento acerado"] }] },
  { rasgo: "Conjuros del celestial", clase: 'Brujo', subclase: "Patrón celestial", concesiones: [{ id: 'sub:patron-celestial:3', nivel: 3, conjuros: ["Auxilio", "Curar heridas", "Llama sagrada", "Luz", "Restablecimiento menor", "Saeta guía"] }, { id: 'sub:patron-celestial:5', nivel: 5, conjuros: ["Luz del día", "Revivir"] }, { id: 'sub:patron-celestial:7', nivel: 7, conjuros: ["Guardián de la fe", "Muro de fuego"] }, { id: 'sub:patron-celestial:9', nivel: 9, conjuros: ["Invocar celestial", "Restablecimiento mayor"] }] },
  { rasgo: "Conjuros del señor feérico", clase: 'Brujo', subclase: "Patrón feérico", concesiones: [{ id: 'sub:patron-feerico:3', nivel: 3, conjuros: ["Calmar emociones", "Dormir", "Fuego feérico", "Fuerza fantasmal", "Paso brumoso"] }, { id: 'sub:patron-feerico:5', nivel: 5, conjuros: ["Crecimiento vegetal", "Desplazamiento"] }, { id: 'sub:patron-feerico:7', nivel: 7, conjuros: ["Dominar bestia", "Invisibilidad mejorada"] }, { id: 'sub:patron-feerico:9', nivel: 9, conjuros: ["Apariencia", "Dominar persona"] }] },
  { rasgo: "Conjuros del infernal", clase: 'Brujo', subclase: "Patrón infernal", concesiones: [{ id: 'sub:patron-infernal:3', nivel: 3, conjuros: ["Manos ardientes", "Orden imperiosa", "Rayo abrasador", "Sugestión"] }, { id: 'sub:patron-infernal:5', nivel: 5, conjuros: ["Bola de fuego", "Nube apestosa"] }, { id: 'sub:patron-infernal:7', nivel: 7, conjuros: ["Escudo de fuego", "Muro de fuego"] }, { id: 'sub:patron-infernal:9', nivel: 9, conjuros: ["Geas", "Plaga de insectos"] }] },
  { rasgo: "Conjuros del primigenio", clase: 'Brujo', subclase: "Patrón primigenio", concesiones: [{ id: 'sub:patron-primigenio:3', nivel: 3, conjuros: ["Detectar pensamientos", "Fuerza fantasmal", "Risa horrible de Tasha", "Susurros discordantes"] }, { id: 'sub:patron-primigenio:5', nivel: 5, conjuros: ["Clarividencia", "Hambre de Hadar"] }, { id: 'sub:patron-primigenio:7', nivel: 7, conjuros: ["Confusión", "Invocar aberración"] }, { id: 'sub:patron-primigenio:9', nivel: 9, conjuros: ["Alterar los recuerdos", "Telequinesis"] }] },
  { rasgo: "Conjuros del dominio de la guerra", clase: 'Clérigo', subclase: "Dominio de la guerra", concesiones: [{ id: 'sub:dominio-de-la-guerra:3', nivel: 3, conjuros: ["Arma espiritual", "Arma mágica", "Escudo de fe", "Saeta guía"] }, { id: 'sub:dominio-de-la-guerra:5', nivel: 5, conjuros: ["Espíritus guardianes", "Manto del cruzado"] }, { id: 'sub:dominio-de-la-guerra:7', nivel: 7, conjuros: ["Escudo de fuego", "Libertad de movimiento"] }, { id: 'sub:dominio-de-la-guerra:9', nivel: 9, conjuros: ["Golpe de viento acerado", "Inmovilizar monstruo"] }] },
  { rasgo: "Conjuros del dominio de la luz", clase: 'Clérigo', subclase: "Dominio de la luz", concesiones: [{ id: 'sub:dominio-de-la-luz:3', nivel: 3, conjuros: ["Fuego feérico", "Manos ardientes", "Rayo abrasador", "Ver invisibilidad"] }, { id: 'sub:dominio-de-la-luz:5', nivel: 5, conjuros: ["Bola de fuego", "Luz del día"] }, { id: 'sub:dominio-de-la-luz:7', nivel: 7, conjuros: ["Muro de fuego", "Ojo arcano"] }, { id: 'sub:dominio-de-la-luz:9', nivel: 9, conjuros: ["Escudriñar", "Golpe flamígero"] }] },
  { rasgo: "Conjuros del dominio de la vida", clase: 'Clérigo', subclase: "Dominio de la vida", concesiones: [{ id: 'sub:dominio-de-la-vida:3', nivel: 3, conjuros: ["Auxilio", "Bendición", "Curar heridas", "Restablecimiento menor"] }, { id: 'sub:dominio-de-la-vida:5', nivel: 5, conjuros: ["Palabra de curación en masa", "Revivir"] }, { id: 'sub:dominio-de-la-vida:7', nivel: 7, conjuros: ["Aura de vida", "Guarda contra la muerte"] }, { id: 'sub:dominio-de-la-vida:9', nivel: 9, conjuros: ["Curar heridas en masa", "Restablecimiento mayor"] }] },
  { rasgo: "Conjuros del dominio del engaño", clase: 'Clérigo', subclase: "Dominio del engaño", concesiones: [{ id: 'sub:dominio-del-engano:3', nivel: 3, conjuros: ["Disfrazarse", "Hechizar persona", "Invisibilidad", "Pasar sin rastro"] }, { id: 'sub:dominio-del-engano:5', nivel: 5, conjuros: ["Indetectable", "Patrón hipnótico"] }, { id: 'sub:dominio-del-engano:7', nivel: 7, conjuros: ["Confusión", "Puerta dimensional"] }, { id: 'sub:dominio-del-engano:9', nivel: 9, conjuros: ["Alterar los recuerdos", "Dominar persona"] }] },
  { rasgo: "Conjuros del círculo de la luna", clase: 'Druida', subclase: "Círculo de la luna", concesiones: [{ id: 'sub:circulo-de-la-luna:3', nivel: 3, conjuros: ["Curar heridas", "Rayo de luna", "Voluta estelar"] }, { id: 'sub:circulo-de-la-luna:5', nivel: 5, conjuros: ["Conjurar animales"] }, { id: 'sub:circulo-de-la-luna:7', nivel: 7, conjuros: ["Fuente de luz lunar"] }, { id: 'sub:circulo-de-la-luna:9', nivel: 9, conjuros: ["Curar heridas en masa"] }] },
  { rasgo: "Conjuros del círculo de la tierra", clase: 'Druida', subclase: "Círculo de la tierra", terreno: 'árido', concesiones: [{ id: 'sub:circulo-de-la-tierra:árido:3', nivel: 3, conjuros: ["Contorno borroso", "Descarga de fuego", "Manos ardientes"] }, { id: 'sub:circulo-de-la-tierra:árido:5', nivel: 5, conjuros: ["Bola de fuego"] }, { id: 'sub:circulo-de-la-tierra:árido:7', nivel: 7, conjuros: ["Marchitar"] }, { id: 'sub:circulo-de-la-tierra:árido:9', nivel: 9, conjuros: ["Muro de piedra"] }] },
  { rasgo: "Conjuros del círculo de la tierra", clase: 'Druida', subclase: "Círculo de la tierra", terreno: 'polar', concesiones: [{ id: 'sub:circulo-de-la-tierra:polar:3', nivel: 3, conjuros: ["Inmovilizar persona", "Nube de oscurecimiento", "Rayo de escarcha"] }, { id: 'sub:circulo-de-la-tierra:polar:5', nivel: 5, conjuros: ["Tormenta de aguanieve"] }, { id: 'sub:circulo-de-la-tierra:polar:7', nivel: 7, conjuros: ["Tormenta de hielo"] }, { id: 'sub:circulo-de-la-tierra:polar:9', nivel: 9, conjuros: ["Cono de frío"] }] },
  { rasgo: "Conjuros del círculo de la tierra", clase: 'Druida', subclase: "Círculo de la tierra", terreno: 'templado', concesiones: [{ id: 'sub:circulo-de-la-tierra:templado:3', nivel: 3, conjuros: ["Agarre electrizante", "Dormir", "Paso brumoso"] }, { id: 'sub:circulo-de-la-tierra:templado:5', nivel: 5, conjuros: ["Relámpago"] }, { id: 'sub:circulo-de-la-tierra:templado:7', nivel: 7, conjuros: ["Libertad de movimiento"] }, { id: 'sub:circulo-de-la-tierra:templado:9', nivel: 9, conjuros: ["Paso arbóreo"] }] },
  { rasgo: "Conjuros del círculo de la tierra", clase: 'Druida', subclase: "Círculo de la tierra", terreno: 'tropical', concesiones: [{ id: 'sub:circulo-de-la-tierra:tropical:3', nivel: 3, conjuros: ["Rayo nauseabundo", "Salpicadura ácida", "Telaraña"] }, { id: 'sub:circulo-de-la-tierra:tropical:5', nivel: 5, conjuros: ["Nube apestosa"] }, { id: 'sub:circulo-de-la-tierra:tropical:7', nivel: 7, conjuros: ["Polimorfar"] }, { id: 'sub:circulo-de-la-tierra:tropical:9', nivel: 9, conjuros: ["Plaga de insectos"] }] },
  { rasgo: "Conjuros del círculo del mar", clase: 'Druida', subclase: "Círculo del mar", concesiones: [{ id: 'sub:circulo-del-mar:3', nivel: 3, conjuros: ["Hacer añicos", "Nube de oscurecimiento", "Ola atronadora", "Ráfaga de viento", "Rayo de escarcha"] }, { id: 'sub:circulo-del-mar:5', nivel: 5, conjuros: ["Relámpago", "Respirar bajo el agua"] }, { id: 'sub:circulo-del-mar:7', nivel: 7, conjuros: ["Controlar agua", "Tormenta de hielo"] }, { id: 'sub:circulo-del-mar:9', nivel: 9, conjuros: ["Conjurar elemental", "Inmovilizar monstruo"] }] },
  { rasgo: "Conjuros de acechador en la penumbra", clase: 'Explorador', subclase: "Acechador en la penumbra", concesiones: [{ id: 'sub:acechador-en-la-penumbra:3', nivel: 3, conjuros: ["Disfrazarse"] }, { id: 'sub:acechador-en-la-penumbra:5', nivel: 5, conjuros: ["Truco de la cuerda"] }, { id: 'sub:acechador-en-la-penumbra:9', nivel: 9, conjuros: ["Terror"] }, { id: 'sub:acechador-en-la-penumbra:13', nivel: 13, conjuros: ["Invisibilidad mejorada"] }, { id: 'sub:acechador-en-la-penumbra:17', nivel: 17, conjuros: ["Apariencia"] }] },
  { rasgo: "Conjuros de errante feérico", clase: 'Explorador', subclase: "Errante feérico", concesiones: [{ id: 'sub:errante-feerico:3', nivel: 3, conjuros: ["Hechizar persona"] }, { id: 'sub:errante-feerico:5', nivel: 5, conjuros: ["Paso brumoso"] }, { id: 'sub:errante-feerico:9', nivel: 9, conjuros: ["Invocar feérico"] }, { id: 'sub:errante-feerico:13', nivel: 13, conjuros: ["Puerta dimensional"] }, { id: 'sub:errante-feerico:17', nivel: 17, conjuros: ["Engañar"] }] },
  { rasgo: "Conjuros del juramento de entrega", clase: 'Paladín', subclase: "Juramento de entrega", concesiones: [{ id: 'sub:juramento-de-entrega:3', nivel: 3, conjuros: ["Escudo de fe", "Protección contra el bien y el mal"] }, { id: 'sub:juramento-de-entrega:5', nivel: 5, conjuros: ["Auxilio", "Zona de la verdad"] }, { id: 'sub:juramento-de-entrega:9', nivel: 9, conjuros: ["Disipar magia", "Señal de esperanza"] }, { id: 'sub:juramento-de-entrega:13', nivel: 13, conjuros: ["Guardián de la fe", "Libertad de movimiento"] }, { id: 'sub:juramento-de-entrega:17', nivel: 17, conjuros: ["Comunión", "Golpe flamígero"] }] },
  { rasgo: "Conjuros del juramento de gloria", clase: 'Paladín', subclase: "Juramento de gloria", concesiones: [{ id: 'sub:juramento-de-gloria:3', nivel: 3, conjuros: ["Heroísmo", "Saeta guía"] }, { id: 'sub:juramento-de-gloria:5', nivel: 5, conjuros: ["Arma mágica", "Potenciar característica"] }, { id: 'sub:juramento-de-gloria:9', nivel: 9, conjuros: ["Acelerar", "Protección contra energía"] }, { id: 'sub:juramento-de-gloria:13', nivel: 13, conjuros: ["Compulsión", "Libertad de movimiento"] }, { id: 'sub:juramento-de-gloria:17', nivel: 17, conjuros: ["Conocer las leyendas", "Presencia regia de Yolande"] }] },
  { rasgo: "Conjuros del juramento de los antiguos", clase: 'Paladín', subclase: "Juramento de los antiguos", concesiones: [{ id: 'sub:juramento-de-los-antiguos:3', nivel: 3, conjuros: ["Golpe apresador", "Hablar con los animales"] }, { id: 'sub:juramento-de-los-antiguos:5', nivel: 5, conjuros: ["Paso brumoso", "Rayo de luna"] }, { id: 'sub:juramento-de-los-antiguos:9', nivel: 9, conjuros: ["Crecimiento vegetal", "Protección contra energía"] }, { id: 'sub:juramento-de-los-antiguos:13', nivel: 13, conjuros: ["Piel pétrea", "Tormenta de hielo"] }, { id: 'sub:juramento-de-los-antiguos:17', nivel: 17, conjuros: ["Comunión con la naturaleza", "Paso arbóreo"] }] },
  { rasgo: "Conjuros del juramento de venganza", clase: 'Paladín', subclase: "Juramento de venganza", concesiones: [{ id: 'sub:juramento-de-venganza:3', nivel: 3, conjuros: ["Marca del cazador", "Perdición"] }, { id: 'sub:juramento-de-venganza:5', nivel: 5, conjuros: ["Inmovilizar persona", "Paso brumoso"] }, { id: 'sub:juramento-de-venganza:9', nivel: 9, conjuros: ["Acelerar", "Protección contra energía"] }, { id: 'sub:juramento-de-venganza:13', nivel: 13, conjuros: ["Destierro", "Puerta dimensional"] }, { id: 'sub:juramento-de-venganza:17', nivel: 17, conjuros: ["Escudriñar", "Inmovilizar monstruo"] }] },
  // Dotes
  { rasgo: 'Iniciado en la magia', dote: true, concesiones: [
    { id: 'iniciado:trucos', nivel: 1, elegir: { cantidad: 2, nivelConjuro: 0, clases: ['clérigo', 'druida', 'mago'] } },
    { id: 'iniciado:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, clases: ['clérigo', 'druida', 'mago'] } },
  ] },
  { rasgo: 'Influencia feérica', dote: true, concesiones: [
    { id: 'feerica:fijo', nivel: 1, conjuros: ['Paso brumoso'] },
    { id: 'feerica:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, escuelas: ['adivinación', 'encantamiento'] } },
  ] },
  { rasgo: 'Influencia sombría', dote: true, concesiones: [
    { id: 'sombria:fijo', nivel: 1, conjuros: ['Invisibilidad'] },
    { id: 'sombria:1', nivel: 1, elegir: { cantidad: 1, nivelConjuro: 1, escuelas: ['ilusionismo', 'nigromancia'] } },
  ] },
  { rasgo: 'Lanzador ritual', dote: true, concesiones: [{ id: 'ritual', nivel: 1, elegir: { cantidad: 2, porBC: true, nivelConjuro: 1, ritual: true } }] },
  { rasgo: 'Telepático', dote: true, concesiones: [{ id: 'telepatico', nivel: 1, conjuros: ['Detectar pensamientos'] }] },
  { rasgo: 'Telequinético', dote: true, concesiones: [{ id: 'telequinetico', nivel: 1, conjuros: ['Mano de mago'] }] },
];

/** Conjuros que no están en la lista del manual: nivel para poder añadirlos igualmente. */
const SIN_DATOS: Record<string, number> = { 'Espíritu sanador': 2 };

const igual = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;

/** ¿El personaje tiene activo este rasgo o dote? Los rasgos fijos de la raza cuentan siempre; los demás, si los eligió. */
export const subclaseEn = (p: Personaje, clase: string) => (p.clase === clase ? p.subclase : p.multiclase?.find((m) => m.clase === clase)?.subclase) ?? '';
export const TERRENOS = ['árido', 'polar', 'templado', 'tropical'];
export function fuenteActiva(f: Fuente, p: Personaje, razas: Razas | null): boolean {
  if (f.subclase) return nivelEn(p, f.clase!) > 0 && igual(subclaseEn(p, f.clase!), f.subclase) && (!f.terreno || p.elecciones?.['Druida:terreno']?.[0] === f.terreno);
  if (f.invocacion) return nivelEn(p, 'Brujo') > 0 && (p.elecciones?.['Brujo:invocaciones'] ?? []).some((n) => igual(n, f.rasgo));
  if (f.dote) return (p.dotes ?? []).some((d) => igual(d.nombre, f.rasgo));
  if (f.razas && !f.razas.includes(p.raza)) return false;
  if ((p.rasgosRaza ?? []).some((r) => igual(r, f.rasgo))) return true;
  const raza = razas?.razas.find((r) => r.nombre === p.raza);
  return !!raza?.rasgosFijos.some((r) => igual(r.nombre, f.rasgo));
}

/** Concesiones que ya le tocan al personaje (fuente activa y nivel alcanzado). */
export function concesionesActivas(p: Personaje, razas: Razas | null): (Concesion & { fuente: Fuente })[] {
  return FUENTES.filter((f) => fuenteActiva(f, p, razas)).flatMap((f) => f.concesiones.filter((c) => (f.clase ? nivelEn(p, f.clase) : p.nivel) >= c.nivel).map((c) => ({ ...c, fuente: f })));
}

/** Elecciones pendientes (hay que escoger conjuro). */
export function eleccionesPendientes(p: Personaje, razas: Razas | null) {
  return concesionesActivas(p, razas).filter((c) => c.elegir && (p.eleccionesConjuros?.[c.id]?.length ?? 0) < cantidadEleccion(c.elegir, p));
}

/** Opciones posibles para una elección. */
export function opcionesEleccion(e: Eleccion, todos: Conjuro[]): { nombre: string; nivel: number }[] {
  if (e.de) return e.de.map((n) => { const c = todos.find((x) => igual(x.nombre, n)); return { nombre: c?.nombre ?? n, nivel: c?.nivel ?? SIN_DATOS[n] ?? 1 }; });
  return todos.filter((c) => (e.nivelConjuro === undefined || c.nivel === e.nivelConjuro)
    && (!e.clases || e.clases.some((k) => c.clases.includes(k)))
    && (!e.escuelas || e.escuelas.includes(c.escuela))
    && (!e.ritual || /ritual/i.test(c.tiempo)))
    .map((c) => ({ nombre: c.nombre, nivel: c.nivel })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Pone en la lista de conjuros los que dan raza y dotes (como adicionales, con su `origen`)
 * y quita los que ya no tocan (rasgo o dote quitados, elección cambiada). Devuelve true si ha cambiado algo.
 */
export function sincronizarConjuros(x: Personaje, razas: Razas | null, todos: Conjuro[]): boolean {
  const deseados: { nombre: string; nivel: number; origen: string }[] = [];
  for (const c of concesionesActivas(x, razas)) {
    const nombres = c.conjuros ?? (x.eleccionesConjuros?.[c.id] ?? []).slice(0, cantidadEleccion(c.elegir!, x));
    for (const n of nombres) {
      const d = todos.find((s) => igual(s.nombre, n));
      deseados.push({ nombre: d?.nombre ?? n, nivel: d?.nivel ?? SIN_DATOS[n] ?? 1, origen: c.id });
    }
  }
  let cambia = false;
  // Fuera los que ya no tocan.
  const antes = x.conjuros.length;
  x.conjuros = x.conjuros.filter((c) => !c.origen || deseados.some((d) => d.origen === c.origen && igual(d.nombre, c.nombre)));
  if (x.conjuros.length !== antes) cambia = true;
  for (const d of deseados) {
    if (x.conjuros.some((c) => c.origen === d.origen && igual(c.nombre, d.nombre))) continue;
    // Si ya lo tenía puesto a mano, se pasa a adicionales (así deja libre el hueco de la clase).
    // Los mejorables (Bola de fuego) no se fusionan: la copia nueva lo convierte en «Bola de fuego +».
    const yaEsta = esMejorable(d.nombre) ? undefined : x.conjuros.find((c) => !c.origen && igual(c.nombre, d.nombre));
    if (yaEsta) { yaEsta.adicional = true; yaEsta.origen = d.origen; yaEsta.preparado = undefined; }
    else x.conjuros.push({ nombre: d.nombre, nivel: d.nivel, adicional: true, origen: d.origen } as ConjuroPersonaje);
    cambia = true;
  }
  return cambia;
}
