import { Fragment, useRef, useState } from 'react';
import { useFicha } from './Ficha';
import { Etiqueta, Modal, Numero, PuntoRojo, Seccion, Texto, TextoLargo, comprimirFoto } from '../ui';
import { HUECOS_IDIOMAS, HUECOS_OFICIOS, HUECOS_PROFESIONES, aplicarConjuntoEstandar, aplicarExperiencia, caracteristicasSinTocar, huecoDisponible, idHabilidad, cambiarNivel, idiomasDeTexto, pgPorDefecto, pxParaSubir, RASGOS_IDIOMA } from '../rules';
import { ATRIBUTOS, type Atributo, type Personaje } from '../types';
import { buscarClase, buscarRaza } from '../avisos';

const ABREV: Record<string, Atributo> = { FUE: 'FUE', DES: 'DES', CON: 'CON', INT: 'INT', SAB: 'SAB', CAR: 'CAR' };

export function TabPersonaje() {
  const { p, upd, clases, razas, trasfondos, avisos } = useFicha();
  const [info, setInfo] = useState<'raza' | 'clase' | 'trasfondo' | null>(null);
  const [verExp, setVerExp] = useState(false);
  const [errFoto, setErrFoto] = useState('');
  const inputFoto = useRef<HTMLInputElement>(null);
  const clase = buscarClase(clases, p.clase);
  const raza = buscarRaza(razas, p.raza);
  const tras = trasfondos?.find((t) => t.nombre === p.trasfondoEstilo);
  // Idiomas que ya vienen dados: los de la raza y los de rasgos de clase como «Druídico» o «Jerga de ladrones».
  const idiomasFijos = [
    ...(raza ? idiomasDeTexto(raza.idiomas).map((n) => ({ nombre: n, origen: raza.nombre })) : []),
    ...(clase?.rasgos ?? []).filter((r) => r.nivel <= p.nivel && RASGOS_IDIOMA[r.nombre]).map((r) => ({ nombre: RASGOS_IDIOMA[r.nombre], origen: clase!.nombre })),
  ];

  const elegirRaza = (nombre: string) => upd((x) => {
    x.raza = nombre;
    const r = buscarRaza(razas, nombre);
    if (r) {
      x.tamano = r.tamano;
      const v = parseInt(r.velocidad, 10);
      if (!isNaN(v)) { x.velocidad.andando = v; x.velocidad.corriendo = v * 2; }
      const nad = r.velocidad.match(/(\d+)\s*pies\s+nadando/); if (nad) x.velocidad.nadando = nad[1];
      x.rasgosRaza = [];
    }
  });
  const elegirClase = (nombre: string) => upd((x) => {
    const viejo = buscarClase(clases, x.clase);
    const pgViejo = viejo ? pgPorDefecto(x, viejo.atributos.dadoGolpe) : 0;
    x.clase = nombre; x.subclase = '';
    const c = buscarClase(clases, nombre);
    if (c) for (const a of ATRIBUTOS) x.salvaciones[a].comp = c.atributos.salvaciones.includes(a);
    // Al elegir clase, si aún no has tocado las características, pone el conjunto estándar del manual.
    if (caracteristicasSinTocar(x)) aplicarConjuntoEstandar(x, nombre);
    // PG por defecto si aún no los habías puesto (o seguían siendo los de la clase anterior).
    if (c && (x.pg.max === 0 || x.pg.max === pgViejo)) { x.pg.max = pgPorDefecto(x, c.atributos.dadoGolpe); x.pg.actual = x.pg.max; }
    // La característica de conjuros vuelve a ser la automática de la clase.
    x.conjuroCaracteristica = '';
  });
  const elegirTrasfondo = (nombre: string) => upd((x) => {
    const viejo = trasfondos?.find((t) => t.nombre === x.trasfondoEstilo);
    viejo?.habilidades.forEach((h) => { const id = idHabilidad(h); if (id) x.habilidades[id].comp = false; });
    x.trasfondoEstilo = nombre;
    const t = trasfondos?.find((t) => t.nombre === nombre);
    t?.habilidades.forEach((h) => { const id = idHabilidad(h); if (id) x.habilidades[id].comp = true; });
  });

  return (
    <div className="tab">
      <Seccion titulo="Hoja de personaje">
        <div className="cabecera-personaje">
          <button className="retrato grande" onClick={() => inputFoto.current?.click()} title="Cambiar foto">
            {p.foto ? <img src={p.foto} alt="Retrato" /> : <span className="sin-foto">📷<small>Añadir foto</small></span>}
          </button>
          <input ref={inputFoto} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const url = await comprimirFoto(f); upd((x) => { x.foto = url; }); setErrFoto(''); } catch (er) { setErrFoto((er as Error).message); }
            e.target.value = '';
          }} />
          <div className="datos-basicos">
            <Etiqueta texto="Nombre"><Texto valor={p.nombre} set={(s) => upd((x) => { x.nombre = s; })} /></Etiqueta>
            <div className="fila-2">
              <Etiqueta texto="Nivel"><Numero valor={p.nivel} min={1} max={20} set={(n) => upd((x) => { cambiarNivel(x, n); })} /></Etiqueta>
              <Etiqueta texto="Exp."><button type="button" className="campo boton-exp" onClick={() => setVerExp(true)}>{p.exp}{pxParaSubir(p.nivel) !== null && <small> / {pxParaSubir(p.nivel)}</small>}</button></Etiqueta>
            </div>
            {pxParaSubir(p.nivel) !== null && <div className="barra-exp"><div style={{ width: `${Math.min(100, (p.exp / pxParaSubir(p.nivel)!) * 100)}%` }} /></div>}
          </div>
        </div>
        {verExp && <ModalExperiencia onClose={() => setVerExp(false)} />}
        {p.foto && <button className="btn enlace pequeno" onClick={() => upd((x) => { x.foto = ''; })}>Quitar foto</button>}
        {errFoto && <p className="error">{errFoto}</p>}
        <div className="rejilla-campos">
          <Etiqueta texto="Raza">
            <div className="con-boton">
              <select className="campo" value={razas?.razas.some((r) => r.nombre === p.raza) ? p.raza : p.raza ? '__otra' : ''} onChange={(e) => e.target.value !== '__otra' && elegirRaza(e.target.value)}>
                <option value="">— Elige —</option>
                {razas?.razas.map((r) => <option key={r.nombre}>{r.nombre}</option>)}
                {p.raza && !raza && <option value="__otra">{p.raza}</option>}
              </select>
              {raza && <button className="btn icono" onClick={() => setInfo('raza')} title="Ver raza">ⓘ</button>}
            </div>
          </Etiqueta>
          <Etiqueta texto="Clase">
            <div className="con-boton">
              <select className="campo" value={p.clase} onChange={(e) => elegirClase(e.target.value)}>
                <option value="">— Elige —</option>
                {clases?.map((c) => <option key={c.nombre}>{c.nombre}</option>)}
              </select>
              {clase && <button className="btn icono" onClick={() => setInfo('clase')} title="Ver clase">ⓘ</button>}
            </div>
          </Etiqueta>
          {clase && (
            <Etiqueta texto={`Subclase${p.nivel < 3 ? ' (nivel 3)' : ''}`}>
              <div className="con-boton">
                <select className="campo" value={p.subclase} onChange={(e) => upd((x) => { x.subclase = e.target.value; })}>
                  <option value="">— Ninguna —</option>
                  {clase.subclases.map((s) => <option key={s.nombre}>{s.nombre}</option>)}
                </select>
                {avisos.subclase && <PuntoRojo titulo="A nivel 3 eliges subclase" />}
              </div>
            </Etiqueta>
          )}
          <Etiqueta texto="Tamaño"><Texto valor={p.tamano} set={(s) => upd((x) => { x.tamano = s; })} /></Etiqueta>
          <Etiqueta texto="Edad"><Texto valor={p.edad} set={(s) => upd((x) => { x.edad = s; })} /></Etiqueta>
        </div>
      </Seccion>

      <Seccion titulo="Trasfondo">
        <Etiqueta texto="Estilo de trasfondo (opcional)">
          <div className="con-boton">
            <select className="campo" value={p.trasfondoEstilo} onChange={(e) => elegirTrasfondo(e.target.value)}>
              <option value="">— Ninguno —</option>
              {trasfondos?.map((t) => <option key={t.nombre}>{t.nombre}</option>)}
            </select>
            {tras && <button className="btn icono" onClick={() => setInfo('trasfondo')}>ⓘ</button>}
          </div>
        </Etiqueta>
        {tras && <p className="nota">Competencia en {tras.habilidades.join(' y ')}. Dote de origen a elegir: {tras.dotes.join(', ')}.</p>}
        <Etiqueta texto="Resumen"><Texto multilinea filas={5} valor={p.trasfondo} set={(s) => upd((x) => { x.trasfondo = s; })} placeholder="¿Quién te crió? ¿Qué te llevó a la aventura?" /></Etiqueta>
      </Seccion>

      <Seccion titulo="Rasgos de personalidad">
        <Texto multilinea filas={3} valor={p.personalidad} set={(s) => upd((x) => { x.personalidad = s; })} />
      </Seccion>

      <Seccion titulo="Competencias">
        <Texto multilinea filas={3} valor={p.competencias} set={(s) => upd((x) => { x.competencias = s; })} placeholder="Armas, armaduras, herramientas…" />
        {clase && <button className="btn enlace pequeno" onClick={() => upd((x) => {
          const a = clase.atributos;
          x.competencias = [`Armas: ${a.armas}`, `Armaduras: ${a.armaduras}`, a.herramientas && `Herramientas: ${a.herramientas}`].filter(Boolean).join('\n');
        })}>Rellenar desde la clase</button>}
      </Seccion>

      <Seccion titulo="Alineamiento">
        <Alineamiento p={p} set={(a) => upd((x) => { x.alineamiento = a; })} />
      </Seccion>

      <Seccion titulo="Idiomas" aviso={avisos.idiomas}>
        {idiomasFijos.length > 0 && (
          <ul className="idiomas-fijos">
            {idiomasFijos.map((i) => <li key={i.nombre} className="chip-idioma" title={i.origen}>{i.nombre}<small>{i.origen}</small></li>)}
          </ul>
        )}
        <Huecos huecos={HUECOS_IDIOMAS} valores={p.idiomas} set={(k, v) => upd((x) => { x.idiomas[k] = v; })} p={p} />
        {raza && /elecci[oó]n/i.test(raza.idiomas) && <p className="nota">Tu raza te da además un idioma a tu elección: escríbelo en un hueco.</p>}
      </Seccion>
      <div className="fila-2-tarjetas">
        <Seccion titulo="Oficios" aviso={avisos.oficios}>
          <Huecos huecos={HUECOS_OFICIOS} valores={p.oficios} set={(k, v) => upd((x) => { x.oficios[k] = v; })} p={p} />
        </Seccion>
        <Seccion titulo="Profesiones" aviso={avisos.profesiones}>
          <Huecos huecos={HUECOS_PROFESIONES} valores={p.profesiones} set={(k, v) => upd((x) => { x.profesiones[k] = v; })} p={p} />
        </Seccion>
      </div>

      {info === 'raza' && raza && (
        <Modal titulo={raza.nombre} onClose={() => setInfo(null)}>
          <TextoLargo texto={raza.descripcion} />
          <dl className="lista-datos"><dt>Características</dt><dd>{raza.caracteristicas}</dd><dt>Tamaño</dt><dd>{raza.tamano}</dd><dt>Velocidad</dt><dd>{raza.velocidad}</dd><dt>Idiomas</dt><dd>{raza.idiomas}</dd></dl>
          <h4>Rasgos fijos</h4>
          {raza.rasgosFijos.map((r) => <div key={r.nombre} className="rasgo"><strong>{r.nombre}.</strong> {r.texto}</div>)}
          <p className="nota">{raza.rasgosAdicionales}</p>
        </Modal>
      )}
      {info === 'clase' && clase && (
        <Modal titulo={clase.nombre} onClose={() => setInfo(null)}>
          <TextoLargo texto={clase.descripcion} />
          <dl className="lista-datos">
            <dt>Característica principal</dt><dd>{clase.atributos.caracteristicaPrincipal}</dd>
            <dt>Dado de golpe</dt><dd>1{clase.atributos.dadoGolpe} por nivel</dd>
            <dt>Salvaciones</dt><dd>{clase.atributos.salvaciones.map((s) => ABREV[s]).join(', ')}</dd>
            <dt>Habilidades ({clase.atributos.habilidadesN})</dt><dd>{clase.atributos.habilidades.includes('*') ? 'Cualquiera' : clase.atributos.habilidades.join(', ')}</dd>
            <dt>Armas</dt><dd>{clase.atributos.armas}</dd><dt>Armaduras</dt><dd>{clase.atributos.armaduras}</dd>
            {clase.atributos.herramientas && <><dt>Herramientas</dt><dd>{clase.atributos.herramientas}</dd></>}
            <dt>Equipo inicial</dt><dd>{clase.atributos.equipo}</dd>
          </dl>
          <TablaClase clase={clase} nivel={p.nivel} />
        </Modal>
      )}
      {info === 'trasfondo' && tras && (
        <Modal titulo={tras.nombre} onClose={() => setInfo(null)}>
          <TextoLargo texto={tras.descripcion} />
          <p>Competencia en <strong>{tras.habilidades.join(' y ')}</strong>.</p>
          <p>Dote de origen a elegir: {tras.dotes.join(', ')}.</p>
        </Modal>
      )}
    </div>
  );
}

export function TablaClase({ clase, nivel }: { clase: NonNullable<ReturnType<typeof buscarClase>>; nivel: number }) {
  return (
    <div className="tabla-scroll">
      <table className="tabla">
        <thead><tr><th>Nv</th><th>Rasgos</th>{clase.columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{clase.tabla.map((f) => (
          <tr key={f.nivel} className={f.nivel === nivel ? 'actual' : ''}><td>{f.nivel}</td><td>{f.rasgos}</td>{clase.columnas.map((c) => <td key={c}>{String(f[c] ?? '')}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const ORDENES = [['legal', 'Legal'], ['neutral', 'Neutral'], ['caotico', 'Caótico']] as const;
const MORALES = [['bueno', 'Bueno'], ['neutral', 'Neutral'], ['maligno', 'Maligno']] as const;
/** Rejilla de 15×15: cada bloque de 5×5 es uno de los 9 alineamientos clásicos. */
function Alineamiento({ p, set }: { p: Personaje; set: (a: Personaje['alineamiento']) => void }) {
  const a = p.alineamiento;
  const io = ORDENES.findIndex(([o]) => o === a.orden), im = MORALES.findIndex(([m]) => m === a.moral);
  const x = a.x ?? (io >= 0 ? io * 5 + 2 : -1), y = a.y ?? (im >= 0 ? im * 5 + 2 : -1);
  const nombre = x >= 0 && y >= 0 ? (() => {
    const o = ORDENES[Math.floor(x / 5)][1], m = MORALES[Math.floor(y / 5)][1];
    return o === 'Neutral' && m === 'Neutral' ? 'Neutral auténtico' : `${o} ${m.toLowerCase()}`;
  })() : '';
  return (
    <>
      <div className="alineamiento15">
        <div />
        {ORDENES.map(([, n]) => <div key={n} className="al-cab" style={{ gridColumn: 'span 5' }}>{n}</div>)}
        {Array.from({ length: 15 }, (_, fy) => (
          <Fragment key={fy}>
            {fy % 5 === 0 && <div className="al-cab lateral" style={{ gridRow: 'span 5' }}><span>{MORALES[fy / 5][1]}</span></div>}
            {Array.from({ length: 15 }, (_, fx) => {
              const sel = fx === x && fy === y;
              const zona = (Math.floor(fx / 5) + Math.floor(fy / 5)) % 2 ? 'b' : 'a';
              return <button key={fx} aria-label={`${fx + 1},${fy + 1}`} className={`al15 z${zona} ${fx % 5 === 4 && fx < 14 ? 'borde-d' : ''} ${fy % 5 === 4 && fy < 14 ? 'borde-b' : ''} ${sel ? 'sel' : ''}`}
                onClick={() => sel ? set({ orden: '', moral: '' }) : set({ orden: ORDENES[Math.floor(fx / 5)][0], moral: MORALES[Math.floor(fy / 5)][0], x: fx, y: fy })}>{sel ? '✕' : ''}</button>;
            })}
          </Fragment>
        ))}
      </div>
      <p className="nota centro">{nombre ? <>Alineamiento: <strong>{nombre}</strong></> : 'Toca una casilla.'}</p>
    </>
  );
}

function Huecos({ huecos, valores, set, p }: { huecos: readonly { id: string; etiqueta: string; atr: null | 'INT' | 'SAB'; min: number }[]; valores: Record<string, string>; set: (k: string, v: string) => void; p: Personaje }) {
  return (
    <ul className="huecos">
      {huecos.map((h) => {
        const disp = huecoDisponible(p, h);
        const vacio = !(valores[h.id] ?? '').trim();
        return (
          <li key={h.id} className={disp ? '' : 'bloqueado'}>
            <span className="hueco-etq">{h.etiqueta}{disp && vacio && h.atr && <PuntoRojo />}</span>
            <input className="campo" value={valores[h.id] ?? ''} placeholder={disp ? '' : `Necesitas ${h.atr} ${h.min}`} onChange={(e) => set(h.id, e.target.value)} />
          </li>
        );
      })}
    </ul>
  );
}

function ModalExperiencia({ onClose }: { onClose: () => void }) {
  const { p, upd } = useFicha();
  const [txt, setTxt] = useState('');
  const n = parseInt(txt, 10) || 0;
  const r = aplicarExperiencia(p.nivel, p.exp + n);
  const necesita = pxParaSubir(p.nivel);
  const aplicar = () => {
    if (!n) return;
    upd((x) => { const q = aplicarExperiencia(x.nivel, x.exp + n); cambiarNivel(x, q.nivel); x.exp = q.exp; });
    onClose();
  };
  return (
    <Modal titulo="Experiencia" onClose={onClose}
      pie={<button className="btn primario" disabled={!n} onClick={aplicar}>Añadir PX</button>}>
      <p className="nota">Nivel {p.nivel}: llevas <strong>{p.exp}</strong>{necesita !== null ? <> de <strong>{necesita}</strong> PX para subir a nivel {p.nivel + 1}.</> : ' PX (nivel máximo).'} Al subir, lo que sobra se queda como experiencia.</p>
      <form onSubmit={(e) => { e.preventDefault(); aplicar(); }}>
        <input className="campo grande" autoFocus inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, ''))} placeholder="PX ganados" />
      </form>
      {n > 0 && <p className="formula-grande">{p.exp} + {n} = <strong>{p.exp + n}</strong></p>}
      {n > 0 && r.subidos > 0 && <p className="exito">¡Subes a nivel {r.nivel}! Te quedan {r.exp} PX{pxParaSubir(r.nivel) !== null ? ` de ${pxParaSubir(r.nivel)}` : ''}. Tendrás que tirar tu dado de golpe para subir los PG.</p>}
      <details className="corregir">
        <summary>Corregir a mano</summary>
        <div className="fila-2">
          <Etiqueta texto="Nivel"><Numero valor={p.nivel} min={1} max={20} set={(v) => upd((x) => { cambiarNivel(x, v); })} /></Etiqueta>
          <Etiqueta texto="PX actuales"><Numero valor={p.exp} min={0} set={(v) => upd((x) => { x.exp = v; })} /></Etiqueta>
        </div>
      </details>
    </Modal>
  );
}
