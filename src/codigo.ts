import { L } from './i18n';

/* Texto corto para copiar o meter en un QR: prefijo + base64url(deflate(JSON)). */
const b64u = (u8: Uint8Array) => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64u = (t: string) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
const pasar = async (u8: Uint8Array, t: TransformStream<Uint8Array, Uint8Array>) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(t)).arrayBuffer());

/** `prefijo` de 2 letras (p. ej. «DO» para objetos): el código empieza por «DO1» (comprimido) o «DO0». */
export async function codificar(datos: unknown, prefijo: string): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(datos));
  if (typeof CompressionStream !== 'undefined') return prefijo + '1' + b64u(await pasar(json, new CompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>));
  return prefijo + '0' + b64u(json);
}
export async function decodificar<T>(texto: string, prefijo: string, param?: string): Promise<T> {
  let t = texto.trim();
  if (param) { try { const u = new URL(t); t = u.searchParams.get(param) ?? t; } catch { /* no es un enlace */ } }
  const malo = new Error(L('Ese código no es válido.', 'Этот код неверный.'));
  const pref = t.slice(0, 3);
  let bytes: Uint8Array;
  try { bytes = deB64u(t.slice(3)); } catch { throw malo; }
  if (pref === prefijo + '1') bytes = await pasar(bytes, new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>).catch(() => { throw malo; });
  else if (pref !== prefijo + '0') throw malo;
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; } catch { throw malo; }
}
