import { useEffect, useRef, useState } from 'react';
import { useFicha } from './Ficha';
import { BotonAnadir, Buscador, Etiqueta, ListaDatos, Modal, Numero, Seccion, Texto, TextoLargo, comprimirFoto } from '../ui';
import { Contador, useDados } from '../dice';
import { cargarObjetos, useDatos, type ObjetoBase } from '../data';
import { MOCHILA_MAX, cabeEnMochila, conSigno, espaciosItem, espaciosUsados, modificador, uid } from '../rules';
import { nuevaMontura } from '../personaje';
import { ATRIBUTOS, NOMBRE_ATRIBUTO, type Item, type Montura } from '../types';

type Zona = 'equipo' | 'carga';
interface MonturaBase { nombre: string; tamano: string; ca: number; pg: number; dadosPG: string; precio: string;
  velocidad: Montura['velocidad']; caracteristicas: Montura['caracteristicas']; rasgos: { nombre: string; texto: string }[] }

export function TabMonturas() {
  const { p, upd } = useFicha();
  const [sel, setSel] = useState<string | null>(p.monturas[0]?.id ?? null);
  const m = p.monturas.find((x) => x.id === sel) ?? p.monturas[0] ?? null;

  const [elegir, setElegir] = useState(false);
  const base = useDatos<MonturaBase[]>('monturas');
  const crear = (b?: MonturaBase) => {
    const n = nuevaMontura(b ? b.nombre : `Montura ${p.monturas.length + 1}`);
    if (b) {
      n.tipo = b.nombre; n.ca = String(b.ca); n.pg = { max: b.pg, actual: b.pg };
      n.velocidad = { ...b.velocidad }; n.caracteristicas = { ...b.caracteristicas };
      n.rasgos = [{ nombre: 'Tamaño', texto: `${b.tamano}. PG ${b.pg} (${b.dadosPG}).${b.precio ? ` Precio: ${b.precio}.` : ''}` }, ...b.rasgos];
    }
    upd((x) => { x.monturas.push(n); });
    setSel(n.id); setElegir(false);
  };

  return (
    <div className="tab">
      {p.monturas.length > 0 && (
        <div className="chips-monturas">
          {p.monturas.map((x) => (
            <button key={x.id} className={`chip ${m?.id === x.id ? 'activo' : ''}`} onClick={() => setSel(x.id)}>🐎 {x.nombre || 'Sin nombre'}</button>
          ))}
        </div>
      )}
      <BotonAnadir onClick={() => setElegir(true)}>Añadir montura</BotonAnadir>
      {elegir && (
        <Modal titulo="Añadir montura" onClose={() => setElegir(false)}>
          {!base ? <p>Cargando monturas…</p> : (
            <Buscador<MonturaBase> items={base} texto={(b) => b.nombre} placeholder="Caballo, grifo, poni…"
              render={(b) => <span className="res-conjuro"><strong>{b.nombre}</strong><small>{b.tamano} · CA {b.ca} · PG {b.pg} · {b.velocidad.andando} pies{b.velocidad.volando ? `, vuela ${b.velocidad.volando}` : ''}{b.velocidad.nadando ? `, nada ${b.velocidad.nadando}` : ''}{b.precio ? ` · ${b.precio}` : ''}</small></span>}
              onElegir={(b) => typeof b === 'string' ? (() => { crear(); })() : crear(b)} />
          )}
          <button className="btn" onClick={() => crear()}>Montura vacía (rellenar a mano)</button>
          <p className="nota pequena">Datos del SRD 5.2 (parte gratuita del Manual de monstruos 2024, CC-BY-4.0). Puedes cambiarlos en la ficha.</p>
        </Modal>
      )}
      {!m && <p className="vacio">Aún no tienes monturas. Caballos, ponis, grifos… cada uno con su vida, armadura, velocidad, habilidades e inventario.</p>}
      {m && <FichaMontura key={m.id} m={m} onBorrada={() => setSel(null)} />}
    </div>
  );
}

function FichaMontura({ m, onBorrada }: { m: Montura; onBorrada: () => void }) {
  const { upd } = useFicha();
  const { tirarD20 } = useDados();
  const set = (f: (x: Montura) => void) => upd((p) => { const x = p.monturas.find((y) => y.id === m.id); if (x) f(x); });
  const inputFoto = useRef<HTMLInputElement>(null);
  const [rasgo, setRasgo] = useState<number | null>(null);
  const [anadir, setAnadir] = useState<Zona | null>(null);
  const [abierto, setAbierto] = useState<{ zona: Zona; i: number } | null>(null);
  const usadosEq = espaciosUsados(m.equipo);
  const usadosCarga = espaciosUsados(m.carga);

  return (
    <>
      <Seccion titulo="Montura">
        <div className="cabecera-personaje">
          <button className="retrato grande" onClick={() => inputFoto.current?.click()} aria-label="Foto">
            {m.foto ? <img src={m.foto} alt="" /> : <span className="sin-foto">🐎<small>Añadir foto</small></span>}
          </button>
          <input ref={inputFoto} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const url = await comprimirFoto(f); set((x) => { x.foto = url; }); } catch { /* foto no válida */ }
            e.target.value = '';
          }} />
          <div className="datos-basicos">
            <Etiqueta texto="Nombre"><Texto valor={m.nombre} set={(s) => set((x) => { x.nombre = s; })} /></Etiqueta>
            <Etiqueta texto="Tipo"><Texto valor={m.tipo} set={(s) => set((x) => { x.tipo = s; })} placeholder="Caballo de guerra, poni…" /></Etiqueta>
          </div>
        </div>
      </Seccion>

      <div className="fila-3-tarjetas">
        <Seccion titulo="PG (vida)" className="pg">
          <div className="pg-actual">
            <Contador valor={m.pg.actual} set={(n) => set((x) => { x.pg.actual = n; })} min={-99} max={999} />
            <span className="de">/ {m.pg.max}</span>
          </div>
          <Etiqueta texto="Máximos"><Numero valor={m.pg.max} min={0} set={(n) => set((x) => { x.pg.max = n; })} /></Etiqueta>
          <div className="barra-vida"><div style={{ width: `${m.pg.max ? Math.max(0, Math.min(100, (m.pg.actual / m.pg.max) * 100)) : 0}%` }} /></div>
        </Seccion>
        <Seccion titulo="CA">
          <input className="campo valor-grande" value={m.ca} inputMode="numeric" onChange={(e) => set((x) => { x.ca = e.target.value; })} placeholder="—" />
        </Seccion>
        <Seccion titulo="Velocidad">
          <ul className="velocidades">
            <li><span>Andando</span><Numero valor={m.velocidad.andando} min={0} set={(n) => set((x) => { x.velocidad.andando = n; })} ancho={64} /><span className="pies">pies</span></li>
            <li><span>Volando</span><Texto valor={m.velocidad.volando} set={(s) => set((x) => { x.velocidad.volando = s; })} /></li>
            <li><span>Nadando</span><Texto valor={m.velocidad.nadando} set={(s) => set((x) => { x.velocidad.nadando = s; })} /></li>
            <li><span>Trepando</span><Texto valor={m.velocidad.trepando} set={(s) => set((x) => { x.velocidad.trepando = s; })} /></li>
          </ul>
        </Seccion>
      </div>

      <div className="rejilla-caracteristicas">
        {ATRIBUTOS.map((a) => {
          const mod = modificador(m.caracteristicas[a]);
          return (
            <div key={a} className="caracteristica">
              <div className="car-nombre">{NOMBRE_ATRIBUTO[a]}</div>
              <Numero valor={m.caracteristicas[a]} min={1} max={30} set={(n) => set((x) => { x.caracteristicas[a] = n; })} className="car-valor" />
              <button className="car-mod" onClick={() => tirarD20(`${m.nombre || 'Montura'}: ${NOMBRE_ATRIBUTO[a]}`, mod)}>{conSigno(mod)}</button>
            </div>
          );
        })}
      </div>

      <Seccion titulo="Habilidades y rasgos">
        <BotonAnadir onClick={() => { set((x) => { x.rasgos.push({ nombre: '', texto: '' }); }); setRasgo(m.rasgos.length); }}>Añadir habilidad</BotonAnadir>
        {m.rasgos.length === 0 ? <p className="vacio">Sin habilidades (p. ej. «Embestida», «Paso seguro»).</p> : (
          <ul className="lista-conjuros">
            {m.rasgos.map((r, i) => (
              <li key={i}><button className="conjuro-nombre" onClick={() => setRasgo(i)}><strong>{r.nombre || 'Sin nombre'}</strong>{r.texto && <small>{r.texto.slice(0, 90)}{r.texto.length > 90 ? '…' : ''}</small>}</button></li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Equipo de la montura" extra={<span className={`contador-limite ${usadosEq > m.espaciosEquipo ? 'malo' : ''}`}>{usadosEq}/{m.espaciosEquipo}</span>}>
        <p className="nota">Lo que lleva puesto: barda, silla, bolsas laterales…</p>
        <ListaMontura items={m.equipo} onAbrir={(i) => setAbierto({ zona: 'equipo', i })} />
        {usadosEq > m.espaciosEquipo && <p className="error">No le caben tantas cosas.</p>}
        <BotonAnadir onClick={() => setAnadir('equipo')}>Equipar a la montura</BotonAnadir>
        <Etiqueta texto="Espacios de equipo"><Numero valor={m.espaciosEquipo} min={0} max={20} set={(n) => set((x) => { x.espaciosEquipo = n; })} /></Etiqueta>
      </Seccion>

      <Seccion titulo="Carga (bolsas laterales)" extra={<span className={`contador-limite ${usadosCarga > m.espaciosCarga ? 'malo' : ''}`}>{usadosCarga}/{m.espaciosCarga}</span>}>
        <ListaMontura items={m.carga} onAbrir={(i) => setAbierto({ zona: 'carga', i })} />
        {usadosCarga > m.espaciosCarga && <p className="error">{m.espaciosCarga === 0 ? 'Ponle bolsas laterales y escribe cuántos espacios dan.' : 'Las bolsas están llenas.'}</p>}
        <BotonAnadir onClick={() => setAnadir('carga')}>Guardar en las bolsas</BotonAnadir>
        <Etiqueta texto="Espacios de carga"><Numero valor={m.espaciosCarga} min={0} max={50} set={(n) => set((x) => { x.espaciosCarga = n; })} /></Etiqueta>
      </Seccion>

      <Seccion titulo="Notas">
        <Texto multilinea filas={4} valor={m.notas} set={(s) => set((x) => { x.notas = s; })} placeholder="Carácter, adiestramiento, dónde se compró…" />
      </Seccion>

      <div className="pie-borrar">
        <button className="btn peligro" onClick={() => { if (confirm(`¿Borrar a ${m.nombre || 'esta montura'}? Su inventario se perderá.`)) { upd((p) => { p.monturas = p.monturas.filter((x) => x.id !== m.id); }); onBorrada(); } }}>Borrar montura</button>
      </div>

      {rasgo !== null && m.rasgos[rasgo] && (
        <Modal titulo="Habilidad de la montura" onClose={() => setRasgo(null)}
          pie={<>
            <button className="btn peligro" onClick={() => { set((x) => { x.rasgos.splice(rasgo, 1); }); setRasgo(null); }}>Quitar</button>
            <button className="btn primario" onClick={() => setRasgo(null)}>Listo</button>
          </>}>
          <Etiqueta texto="Nombre"><Texto valor={m.rasgos[rasgo].nombre} set={(s) => set((x) => { x.rasgos[rasgo].nombre = s; })} /></Etiqueta>
          <Etiqueta texto="Descripción"><Texto multilinea filas={6} valor={m.rasgos[rasgo].texto} set={(s) => set((x) => { x.rasgos[rasgo].texto = s; })} /></Etiqueta>
        </Modal>
      )}
      {anadir && <ModalAnadirMontura m={m} zona={anadir} onClose={() => setAnadir(null)} />}
      {abierto && m[abierto.zona][abierto.i] && <ModalItemMontura m={m} zona={abierto.zona} i={abierto.i} onClose={() => setAbierto(null)} />}
    </>
  );
}

function ListaMontura({ items, onAbrir }: { items: Item[]; onAbrir: (i: number) => void }) {
  if (items.length === 0) return <p className="vacio">Vacío.</p>;
  return (
    <ol className="lista-items">
      {items.map((it, i) => (
        <li key={it.id}>
          <span className="num">{espaciosItem(it)}</span>
          <button className="item-boton" onClick={() => onAbrir(i)}>{it.nombre}{it.cantidad > 1 && <span className="cant"> ×{it.cantidad}</span>}{it.precio && <span className="precio">{it.precio}</span>}</button>
        </li>
      ))}
    </ol>
  );
}

function ModalAnadirMontura({ m, zona, onClose }: { m: Montura; zona: Zona; onClose: () => void }) {
  const { p, upd } = useFicha();
  const [base, setBase] = useState<ObjetoBase[] | null>(null);
  useEffect(() => { cargarObjetos().then(setBase); }, []);
  const poner = (it: Item) => upd((x) => { x.monturas.find((y) => y.id === m.id)?.[zona].push(it); });
  return (
    <Modal titulo={zona === 'equipo' ? 'Equipar a la montura' : 'Guardar en las bolsas'} onClose={onClose}>
      {p.mochila.length > 0 && (
        <>
          <h4>De tu mochila</h4>
          <div className="lista-opciones">
            {p.mochila.map((it, i) => <button key={it.id} className="btn" onClick={() => { upd((x) => { const [y] = x.mochila.splice(i, 1); if (y) x.monturas.find((z) => z.id === m.id)?.[zona].push(y); }); onClose(); }}>{it.nombre}{it.cantidad > 1 ? ` ×${it.cantidad}` : ''}</button>)}
          </div>
          <h4>Nuevo objeto</h4>
        </>
      )}
      {!base ? <p>Cargando base de objetos…</p> : (
        <Buscador<ObjetoBase>
          items={base} texto={(o) => o.nombre} placeholder={zona === 'equipo' ? 'Barda, silla, bolsas laterales…' : 'Escribe el nombre del objeto…'}
          render={(o) => <span className="res-conjuro"><strong>{o.nombre}</strong><small>{o.categoria}{o.precio ? ` · ${o.precio}` : ''}</small></span>}
          onElegir={(o) => {
            poner(typeof o === 'string'
              ? { id: uid(), nombre: o, descripcion: '', precio: '', cantidad: 1, tipo: 'otro' }
              : { id: uid(), nombre: o.nombre, descripcion: o.descripcion, precio: o.precio, cantidad: 1, tipo: o.tipo, detalles: o.detalles, maxPorEspacio: o.maxPorEspacio });
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function ModalItemMontura({ m, zona, i, onClose }: { m: Montura; zona: Zona; i: number; onClose: () => void }) {
  const { p, upd } = useFicha();
  const it = m[zona][i];
  const set = (f: (y: Item) => void) => upd((x) => { const y = x.monturas.find((z) => z.id === m.id)?.[zona][i]; if (y) f(y); });
  const sacar = (f: (x: Parameters<Parameters<typeof upd>[0]>[0], y: Item) => void) => {
    upd((x) => { const mm = x.monturas.find((z) => z.id === m.id); const y = mm?.[zona].splice(i, 1)[0]; if (y) f(x, y); });
    onClose();
  };
  const otra: Zona = zona === 'equipo' ? 'carga' : 'equipo';
  return (
    <Modal titulo={it.nombre} onClose={onClose}
      pie={<div className="acciones-item">
        <button className="btn" onClick={() => sacar((x, y) => { x.monturas.find((z) => z.id === m.id)?.[otra].push(y); })}>{otra === 'equipo' ? 'Equipar' : 'A las bolsas'}</button>
        <button className="btn" onClick={() => { if (!cabeEnMochila(p, it)) { alert(`Tu mochila está llena (máx. ${MOCHILA_MAX} espacios).`); return; } sacar((x, y) => { x.mochila.push(y); }); }}>A tu mochila</button>
        <button className="btn peligro" onClick={() => { if (confirm(`¿Tirar ${it.nombre}?`)) sacar(() => {}); }}>Tirar</button>
      </div>}>
      {it.detalles && <ListaDatos datos={it.detalles} />}
      {it.descripcion && <TextoLargo texto={it.descripcion} />}
      <div className="rejilla-campos">
        <Etiqueta texto="Nombre"><input className="campo" value={it.nombre} onChange={(e) => set((y) => { y.nombre = e.target.value; })} /></Etiqueta>
        <Etiqueta texto="Cantidad"><Numero valor={it.cantidad} min={1} set={(n) => set((y) => { y.cantidad = n; })} /></Etiqueta>
        <Etiqueta texto="Precio"><input className="campo" value={it.precio} onChange={(e) => set((y) => { y.precio = e.target.value; })} /></Etiqueta>
      </div>
      <Etiqueta texto="Descripción"><Texto multilinea filas={4} valor={it.descripcion} set={(v) => set((y) => { y.descripcion = v; })} /></Etiqueta>
    </Modal>
  );
}
