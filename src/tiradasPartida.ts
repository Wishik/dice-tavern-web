import { supabase } from './store';
import type { Tirada } from './dice';

/** Hoja propia abierta ahora: sus tiradas se apuntan en el historial de sus partidas (lo ve el máster). */
let activo: string | null = null;
export const setPersonajeActivo = (id: string | null) => { activo = id; };

export const detalleTirada = (t: Pick<Tirada, 'dados' | 'mod'>) =>
  [...t.dados.map((d) => (d.descartado ? `(${d.valor})` : String(d.valor))), t.mod ? (t.mod > 0 ? `+${t.mod}` : String(t.mod)) : ''].filter(Boolean).join(' ');

export function registrarTirada(t: Tirada) {
  if (!activo || !supabase) return;
  supabase.rpc('registrar_tirada', { pj: activo, etiqueta: t.etiqueta, formula: t.formula, total: t.total, detalle: detalleTirada(t), modo: t.modo, critico: t.critico ?? null })
    .then(() => {}, () => {});
}

export interface TiradaPartida { id: number; personaje?: string | null; quien: string; etiqueta: string; formula: string; total: number; detalle: string; modo: string; critico: string | null; creada: string }

export async function tiradasPartida(partida: string): Promise<TiradaPartida[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('tiradas').select('id,personaje,quien,etiqueta,formula,total,detalle,modo,critico,creada').eq('partida', partida).order('creada', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return data as TiradaPartida[];
}
