import { useFicha } from './Ficha';
import { Etiqueta, Numero, Seccion, Texto } from '../ui';
import { Contador, useDados } from '../dice';
import { bonoCompetencia, conSigno, estadoCarga, iniciativa, modificador, percepcionPasiva } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from '../types';
import { buscarClase } from '../avisos';

export function TabAtributos() {
  const { p, upd, clases } = useFicha();
  const { tirarD20, tirar } = useDados();
  const carga = estadoCarga(p);
  const bc = bonoCompetencia(p.nivel);
  const clase = buscarClase(clases, p.clase);
  const dado = clase?.atributos.dadoGolpe ?? '';
  const pen = carga.penalizacion;

  return (
    <div className="tab">
      <div className="fila-3-tarjetas">
        <Seccion titulo="PG (vida)" className="pg">
          <div className="pg-actual">
            <Contador valor={p.pg.actual} set={(n) => upd((x) => { x.pg.actual = n; })} min={-99} max={999} />
            <span className="de">/ {p.pg.max}</span>
          </div>
          <div className="fila-2">
            <Etiqueta texto="Máximos"><Numero valor={p.pg.max} min={0} set={(n) => upd((x) => { x.pg.max = n; })} /></Etiqueta>
            <Etiqueta texto="Temporales"><Numero valor={p.pg.temp} min={0} set={(n) => upd((x) => { x.pg.temp = n; })} /></Etiqueta>
          </div>
          <div className="barra-vida"><div style={{ width: `${p.pg.max ? Math.max(0, Math.min(100, (p.pg.actual / p.pg.max) * 100)) : 0}%` }} /></div>
        </Seccion>
        <Seccion titulo="Inspiración">
          <div className="fila-inspiracion">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} className={`inspiracion ${p.inspiracion > i ? 'activa' : ''}`} aria-label={`${i + 1}`}
                onClick={() => upd((x) => { x.inspiracion = x.inspiracion === i + 1 ? i : i + 1; })}>✦</button>
            ))}
          </div>
          <p className="nota centro">{p.inspiracion ? `${p.inspiracion} de 4` : 'Sin inspiración'}</p>
        </Seccion>
        <Seccion titulo="DG">
          <div className="dg">
            <button className="btn dado-pequeno" disabled={!dado} onClick={() => dado && tirar(`Dado de golpe (${dado})`, `1${dado}${conSigno(modificador(p.caracteristicas.CON))}`)}>{dado ? `1${dado}` : 'D'}</button>
            <span>{Math.max(0, p.nivel - p.dgUsados)} / {p.nivel}</span>
          </div>
          <div className="fila-botones pequena">
            <button className="btn" onClick={() => upd((x) => { x.dgUsados = Math.min(x.nivel, x.dgUsados + 1); })}>Gastar</button>
            <button className="btn" onClick={() => upd((x) => { x.dgUsados = 0; })}>Descanso largo</button>
          </div>
        </Seccion>
      </div>

      <div className="rejilla-caracteristicas">
        {ATRIBUTOS.map((a) => {
          const m = modificador(p.caracteristicas[a]);
          return (
            <div key={a} className="caracteristica">
              <div className="car-nombre">{NOMBRE_ATRIBUTO[a]}</div>
              <Numero valor={p.caracteristicas[a]} min={1} max={30} set={(n) => upd((x) => { x.caracteristicas[a] = n; })} className="car-valor" />
              <button className="car-mod" onClick={() => tirarD20(`Prueba de ${NOMBRE_ATRIBUTO[a]}`, m)} title="Tirar prueba">{conSigno(m)}</button>
            </div>
          );
        })}
      </div>
      <p className="nota centro">Toca el modificador para tirar 1d20.</p>

      <div className="fila-3-tarjetas">
        <Seccion titulo="Iniciativa">
          <button className="valor-grande tirable" onClick={() => tirarD20('Iniciativa', iniciativa(p))}>{conSigno(iniciativa(p))}</button>
          <Etiqueta texto="Bonus extra"><Numero valor={p.bonusIniciativa} set={(n) => upd((x) => { x.bonusIniciativa = n; })} /></Etiqueta>
        </Seccion>
        <Seccion titulo="Competencia">
          <div className="bonif-comp">
            {[1, 5, 9, 13, 17].map((n, i) => <div key={n} className={bc === i + 2 ? 'activo' : ''}><small>Nv {n}+</small><strong>+{i + 2}</strong></div>)}
          </div>
        </Seccion>
        <Seccion titulo="CA">
          <input className="campo valor-grande" value={p.ca} inputMode="numeric" onChange={(e) => upd((x) => { x.ca = e.target.value; })} placeholder="—" />
        </Seccion>
      </div>

      <div className="fila-2-tarjetas">
        <Seccion titulo="Velocidad">
          <ul className="velocidades">
            <li><span>Andando</span><Numero valor={p.velocidad.andando} min={0} set={(n) => upd((x) => { x.velocidad.andando = n; })} ancho={64} />
              <span className="pies">pies{pen < 0 && <b className="penal"> ({pen}) = {Math.max(0, p.velocidad.andando + pen)}</b>}</span></li>
            <li><span>Corriendo</span><Numero valor={p.velocidad.corriendo} min={0} set={(n) => upd((x) => { x.velocidad.corriendo = n; })} ancho={64} />
              <span className="pies">pies{pen < 0 && <b className="penal"> ({pen * 2}) = {Math.max(0, p.velocidad.corriendo + pen * 2)}</b>}</span></li>
            <li><span>Trepando</span><Texto valor={p.velocidad.trepando} set={(s) => upd((x) => { x.velocidad.trepando = s; })} /></li>
            <li><span>Nadando</span><Texto valor={p.velocidad.nadando} set={(s) => upd((x) => { x.velocidad.nadando = s; })} /></li>
            <li><span>Volando</span><Texto valor={p.velocidad.volando} set={(s) => upd((x) => { x.velocidad.volando = s; })} /></li>
          </ul>
          {pen < 0 && <p className="aviso-carga">Mochila sobrecargada ({carga.usados}/{carga.libres} espacios). {carga.efecto}</p>}
        </Seccion>
        <div>
          <Seccion titulo="Percepción pasiva">
            <div className="formula-pasiva">10 {conSigno(percepcionPasiva(p) - 10)} = <strong>{percepcionPasiva(p)}</strong></div>
            <Etiqueta texto="Ajuste"><Numero valor={p.bonusPercepcionPasiva} set={(n) => upd((x) => { x.bonusPercepcionPasiva = n; })} /></Etiqueta>
          </Seccion>
          <Seccion titulo="Recursos">
            <Texto multilinea filas={4} valor={p.recursos} set={(s) => upd((x) => { x.recursos = s; })} placeholder="Furias, puntos de ki, usos por descanso…" />
          </Seccion>
        </div>
      </div>
    </div>
  );
}
