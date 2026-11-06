import { useFicha } from './Ficha';
import { Check, Numero, PuntoRojo, Seccion } from '../ui';
import { useDados } from '../dice';
import { HABILIDADES, avisosTirada, conSigno, idHabilidad, valorHabilidad, valorSalvacion } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from '../types';
import { buscarClase } from '../avisos';
import { bonoHabilidad, bonoSalvacion } from '../bonos';

const GRUPOS = [['cognitivas', 'Habilidades cognitivas'], ['fisicas', 'Habilidades físicas'], ['sociales', 'Habilidades sociales']] as const;

export function TabHabilidades() {
  const { p, upd, clases, trasfondos, avisos } = useFicha();
  const { tirarD20 } = useDados();
  const clase = buscarClase(clases, p.clase);
  const sugeridas = new Set<string>();
  if (clase) (clase.atributos.habilidades.includes('*') ? HABILIDADES.map((h) => h.id) : clase.atributos.habilidades.map((h) => idHabilidad(h)).filter(Boolean) as string[]).forEach((x) => sugeridas.add(x));
  const nComp = Object.values(p.habilidades).filter((h) => h.comp).length;
  const nPericia = Object.values(p.habilidades).filter((h) => h.pericia).length;
  const esperadas = (clase?.atributos.habilidadesN ?? 0) + (trasfondos?.find((t) => t.nombre === p.trasfondoEstilo)?.habilidades.length ?? 0);
  const periciasEsperadas = clase ? clase.tabla.filter((f) => f.nivel <= p.nivel && /\bPericia\b/.test(f.rasgos)).length * 2 : 0;
  const deTrasfondo = new Set((trasfondos?.find((t) => t.nombre === p.trasfondoEstilo)?.habilidades ?? []).map((h) => idHabilidad(h)));

  return (
    <div className="tab">
      <Seccion titulo="Límites">
        {!clase ? <p className="nota">Elige tu clase en la pestaña Personaje para ver cuántas competencias te tocan.</p> : (
          <ul className="limites">
            <li className={nComp > esperadas ? 'pasado' : nComp < esperadas ? 'falta' : 'ok'}>
              <span>Competencias</span><strong>{nComp} / {esperadas}</strong>
              <small>{clase.atributos.habilidadesN} de {p.clase}{deTrasfondo.size ? ` + ${deTrasfondo.size} del trasfondo` : ''}{avisos.habilidades > 0 && <> · <PuntoRojo /> te faltan {avisos.habilidades}</>}</small>
            </li>
            {periciasEsperadas > 0 && (
              <li className={nPericia > periciasEsperadas ? 'pasado' : nPericia < periciasEsperadas ? 'falta' : 'ok'}>
                <span>Pericias</span><strong>{nPericia} / {periciasEsperadas}</strong>
                <small>Por el rasgo «Pericia» de {p.clase} hasta nivel {p.nivel}{nPericia < periciasEsperadas && <> · <PuntoRojo /> te faltan {periciasEsperadas - nPericia}</>}</small>
              </li>
            )}
          </ul>
        )}
        {clase && <p className="nota pequena">◆ = habilidades que ofrece tu clase. Las razas y dotes pueden darte más: puedes marcar de más, solo se avisa.</p>}
      </Seccion>
      <div className="fila-2-tarjetas">
        <div>{GRUPOS.slice(0, 1).map(([g, t]) => <Grupo key={g} grupo={g} titulo={t} sugeridas={sugeridas} />)}</div>
        <div>{GRUPOS.slice(1).map(([g, t]) => <Grupo key={g} grupo={g} titulo={t} sugeridas={sugeridas} />)}</div>
      </div>
      <Seccion titulo="Salvaciones">
        <ul className="lista-tiradas">
          {ATRIBUTOS.map((a) => {
            const v = valorSalvacion(p, a);
            return (
              <li key={a}>
                <Check valor={p.salvaciones[a].comp} set={(b) => upd((x) => { x.salvaciones[a].comp = b; })} titulo="Competencia" />
                <span className="lt-nombre">{NOMBRE_ATRIBUTO[a]}{bonoSalvacion(p, a) !== 0 && <small className="por-rasgo">★ rasgos {conSigno(bonoSalvacion(p, a))}</small>}</span>
                <Numero valor={p.salvaciones[a].bonus} set={(n) => upd((x) => { x.salvaciones[a].bonus = n; })} className="mini" />
                <button className="lt-valor" onClick={() => tirarD20(`Salvación de ${NOMBRE_ATRIBUTO[a]}`, v, avisosTirada(p, 'salvacion', a))}>{conSigno(v)}</button>
              </li>
            );
          })}
        </ul>
        <div className="muerte">
          <span>Contra muerte</span>
          <div className="fila-muerte">
            {[0, 1, 2].map((i) => <button key={'e' + i} className={`corazon ${p.muerte.exitos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.exitos = x.muerte.exitos > i ? i : i + 1; })}>{'\u2665\uFE0E'}</button>)}
          </div>
          <div className="fila-muerte">
            {[0, 1, 2].map((i) => <button key={'f' + i} className={`calavera ${p.muerte.fallos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.fallos = x.muerte.fallos > i ? i : i + 1; })}>{'\u2620\uFE0E'}</button>)}
          </div>
          <button className="btn" onClick={() => tirarD20('Salvación contra muerte', 0)}>Tirar</button>
        </div>
      </Seccion>
      <p className="nota">C = competencia, P = pericia. La casilla pequeña es un bonus extra a mano. Los bonos de raza y dotes (★) ya se suman solos: no los repitas aquí.</p>
    </div>
  );
}

function Grupo({ grupo, titulo, sugeridas }: { grupo: string; titulo: string; sugeridas: Set<string> }) {
  const { p, upd } = useFicha();
  const { tirarD20 } = useDados();
  return (
    <Seccion titulo={titulo}>
      <div className="cab-cp"><span>C</span><span>P</span></div>
      <ul className="lista-tiradas">
        {HABILIDADES.filter((h) => h.grupo === grupo).map((h) => {
          const st = p.habilidades[h.id];
          const v = valorHabilidad(p, h.id);
          const r = bonoHabilidad(p, h.id, st.comp);
          return (
            <li key={h.id} className={r.origen.length ? 'con-rasgo' : ''}>
              <Check valor={st.comp} set={(b) => upd((x) => { x.habilidades[h.id].comp = b; if (!b) x.habilidades[h.id].pericia = false; })} titulo="Competencia" />
              <Check valor={st.pericia} set={(b) => upd((x) => { x.habilidades[h.id].pericia = b; if (b) x.habilidades[h.id].comp = true; })} titulo="Pericia" />
              <span className="lt-nombre">{h.nombre} <small>({h.atributo.slice(0, 3)})</small>{sugeridas.has(h.id) && !st.comp && !r.comp && <span className="sugerida">◆</span>}
                {r.origen.length > 0 && <small className="por-rasgo">★ {r.origen.join(', ')}</small>}</span>
              <Numero valor={st.bonus} set={(n) => upd((x) => { x.habilidades[h.id].bonus = n; })} className="mini" />
              <button className="lt-valor" onClick={() => tirarD20(h.nombre, v, [...r.notas, ...avisosTirada(p, 'habilidad', h.atributo, h.id)])}>{conSigno(v)}</button>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}
