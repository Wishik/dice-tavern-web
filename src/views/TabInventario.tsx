import { useEffect, useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Etiqueta, ListaDatos, Modal, Numero, Seccion, Texto, TextoLargo } from '../ui';
import { cargarObjetos, type ObjetoBase } from '../data';
import {
  CINTURON_ESPACIOS, MAX_MONEDAS, MOCHILA_BASE, NOMBRE_MONEDA, TRAMOS_SOBRECARGA, UMBRALES_FUERZA, VALOR_PC,
  convertir, embolsarExceso, espaciosItem, espaciosPorFuerza, espaciosUsados, estadoCarga, leerPrecio, uid,
} from '../rules';
import { MONEDAS, RANURAS_EQUIPO, type Item, type Moneda, type Personaje, type RanuraEquipo, type TamanoCinturon } from '../types';

type Lugar = { zona: 'mochila' | 'cinturon'; i: number } | { zona: 'equipo'; r: RanuraEquipo };
type Destino = { zona: 'mochila' | 'cinturon' } | { zona: 'equipo'; r: RanuraEquipo };

function leer(p: Personaje, l: Lugar): Item | null {
  if (l.zona === 'equipo') return p.equipo[l.r];
  return (l.zona === 'mochila' ? p.mochila : p.cinturon.items)[l.i] ?? null;
}
function quitar(p: Personaje, l: Lugar): Item | null {
  if (l.zona === 'equipo') { const it = p.equipo[l.r]; p.equipo[l.r] = null; return it; }
  const arr = l.zona === 'mochila' ? p.mochila : p.cinturon.items;
  return arr.splice(l.i, 1)[0] ?? null;
}
function poner(p: Personaje, it: Item, d: Destino) {
  if (d.zona === 'equipo') { const prev = p.equipo[d.r]; if (prev) p.mochila.push(prev); p.equipo[d.r] = it; }
  else (d.zona === 'mochila' ? p.mochila : p.cinturon.items).push(it);
}

export function TabInventario() {
  const { p, upd } = useFicha();
  const [abierto, setAbierto] = useState<Lugar | null>(null);
  const [anadir, setAnadir] = useState<Destino | null>(null);
  const carga = estadoCarga(p);
  const capCint = CINTURON_ESPACIOS[p.cinturon.tamano];
  const usadosCint = espaciosUsados(p.cinturon.items);

  return (
    <div className="tab">
      <Seccion titulo="Equipo">
        <ul className="ranuras">
          {RANURAS_EQUIPO.map((r) => {
            const it = p.equipo[r.id];
            return (
              <li key={r.id} className="ranura">
                <span className="ranura-icono">{r.icono}</span>
                <div className="ranura-cuerpo">
                  <small>{r.nombre}</small>
                  {it ? <button className="item-boton" onClick={() => setAbierto({ zona: 'equipo', r: r.id })}>{it.nombre}{resumenItem(it)}</button>
                    : <button className="btn enlace" onClick={() => setAnadir({ zona: 'equipo', r: r.id })}>+ Equipar</button>}
                </div>
              </li>
            );
          })}
        </ul>
      </Seccion>

      <Seccion titulo="Mochila" extra={<span className={`contador-limite ${carga.exceso ? 'malo' : ''}`}>{carga.usados}/{carga.libres}</span>}>
        <BarraCarga usados={carga.usados} libres={carga.libres} />
        {carga.penalizacion < 0
          ? <p className="aviso-carga">Velocidad {carga.penalizacion} pies. {carga.efecto}</p>
          : <p className="nota">{MOCHILA_BASE} espacios + {espaciosPorFuerza(p.caracteristicas.FUE)} por Fuerza ({UMBRALES_FUERZA.map((u) => `${u}+`).join(', ')}).</p>}
        {carga.sobreMaximo && <p className="error">Llevas más de lo que cabe en la mochila.</p>}
        <ListaItems items={p.mochila} libres={carga.libres} onAbrir={(i) => setAbierto({ zona: 'mochila', i })} mostrarTramos />
        <BotonAnadir onClick={() => setAnadir({ zona: 'mochila' })}>Añadir a la mochila</BotonAnadir>
      </Seccion>

      <Seccion titulo="Cinturón (acceso rápido)" extra={<span className={`contador-limite ${usadosCint > capCint ? 'malo' : ''}`}>{usadosCint}/{capCint}</span>}>
        <div className="segmentado">
          {(Object.keys(CINTURON_ESPACIOS) as TamanoCinturon[]).map((t) => (
            <button key={t} className={p.cinturon.tamano === t ? 'activo' : ''} onClick={() => upd((x) => { x.cinturon.tamano = t; })}>{t[0].toUpperCase() + t.slice(1)} ({CINTURON_ESPACIOS[t]})</button>
          ))}
        </div>
        <p className="nota">Estos espacios pueden usarse para armas y escudos. No cuentan para la carga.</p>
        {usadosCint > capCint && <p className="error">El cinturón está lleno: pasa algo a la mochila.</p>}
        <ListaItems items={p.cinturon.items} libres={capCint} onAbrir={(i) => setAbierto({ zona: 'cinturon', i })} />
        <BotonAnadir onClick={() => setAnadir({ zona: 'cinturon' })}>Añadir al cinturón</BotonAnadir>
      </Seccion>

      <EquipoViaje />
      <Monedas />

      {abierto && leer(p, abierto) && <ModalItem lugar={abierto} onClose={() => setAbierto(null)} />}
      {anadir && <ModalAnadir destino={anadir} onClose={() => setAnadir(null)} />}
    </div>
  );
}

const resumenItem = (it: Item) => <>
  {it.cantidad > 1 && <span className="cant"> ×{it.cantidad}</span>}
  {it.precio && <span className="precio">{it.precio}</span>}
</>;

function BarraCarga({ usados, libres }: { usados: number; libres: number }) {
  const max = libres + TRAMOS_SOBRECARGA[TRAMOS_SOBRECARGA.length - 1].hasta;
  const pct = (n: number) => `${(n / max) * 100}%`;
  return (
    <div className="barra-carga" title={`${usados} espacios usados`}>
      <div className="zona libre" style={{ width: pct(libres) }} />
      {TRAMOS_SOBRECARGA.map((t, i) => <div key={i} className={`zona t${i}`} style={{ width: pct(t.hasta - (i ? TRAMOS_SOBRECARGA[i - 1].hasta : 0)) }} />)}
      <div className="relleno" style={{ width: pct(Math.min(usados, max)) }} />
    </div>
  );
}

function ListaItems({ items, libres, onAbrir, mostrarTramos }: { items: Item[]; libres: number; onAbrir: (i: number) => void; mostrarTramos?: boolean }) {
  let pos = 0;
  if (items.length === 0) return <p className="vacio">Vacío.</p>;
  return (
    <ol className="lista-items">
      {items.map((it, i) => {
        const n = espaciosItem(it);
        const desde = pos + 1; pos += n;
        const exceso = pos - libres;
        const tramo = mostrarTramos && exceso > 0 ? TRAMOS_SOBRECARGA.findIndex((t) => exceso <= t.hasta) : -1;
        return (
          <li key={it.id} className={tramo >= 0 ? `sobre t${tramo}` : desde > libres ? 'sobre' : ''}>
            <span className="num">{n > 1 ? `${desde}-${pos}` : desde}</span>
            <button className="item-boton" onClick={() => onAbrir(i)}>{it.nombre}{resumenItem(it)}</button>
            {tramo >= 0 && <span className="etq-penal">{TRAMOS_SOBRECARGA[tramo].velocidad}p</span>}
          </li>
        );
      })}
    </ol>
  );
}

function ModalItem({ lugar, onClose }: { lugar: Lugar; onClose: () => void }) {
  const { p, upd } = useFicha();
  const it = leer(p, lugar)!;
  const [equipar, setEquipar] = useState(false);
  const set = (f: (it: Item) => void) => upd((x) => { const y = leer(x, lugar); if (y) f(y); });
  const mover = (d: Destino) => { upd((x) => { const y = quitar(x, lugar); if (y) poner(x, y, d); }); onClose(); };
  const usable = it.tipo === 'pocion' || it.tipo === 'consumible';
  const [vender, setVender] = useState(false);
  if (it.bolsa) return <ModalBolsa lugar={lugar} onClose={onClose} />;
  return (
    <Modal titulo={it.nombre} onClose={onClose}
      pie={<div className="acciones-item">
        {usable && <button className="btn primario" onClick={() => {
          if (it.cantidad <= 1) { upd((x) => { quitar(x, lugar); }); onClose(); } else set((y) => { y.cantidad -= 1; });
        }}>Usar{it.cantidad > 1 ? ` (quedan ${it.cantidad - 1})` : ''}</button>}
        {lugar.zona !== 'equipo' && <button className="btn" onClick={() => setEquipar(true)}>Equipar</button>}
        {lugar.zona === 'equipo' && <button className="btn" onClick={() => mover({ zona: 'mochila' })}>Quitar del equipo</button>}
        {lugar.zona === 'mochila' && <button className="btn" onClick={() => mover({ zona: 'cinturon' })}>Al cinturón</button>}
        {lugar.zona === 'cinturon' && <button className="btn" onClick={() => mover({ zona: 'mochila' })}>A la mochila</button>}
        <button className="btn vender" onClick={() => setVender(true)}>Vender</button>
        <button className="btn peligro" onClick={() => { if (confirm(`¿Tirar ${it.nombre}?`)) { upd((x) => { quitar(x, lugar); }); onClose(); } }}>Tirar</button>
      </div>}>
      {it.detalles && <ListaDatos datos={it.detalles} />}
      {it.descripcion && <TextoLargo texto={it.descripcion} />}
      <div className="rejilla-campos">
        <Etiqueta texto="Nombre"><input className="campo" value={it.nombre} onChange={(e) => set((y) => { y.nombre = e.target.value; })} /></Etiqueta>
        <Etiqueta texto="Cantidad"><Numero valor={it.cantidad} min={1} set={(n) => set((y) => { y.cantidad = n; })} /></Etiqueta>
        <Etiqueta texto="Precio (si lo sabes)"><input className="campo" value={it.precio} placeholder="p. ej. 25po" onChange={(e) => set((y) => { y.precio = e.target.value; })} /></Etiqueta>
        <Etiqueta texto="Máx. por espacio"><input className="campo" inputMode="numeric" value={it.maxPorEspacio ?? ''} placeholder="sin límite" onChange={(e) => { const n = parseInt(e.target.value, 10); set((y) => { y.maxPorEspacio = isNaN(n) || n < 1 ? undefined : n; }); }} /></Etiqueta>
      </div>
      <p className="nota">Ocupa {espaciosItem(it)} espacio{espaciosItem(it) > 1 ? 's' : ''}.</p>
      <Etiqueta texto="Descripción"><Texto multilinea filas={4} valor={it.descripcion} set={(v) => set((y) => { y.descripcion = v; })} /></Etiqueta>
      {vender && <ModalVender lugar={lugar} onClose={() => setVender(false)} onVendido={onClose} />}
      {equipar && (
        <Modal titulo="¿Dónde lo equipas?" onClose={() => setEquipar(false)}>
          <div className="lista-opciones">
            {RANURAS_EQUIPO.map((r) => <button key={r.id} className="btn" onClick={() => mover({ zona: 'equipo', r: r.id })}>{r.icono} {r.nombre}{p.equipo[r.id] ? ` (cambia ${p.equipo[r.id]!.nombre})` : ''}</button>)}
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function ModalVender({ lugar, onClose, onVendido }: { lugar: Lugar; onClose: () => void; onVendido: () => void }) {
  const { p, upd } = useFicha();
  const it = leer(p, lugar)!;
  const precio = leerPrecio(it.precio);
  const [cant, setCant] = useState(it.cantidad);
  const [moneda, setMoneda] = useState<Moneda>(precio?.moneda ?? 'PO');
  const [txt, setTxt] = useState(precio ? String(Math.floor(precio.cantidad * cant)) : '');
  const total = parseInt(txt, 10);
  const ok = !isNaN(total) && total >= 0 && cant >= 1 && cant <= it.cantidad;
  const cambiarCant = (c: number) => { setCant(c); if (precio) setTxt(String(Math.floor(precio.cantidad * c))); };
  const vender = () => {
    if (!ok) return;
    upd((x) => {
      const y = leer(x, lugar); if (!y) return;
      if (cant >= y.cantidad) quitar(x, lugar); else y.cantidad -= cant;
      x.monedas[moneda] += total;
      embolsarExceso(x);
    });
    onClose(); onVendido();
  };
  return (
    <Modal titulo={`Vender ${it.nombre}`} onClose={onClose}
      pie={<button className="btn primario" disabled={!ok} onClick={vender}>Vender{ok ? ` por ${total} ${moneda}` : ''}</button>}>
      <div className="rejilla-campos">
        {it.cantidad > 1 && <Etiqueta texto={`Cuántos (tienes ${it.cantidad})`}><Numero valor={cant} min={1} max={it.cantidad} set={cambiarCant} /></Etiqueta>}
        <Etiqueta texto="Te pagan"><input className="campo" inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, ''))} placeholder="0" /></Etiqueta>
        <Etiqueta texto="Moneda"><select className="campo" value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>{MONEDAS.map((m) => <option key={m} value={m}>{m} · {NOMBRE_MONEDA[m]}</option>)}</select></Etiqueta>
      </div>
      <p className="nota">{precio ? `Precio de la ficha: ${it.precio}${cant > 1 ? ' cada uno' : ''}. Cambia la cifra si el mercader paga otra cosa.` : 'Este objeto no tiene precio: escribe lo que te paguen.'}</p>
      {ok && <p className="formula-grande">{p.monedas[moneda]} + {total} = <strong>{p.monedas[moneda] + total} {moneda}</strong></p>}
      {ok && p.monedas[moneda] + total > MAX_MONEDAS && <p className="nota">Lo que pase de {MAX_MONEDAS} irá a la mochila en una bolsa de monedas.</p>}
    </Modal>
  );
}

function ModalBolsa({ lugar, onClose }: { lugar: Lugar; onClose: () => void }) {
  const { p, upd } = useFicha();
  const it = leer(p, lugar)!;
  const b = it.bolsa!;
  const cabe = Math.max(0, MAX_MONEDAS - p.monedas[b.moneda]);
  const maxSacar = Math.min(b.cantidad, cabe);
  const [txt, setTxt] = useState(String(maxSacar));
  const n = parseInt(txt, 10);
  const ok = !isNaN(n) && n > 0 && n <= maxSacar;
  const sacar = () => {
    if (!ok) return;
    upd((x) => {
      const y = leer(x, lugar); if (!y?.bolsa) return;
      x.monedas[b.moneda] += n;
      y.bolsa.cantidad -= n;
      if (y.bolsa.cantidad <= 0) quitar(x, lugar);
      else { y.nombre = `Bolsa de ${NOMBRE_MONEDA[b.moneda].toLowerCase()} (${y.bolsa.cantidad} ${b.moneda})`; y.descripcion = `Una bolsa con ${y.bolsa.cantidad} ${b.moneda}. Ocupa un espacio en la mochila.`; }
    });
    onClose();
  };
  return (
    <Modal titulo={it.nombre} onClose={onClose}
      pie={<div className="acciones-item">
        <button className="btn primario" disabled={!ok} onClick={sacar}>Pasar a mis monedas</button>
        {lugar.zona === 'mochila' && <button className="btn" onClick={() => { upd((x) => { const y = quitar(x, lugar); if (y) poner(x, y, { zona: 'cinturon' }); }); onClose(); }}>Al cinturón</button>}
        {lugar.zona === 'cinturon' && <button className="btn" onClick={() => { upd((x) => { const y = quitar(x, lugar); if (y) poner(x, y, { zona: 'mochila' }); }); onClose(); }}>A la mochila</button>}
      </div>}>
      <p>Dentro hay <strong>{b.cantidad} {b.moneda}</strong>. En tu bolsa de {NOMBRE_MONEDA[b.moneda].toLowerCase()} tienes {p.monedas[b.moneda]}/{MAX_MONEDAS}.</p>
      {maxSacar === 0 ? <p className="error">Tu bolsa de {b.moneda} está llena. Gasta o convierte monedas primero.</p> : (
        <>
          <Etiqueta texto={`Cuántas sacas (máx. ${maxSacar})`}><input className="campo" inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, ''))} /></Etiqueta>
          {ok && <p className="formula-grande">{p.monedas[b.moneda]} + {n} = <strong>{p.monedas[b.moneda] + n} {b.moneda}</strong></p>}
        </>
      )}
    </Modal>
  );
}

function ModalAnadir({ destino, onClose }: { destino: Destino; onClose: () => void }) {
  const { p, upd } = useFicha();
  const [base, setBase] = useState<ObjetoBase[] | null>(null);
  const [borrador, setBorrador] = useState<Item | null>(null);
  useEffect(() => { cargarObjetos().then(setBase); }, []);
  const sueltos = destino.zona === 'equipo' ? [...p.mochila.map((it, i) => ({ it, l: { zona: 'mochila' as const, i } })), ...p.cinturon.items.map((it, i) => ({ it, l: { zona: 'cinturon' as const, i } }))] : [];
  const nombreDestino = destino.zona === 'equipo' ? RANURAS_EQUIPO.find((r) => r.id === destino.r)!.nombre : destino.zona === 'mochila' ? 'la mochila' : 'el cinturón';

  if (borrador) return (
    <Modal titulo={`Añadir a ${nombreDestino}`} onClose={onClose}
      pie={<button className="btn primario" disabled={!borrador.nombre.trim()} onClick={() => { upd((x) => poner(x, borrador, destino)); onClose(); }}>Añadir</button>}>
      {borrador.detalles && <ListaDatos datos={borrador.detalles} />}
      <div className="rejilla-campos">
        <Etiqueta texto="Nombre"><input className="campo" value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Cantidad"><Numero valor={borrador.cantidad} min={1} set={(n) => setBorrador({ ...borrador, cantidad: n })} /></Etiqueta>
        <Etiqueta texto="Precio (si lo sabes)"><input className="campo" value={borrador.precio} placeholder="p. ej. 25po" onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Tipo">
          <select className="campo" value={borrador.tipo} onChange={(e) => setBorrador({ ...borrador, tipo: e.target.value as Item['tipo'] })}>
            <option value="otro">Objeto</option><option value="pocion">Poción</option><option value="consumible">Consumible</option>
            <option value="arma">Arma</option><option value="armadura">Armadura</option><option value="escudo">Escudo</option><option value="herramienta">Herramienta</option>
          </select>
        </Etiqueta>
      </div>
      <Etiqueta texto="Descripción"><Texto multilinea filas={5} valor={borrador.descripcion} set={(v) => setBorrador((b) => b && { ...b, descripcion: v })} placeholder="Qué hace, cuánto cura, cuánto daño…" /></Etiqueta>
    </Modal>
  );

  return (
    <Modal titulo={`Añadir a ${nombreDestino}`} onClose={onClose}>
      {sueltos.length > 0 && (
        <>
          <h4>De tu inventario</h4>
          <div className="lista-opciones">
            {sueltos.map(({ it, l }) => <button key={it.id} className="btn" onClick={() => { upd((x) => { const y = quitar(x, l); if (y) poner(x, y, destino); }); onClose(); }}>{it.nombre} <small>({l.zona})</small></button>)}
          </div>
          <h4>Nuevo objeto</h4>
        </>
      )}
      {!base ? <p>Cargando base de objetos…</p> : (
        <Buscador<ObjetoBase>
          items={base} texto={(o) => o.nombre} placeholder="Escribe el nombre del objeto…"
          filtro={(o) => destino.zona !== 'equipo' || !['yelmo', 'amuleto', 'capa'].includes(destino.r) || o.tipo === 'otro'}
          render={(o) => <span className="res-conjuro"><strong>{o.nombre}</strong><small>{o.categoria}{o.precio ? ` · ${o.precio}` : ''}{o.detalles?.['Daño'] ? ` · ${o.detalles['Daño']}` : ''}{o.detalles?.['Clase de armadura'] ? ` · CA ${o.detalles['Clase de armadura']}` : ''}</small></span>}
          onElegir={(o) => setBorrador(typeof o === 'string'
            ? { id: uid(), nombre: o, descripcion: '', precio: '', cantidad: 1, tipo: 'otro' }
            : { id: uid(), nombre: o.nombre, descripcion: o.descripcion, precio: o.precio, cantidad: o.maxPorEspacio ? 20 : 1, tipo: o.tipo, detalles: o.detalles, maxPorEspacio: o.maxPorEspacio })}
        />
      )}
    </Modal>
  );
}

// ------------------------------------------------------------ Equipo de viaje
const CUERDAS = [
  { id: 'cañamo', nombre: 'Cáñamo', precio: '1 po', info: 'Romper CD 10 · CA 5 · 1 PG' },
  { id: 'seda', nombre: 'Seda', precio: '10 po', info: 'Romper CD 17 · CA 10 · 10 PG' },
  { id: 'araña', nombre: 'Seda de araña', precio: '100 po', info: 'Romper CD 25 · CA 15 · 30 PG' },
] as const;
const ROPAS = [
  { id: 'templado', nombre: 'Clima templado', precio: '155 pc' },
  { id: 'frio', nombre: 'Clima frío', precio: '80 pp' },
  { id: 'calido', nombre: 'Clima cálido', precio: '5 po' },
] as const;
const TIENDAS = [
  ['P. clima templado', '6 po'], ['P. clima frío', '30 po'], ['P. clima cálido', '18 po'],
  ['M. clima templado', '9 po'], ['M. clima frío', '45 po'], ['M. clima cálido', '27 po'],
  ['G. clima templado', '14 po'], ['G. clima frío', '70 po'], ['G. clima cálido', '42 po'],
];

function Rombos({ n, max, set }: { n: number; max: number; set: (n: number) => void }) {
  return <span className="rombos">{Array.from({ length: max }, (_, i) => <button key={i} className={i < n ? 'on' : ''} onClick={() => set(i < n && i === n - 1 ? i : i + 1)} aria-label={`${i + 1}`}>◆</button>)}</span>;
}

function EquipoViaje() {
  const { p, upd } = useFicha();
  const v = p.viaje;
  const s = (f: (v: Personaje['viaje']) => void) => upd((x) => f(x.viaje));
  const [nota, setNota] = useState('');
  /** Solo cabe uno marcado: si ya hay otro, el nuevo va a la mochila como objeto. */
  const elegir = <K extends 'cuerda' | 'ropa' | 'tienda'>(campo: K, id: Personaje['viaje'][K], item: { nombre: string; precio: string; descripcion: string }) => {
    if (!v[campo] || v[campo] === id) { s((x) => { x[campo] = (x[campo] === id ? '' : id) as Personaje['viaje'][K]; }); setNota(''); return; }
    upd((x) => { x.mochila.push({ id: uid(), nombre: item.nombre, precio: item.precio, descripcion: item.descripcion, cantidad: 1, tipo: 'otro' }); });
    setNota(`Ya tienes uno marcado: «${item.nombre}» se ha añadido a la mochila.`);
  };
  return (
    <Seccion titulo="Equipo de viaje">
      <ul className="viaje">
        <li><span className="v-nombre">Raciones <small>(5 pp/u)</small></span><Rombos n={v.raciones} max={7} set={(n) => s((x) => { x.raciones = n; })} /></li>
        <li><span className="v-nombre">Odre 2L <small>(1 po)</small></span><Rombos n={v.odre} max={2} set={(n) => s((x) => { x.odre = n; })} /></li>
        <li><label className="v-nombre"><input type="checkbox" checked={v.pedernal} onChange={(e) => s((x) => { x.pedernal = e.target.checked; })} /> Pedernal <small>(1 po)</small></label></li>
        <li><span className="v-nombre">Antorchas <small>(1 pc/u)</small></span><Rombos n={v.antorchas} max={10} set={(n) => s((x) => { x.antorchas = n; })} /></li>
        <li className="bloque"><span className="v-nombre">Cuerda de 50 pies <small>(máx. 1)</small></span>
          <div className="opciones-viaje">{CUERDAS.map((c) => <button key={c.id} className={`opc ${v.cuerda === c.id ? 'sel' : ''}`} onClick={() => elegir('cuerda', c.id, { nombre: `Cuerda de ${c.nombre.toLowerCase()} (50 pies)`, precio: c.precio, descripcion: c.info })}><strong>{c.nombre}</strong> <small>({c.precio})</small><em>{c.info}</em></button>)}</div></li>
        <li className="bloque"><span className="v-nombre">Ropa de viaje <small>(máx. 1)</small></span>
          <div className="opciones-viaje">{ROPAS.map((c) => <button key={c.id} className={`opc ${v.ropa === c.id ? 'sel' : ''}`} onClick={() => elegir('ropa', c.id, { nombre: `Ropa de viaje (${c.nombre.toLowerCase()})`, precio: c.precio, descripcion: '' })}><strong>{c.nombre}</strong> <small>({c.precio})</small></button>)}</div></li>
        <li><label className="v-nombre"><input type="checkbox" checked={v.sacoDormir} onChange={(e) => s((x) => { x.sacoDormir = e.target.checked; })} /> Saco de dormir <small>(1 pp)</small></label></li>
        <li><label className="v-nombre"><input type="checkbox" checked={v.manta} onChange={(e) => s((x) => { x.manta = e.target.checked; })} /> Manta invernal <small>(5 pp)</small></label></li>
        <li className="bloque"><span className="v-nombre">Tienda de campaña <small>(máx. 1)</small></span>
          <div className="opciones-viaje tiendas">{TIENDAS.map(([n, pr]) => <button key={n} className={`opc ${v.tienda === n ? 'sel' : ''}`} onClick={() => elegir('tienda', n, { nombre: `Tienda de campaña (${n})`, precio: pr, descripcion: 'P. = pequeña, M. = mediana, G. = grande.' })}>{n} <small>({pr})</small></button>)}</div></li>
      </ul>
      {nota && <p className="exito">🎒 {nota}</p>}
      <p className="nota pequena">Cuerda, ropa y tienda: se marca una. Si eliges otra distinta, va a la mochila.</p>
    </Seccion>
  );
}

// ------------------------------------------------------------ Monedas
function Monedas() {
  const { p, upd } = useFicha();
  const [sumar, setSumar] = useState<{ m: Moneda; signo: 1 | -1 } | null>(null);
  const [conv, setConv] = useState(false);
  const bolsas = [...p.mochila, ...p.cinturon.items].filter((it) => it.bolsa);
  const totalPO = (MONEDAS.reduce((s, m) => s + p.monedas[m] * VALOR_PC[m], 0) + bolsas.reduce((s, it) => s + it.bolsa!.cantidad * VALOR_PC[it.bolsa!.moneda], 0)) / 100;
  const [aviso, setAviso] = useState('');
  // Si ya había más de 500 (personajes antiguos), lo pasamos a bolsas en la mochila.
  useEffect(() => {
    if (MONEDAS.some((m) => p.monedas[m] > MAX_MONEDAS)) { upd((x) => { embolsarExceso(x); }); setAviso('Lo que pasaba de 500 se ha guardado en bolsas en la mochila.'); }
  }, [p.monedas, upd]);
  return (
    <Seccion titulo="Bolsas de monedas" extra={<button className="btn enlace pequeno" onClick={() => setConv(true)}>⇄ Convertir</button>}>
      <ul className="monedas">
        {MONEDAS.map((m) => {
          const lleno = p.monedas[m] > MAX_MONEDAS;
          return (
            <li key={m} className={`moneda m-${m} ${lleno ? 'llena' : ''}`}>
              <span className="ficha-moneda">{m}</span>
              <span className="m-nombre">{NOMBRE_MONEDA[m]}<small>{m === 'PO' ? '' : m === 'PC' ? '1 PO = 100 PC' : m === 'PP' ? '1 PO = 10 PP' : m === 'PE' ? '1 PO = 5 PE' : m === 'PL' ? '1 PL = 7 PO' : '1 PM = 100 PO'}</small></span>
              <button className="btn redondo" onClick={() => setSumar({ m, signo: -1 })} aria-label="Restar">−</button>
              <span className="m-valor">{p.monedas[m]}<small>/{MAX_MONEDAS}</small></span>
              <button className="btn redondo primario" onClick={() => setSumar({ m, signo: 1 })} aria-label="Añadir">+</button>
            </li>
          );
        })}
      </ul>
      {aviso && <p className="exito">💰 {aviso}</p>}
      {bolsas.length > 0 && <p className="nota">Además llevas {bolsas.length} bolsa{bolsas.length > 1 ? 's' : ''} llena{bolsas.length > 1 ? 's' : ''}: {bolsas.map((it) => `${it.bolsa!.cantidad} ${it.bolsa!.moneda}`).join(', ')}. Tócala en la mochila para sacar monedas.</p>}
      <p className="nota">Valor total{bolsas.length ? ' (con bolsas)' : ''}: {totalPO.toLocaleString('es', { maximumFractionDigits: 2 })} po.</p>
      {sumar && <ModalSumar m={sumar.m} signo={sumar.signo} onClose={() => setSumar(null)} />}
      {conv && <ModalConvertir onClose={() => setConv(false)} />}
    </Seccion>
  );
}

function ModalSumar({ m, signo, onClose }: { m: Moneda; signo: 1 | -1; onClose: () => void }) {
  const { p, upd } = useFicha();
  const [n, setN] = useState('');
  const v = parseInt(n, 10);
  const nuevo = isNaN(v) ? p.monedas[m] : p.monedas[m] + signo * v;
  const ok = !isNaN(v) && v > 0 && nuevo >= 0;
  const aplicar = () => { if (!ok) return; upd((x) => { x.monedas[m] = nuevo; embolsarExceso(x); }); onClose(); };
  return (
    <Modal titulo={`${signo > 0 ? 'Añadir' : 'Gastar'} ${NOMBRE_MONEDA[m].toLowerCase()} (${m})`} onClose={onClose}
      pie={<button className="btn primario" disabled={!ok} onClick={aplicar}>{signo > 0 ? 'Añadir' : 'Gastar'}</button>}>
      <form onSubmit={(e) => { e.preventDefault(); aplicar(); }}>
        <input className="campo grande" autoFocus inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} placeholder="0" />
      </form>
      <p className="formula-grande">{p.monedas[m]} {signo > 0 ? '+' : '−'} {isNaN(v) ? 0 : v} = <strong>{nuevo}</strong></p>
      {nuevo < 0 && <p className="error">No tienes tantas.</p>}
      {nuevo > MAX_MONEDAS && <p className="nota">Pasas de {MAX_MONEDAS}: {Math.floor((nuevo - 1) / MAX_MONEDAS)} bolsa{nuevo > 2 * MAX_MONEDAS + 1 ? 's' : ''} de {MAX_MONEDAS} {m} irá{nuevo > 2 * MAX_MONEDAS + 1 ? 'n' : ''} a la mochila y te quedarán {nuevo - Math.floor((nuevo - 1) / MAX_MONEDAS) * MAX_MONEDAS} en la bolsa.</p>}
    </Modal>
  );
}

function ModalConvertir({ onClose }: { onClose: () => void }) {
  const { p, upd } = useFicha();
  const [desde, setDesde] = useState<Moneda>('PC');
  const [hacia, setHacia] = useState<Moneda>('PO');
  const [n, setN] = useState('');
  const r = convertir(p.monedas, desde, hacia, parseInt(n, 10));
  return (
    <Modal titulo="Convertir monedas" onClose={onClose}
      pie={<button className="btn primario" disabled={!r.ok} onClick={() => { if (r.monedas) upd((x) => { x.monedas = r.monedas!; embolsarExceso(x); }); onClose(); }}>Convertir</button>}>
      <div className="conversion">
        <Etiqueta texto="De"><select className="campo" value={desde} onChange={(e) => setDesde(e.target.value as Moneda)}>{MONEDAS.map((m) => <option key={m} value={m}>{m} · {NOMBRE_MONEDA[m]} ({p.monedas[m]})</option>)}</select></Etiqueta>
        <Etiqueta texto="Cantidad"><input className="campo" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} placeholder="0" /></Etiqueta>
        <button className="btn" onClick={() => setN(String(p.monedas[desde]))}>Todas</button>
        <Etiqueta texto="A"><select className="campo" value={hacia} onChange={(e) => setHacia(e.target.value as Moneda)}>{MONEDAS.map((m) => <option key={m} value={m}>{m} · {NOMBRE_MONEDA[m]}</option>)}</select></Etiqueta>
      </div>
      {n && (r.ok ? (
        <p className="exito">Recibes <strong>{r.monedas![hacia] - p.monedas[hacia]} {hacia}</strong>{r.resto ? `; ${r.resto} ${desde} sobran y se quedan en la bolsa` : ''}.</p>
      ) : <p className="error">{r.error}</p>)}
      {r.ok && r.monedas![hacia] > MAX_MONEDAS && <p className="nota">Lo que pase de {MAX_MONEDAS} {hacia} irá a la mochila en una bolsa de monedas.</p>}
    </Modal>
  );
}
