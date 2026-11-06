import { useFicha } from './Ficha';
import { useState } from 'react';
import { Etiqueta, Modal, Numero, Seccion, Texto } from '../ui';
import { Contador, useDados } from '../dice';
import { CONJUNTO_ESTANDAR, aplicarConjuntoEstandar, avisosTirada, bonoCompetencia, calcularCA, conSigno, estadoCarga, iniciativa, modificador, percepcionPasiva, pgPorDefecto, valorPrueba } from '../rules';
import { bonoVelocidad } from '../bonos';
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
  const vel = bonoVelocidad(p);
  const ajusteVel = (base: number, mult: number) => {
    const d = vel * mult + pen * mult;
    return d !== 0 && <b className={d < 0 ? 'penal' : 'extra'}> ({[vel && `+${vel * mult} rasgos`, pen && `${pen * mult} carga`].filter(Boolean).join(', ')}) = {Math.max(0, base + d)}</b>;
  };
  const [corregir, setCorregir] = useState(false);
  const ca = calcularCA(p);
  const pgDef = pgPorDefecto(p, dado);

  return (
    <div className="tab">
      <div className="fila-3-tarjetas">
        <Seccion titulo="PG (vida)" className="pg">
          <div className="pg-actual">
            <Contador valor={p.pg.actual} set={(n) => upd((x) => { x.pg.actual = Math.min(n, x.pg.max); })} min={-99} max={p.pg.max} />
            <button className="de enlace-max" onClick={() => setCorregir(true)} title="Corregir máximo">/ {p.pg.max}</button>
          </div>
          <Etiqueta texto="Temporales"><Numero valor={p.pg.temp} min={0} set={(n) => upd((x) => { x.pg.temp = n; })} /></Etiqueta>
          {corregir && (
            <Modal titulo="Corregir PG máximos" onClose={() => setCorregir(false)}>
              <p className="nota">Los PG máximos suben solos al tirar el dado de golpe al subir de nivel. Cámbialos aquí solo si hay que corregir algo.</p>
              <Etiqueta texto="PG máximos"><Numero valor={p.pg.max} min={1} set={(n) => upd((x) => { x.pg.max = n; x.pg.actual = Math.min(x.pg.actual, n); })} /></Etiqueta>
            </Modal>
          )}
          {pgDef > 0 && p.nivel === 1 && p.pg.max !== pgDef && (
            <button className="btn enlace pequeno" onClick={() => upd((x) => { const sube = x.pg.actual === x.pg.max || x.pg.actual === 0; x.pg.max = pgDef; if (sube) x.pg.actual = pgDef; })}>↺ Por defecto: {pgDef}</button>
          )}
          <div className="barra-vida"><div style={{ width: `${p.pg.max ? Math.max(0, Math.min(100, (p.pg.actual / p.pg.max) * 100)) : 0}%` }} /></div>
        </Seccion>
        {p.pm.max > 0 && (
          <Seccion titulo="Maná" className="pg mana">
            <div className="pg-actual">
              <Contador valor={p.pm.actual} set={(n) => upd((x) => { x.pm.actual = Math.max(0, Math.min(n, x.pm.max)); })} min={0} max={p.pm.max} />
              <span className="de">/ {p.pm.max}</span>
            </div>
            <div className="barra-vida barra-mana"><div style={{ width: `${Math.max(0, Math.min(100, (p.pm.actual / p.pm.max) * 100))}%` }} /></div>
            <p className="nota pequena centro">Por {p.clase} nivel {p.nivel}. Se recupera con descanso largo.</p>
          </Seccion>
        )}
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
            <button className="btn dado-pequeno" disabled={!dado} onClick={() => dado && tirar(`Dado de golpe (${dado})`, `1${dado}`)}>{dado ? `1${dado}` : 'D'}</button>
            <span>{Math.max(0, p.nivel - p.dgUsados)} / {p.nivel}</span>
          </div>
          <div className="fila-botones pequena">
            <button className="btn" onClick={() => upd((x) => { x.dgUsados = Math.min(x.nivel, x.dgUsados + 1); })}>Gastar</button>
            <button className="btn" onClick={() => upd((x) => { x.dgUsados = 0; x.pm.actual = x.pm.max; })}>Descanso largo</button>
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
              <button className="car-mod" onClick={() => tirarD20(`Prueba de ${NOMBRE_ATRIBUTO[a]}`, valorPrueba(p, a), avisosTirada(p, 'prueba', a))} title="Tirar prueba">{conSigno(m)}{valorPrueba(p, a) !== m && <small className="extra-rasgo">{conSigno(valorPrueba(p, a) - m)}</small>}</button>
            </div>
          );
        })}
      </div>
      <p className="nota centro">Toca el modificador para tirar 1d20.</p>
      {CONJUNTO_ESTANDAR[p.clase] && (
        <p className="nota centro"><button className="btn enlace pequeno" onClick={() => { if (confirm(`¿Poner el conjunto estándar de ${p.clase} (${CONJUNTO_ESTANDAR[p.clase].join(', ')})?`)) upd((x) => { aplicarConjuntoEstandar(x, x.clase); }); }}>↺ Conjunto estándar de {p.clase}</button></p>
      )}

      <div className="fila-3-tarjetas">
        <Seccion titulo="Iniciativa">
          <button className="valor-grande tirable" onClick={() => tirarD20('Iniciativa', iniciativa(p), avisosTirada(p, 'prueba', 'DES'))}>{conSigno(iniciativa(p))}</button>
          <Etiqueta texto="Bonus extra"><Numero valor={p.bonusIniciativa} set={(n) => upd((x) => { x.bonusIniciativa = n; })} /></Etiqueta>
        </Seccion>
        <Seccion titulo="Competencia">
          <div className="bonif-comp">
            {[1, 5, 9, 13, 17].map((n, i) => <div key={n} className={bc === i + 2 ? 'activo' : ''}><small>Nv {n}+</small><strong>+{i + 2}</strong></div>)}
          </div>
        </Seccion>
        <Seccion titulo="CA">
          <div className="valor-grande">{ca.total}</div>
          <p className="nota pequena centro">{ca.partes.join(' · ')}</p>
          <Etiqueta texto="Ajuste"><Numero valor={p.bonusCA} set={(n) => upd((x) => { x.bonusCA = n; })} /></Etiqueta>
        </Seccion>
      </div>

      <div className="fila-2-tarjetas">
        <Seccion titulo="Velocidad">
          <ul className="velocidades">
            <li><span>Andando</span><Numero valor={p.velocidad.andando} min={0} set={(n) => upd((x) => { x.velocidad.andando = n; })} ancho={64} />
              <span className="pies">pies{ajusteVel(p.velocidad.andando, 1)}</span></li>
            <li><span>Corriendo</span><Numero valor={p.velocidad.corriendo} min={0} set={(n) => upd((x) => { x.velocidad.corriendo = n; })} ancho={64} />
              <span className="pies">pies{ajusteVel(p.velocidad.corriendo, 2)}</span></li>
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
