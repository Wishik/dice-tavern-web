import { useFicha } from './Ficha';
import { Check, Numero, PuntoRojo, Seccion } from '../ui';
import { useDados } from '../dice';
import { HABILIDADES, conSigno, idHabilidad, valorHabilidad, valorSalvacion } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from '../types';
import { buscarClase } from '../avisos';

const GRUPOS = [['cognitivas', 'Habilidades cognitivas'], ['fisicas', 'Habilidades físicas'], ['sociales', 'Habilidades sociales']] as const;

export function TabHabilidades() {
  const { p, upd, clases, trasfondos, avisos } = useFicha();
  const { tirarD20 } = useDados();
  const clase = buscarClase(clases, p.clase);
  const sugeridas = new Set<string>();
  if (clase) (clase.atributos.habilidades.includes('*') ? HABILIDADES.map((h) => h.id) : clase.atributos.habilidades.map((h) => idHabilidad(h)).filter(Boolean) as string[]).forEach((x) => sugeridas.add(x));
  const deTrasfondo = new Set((trasfondos?.find((t) => t.nombre === p.trasfondoEstilo)?.habilidades ?? []).map((h) => idHabilidad(h)));

  return (
    <div className="tab">
      {avisos.habilidades > 0 && (
        <p className="aviso-rojo"><PuntoRojo /> Puedes elegir {avisos.habilidades} competencia{avisos.habilidades > 1 ? 's' : ''} más
          {clase && <> ({clase.atributos.habilidadesN} de {p.clase}{deTrasfondo.size ? ' + 2 del trasfondo' : ''})</>}. Las sugeridas por tu clase están marcadas con ◆.</p>
      )}
      <div className="fila-2-tarjetas">
        <div>
          {GRUPOS.slice(0, 1).map(([g, t]) => <Grupo key={g} grupo={g} titulo={t} sugeridas={sugeridas} />)}
          <Seccion titulo="Salvaciones">
            <ul className="lista-tiradas">
              {ATRIBUTOS.map((a) => {
                const v = valorSalvacion(p, a);
                return (
                  <li key={a}>
                    <Check valor={p.salvaciones[a].comp} set={(b) => upd((x) => { x.salvaciones[a].comp = b; })} titulo="Competencia" />
                    <span className="lt-nombre">{NOMBRE_ATRIBUTO[a]}</span>
                    <Numero valor={p.salvaciones[a].bonus} set={(n) => upd((x) => { x.salvaciones[a].bonus = n; })} className="mini" />
                    <button className="lt-valor" onClick={() => tirarD20(`Salvación de ${NOMBRE_ATRIBUTO[a]}`, v)}>{conSigno(v)}</button>
                  </li>
                );
              })}
            </ul>
            <div className="muerte">
              <span>Contra muerte</span>
              <div className="fila-muerte">
                {[0, 1, 2].map((i) => <button key={'e' + i} className={`corazon ${p.muerte.exitos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.exitos = x.muerte.exitos > i ? i : i + 1; })}>♥</button>)}
              </div>
              <div className="fila-muerte">
                {[0, 1, 2].map((i) => <button key={'f' + i} className={`calavera ${p.muerte.fallos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.fallos = x.muerte.fallos > i ? i : i + 1; })}>☠</button>)}
              </div>
              <button className="btn" onClick={() => tirarD20('Salvación contra muerte', 0)}>Tirar</button>
            </div>
          </Seccion>
        </div>
        <div>{GRUPOS.slice(1).map(([g, t]) => <Grupo key={g} grupo={g} titulo={t} sugeridas={sugeridas} />)}</div>
      </div>
      <p className="nota">C = competencia, P = pericia. La casilla pequeña es un bonus extra (p. ej. +2 a Sigilo de los Medianos).</p>
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
          return (
            <li key={h.id}>
              <Check valor={st.comp} set={(b) => upd((x) => { x.habilidades[h.id].comp = b; if (!b) x.habilidades[h.id].pericia = false; })} titulo="Competencia" />
              <Check valor={st.pericia} set={(b) => upd((x) => { x.habilidades[h.id].pericia = b; if (b) x.habilidades[h.id].comp = true; })} titulo="Pericia" />
              <span className="lt-nombre">{h.nombre} <small>({h.atributo.slice(0, 3)})</small>{sugeridas.has(h.id) && !st.comp && <span className="sugerida">◆</span>}</span>
              <Numero valor={st.bonus} set={(n) => upd((x) => { x.habilidades[h.id].bonus = n; })} className="mini" />
              <button className="lt-valor" onClick={() => tirarD20(h.nombre, v)}>{conSigno(v)}</button>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}
