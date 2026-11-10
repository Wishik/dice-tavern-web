import { useCallback, useEffect, useState } from 'react';
import { supabase } from './store';
import type { Item } from './types';
import { L, T, RU_MONEDAS } from './i18n';
import { NOMBRE_MONEDA } from './rules';
import { td } from './datosRu';

/** Botín del máster: lo que roba a los jugadores, guardado en su cuenta para dárselo luego a otro. */
export async function cargarBotin(): Promise<Item[]> {
  if (!supabase) return [];
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id; if (!uid) return [];
  const { data, error } = await supabase.from('botin').select('items').eq('usuario', uid).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.items as Item[] | undefined) ?? [];
}

export async function guardarBotin(items: Item[]) {
  if (!supabase) throw new Error(L('El botín necesita una cuenta.', 'Для добычи нужен аккаунт.'));
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id; if (!uid) return;
  const { error } = await supabase.from('botin').upsert({ usuario: uid, items, actualizado: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Cambia el botín leyendo antes la última versión (por si se tocó desde otra pantalla). */
export async function cambiarBotin(f: (items: Item[]) => Item[]) {
  const items = f(await cargarBotin());
  await guardarBotin(items);
  return items;
}

export function useBotin(activo = true) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => { if (activo) cargarBotin().then((x) => { setItems(x); setError(''); }).catch((e) => setError(e.message)); }, [activo]);
  useEffect(() => { recargar(); }, [recargar]);
  const cambiar = useCallback(async (f: (items: Item[]) => Item[]) => {
    try { setItems(await cambiarBotin(f)); setError(''); return true; } catch (e) { alert((e as Error).message); return false; }
  }, []);
  return { items, error, recargar, cambiar };
}

/** Nombre para mostrar en el botín: las monedas salen como bolsita con la cantidad. */
export function nombreBotin(it: Item): string {
  if (it.bolsa) return `💰 ${L(`Bolsa de ${NOMBRE_MONEDA[it.bolsa.moneda].toLowerCase()}`, `Мешочек: ${T(RU_MONEDAS, NOMBRE_MONEDA[it.bolsa.moneda]).toLowerCase()}`)} (${it.bolsa.cantidad} ${it.bolsa.moneda})`;
  return `${td(it.nombre)}${it.cantidad > 1 ? ` ×${it.cantidad}` : ''}`;
}
