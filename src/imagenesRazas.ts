import mapa from './imagenesRazas.json';

/** Ilustraciones de las razas sacadas del PDF (public/razas): la figura entera y un retrato cuadrado de la cara. */
const M = mapa as Record<string, string>;
export const imagenRaza = (raza: string) => (M[raza] ? `/razas/${M[raza]}.webp` : '');
export const retratoRaza = (raza: string) => (M[raza] ? `/razas/${M[raza]}-retrato.webp` : '');
/** ¿Es la foto uno de los retratos por defecto (se puede cambiar solo al cambiar de raza)? */
export const esRetratoRaza = (foto: string) => /^\/razas\/[a-z0-9-]+-retrato\.webp$/.test(foto);
