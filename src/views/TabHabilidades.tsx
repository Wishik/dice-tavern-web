import { useFicha } from './Ficha';
import { Check, Numero, PuntoRojo, Seccion } from '../ui';
import { useDados } from '../dice';
import { HABILIDADES, avisosTirada, conSigno, idHabilidad, valorHabilidad, valorSalvacion } from '../rules';
import { ATRIBUTOS, NOMBRE_ATRIBUTO } from '../types';
import { buscarClase } from '../avisos';
import { bonoHabilidad, bonoSalvacion } from '../bonos';
import { L, T, RU_ATRIBUTOS, RU_CLASES, RU_HABILIDADES, RU_NOMBRE_ATRIBUTO } from '../i18n';

const GRUPOS = [['cognitivas', 'Habilidades cognitivas', 'Умственные навыки'], ['fisicas', 'Habilidades físicas', 'Физические навыки'], ['sociales', 'Habilidades sociales', 'Социальные навыки']] as const;

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
        {!clase ? <p className="nota">{L('Elige tu clase en la pestaña Personaje para ver cuántas competencias te tocan.', 'Выбери класс на вкладке «Персонаж», чтобы увидеть, сколько владений положено.')}</p> : (
          <ul className="limites">
            <li className={nComp > esperadas ? 'pasado' : nComp < esperadas ? 'falta' : 'ok'}>
              <span>{L('Competencias', 'Владения')}</span><strong>{nComp} / {esperadas}</strong>
              <small>{clase.atributos.habilidadesN} {L('de', 'от')} {T(RU_CLASES, p.clase)}{deTrasfondo.size ? L(` + ${deTrasfondo.size} del trasfondo`, ` + ${deTrasfondo.size} от предыстории`) : ''}{avisos.habilidades > 0 && <> · <PuntoRojo /> {L('te faltan', 'не хватает')} {avisos.habilidades}</>}</small>
            </li>
            {periciasEsperadas > 0 && (
              <li className={nPericia > periciasEsperadas ? 'pasado' : nPericia < periciasEsperadas ? 'falta' : 'ok'}>
                <span>{L('Pericias', 'Компетентность')}</span><strong>{nPericia} / {periciasEsperadas}</strong>
                <small>{L(`Por el rasgo «Pericia» de ${p.clase} hasta nivel ${p.nivel}`, `За умение «Компетентность» (${T(RU_CLASES, p.clase)}) до ${p.nivel} уровня`)}{nPericia < periciasEsperadas && <> · <PuntoRojo /> {L('te faltan', 'не хватает')} {periciasEsperadas - nPericia}</>}</small>
              </li>
            )}
          </ul>
        )}
        {clase && <p className="nota pequena">{L('◆ = habilidades que ofrece tu clase. Las razas y dotes pueden darte más: puedes marcar de más, solo se avisa.', '◆ = навыки, которые даёт твой класс. Раса и черты могут дать больше: можно отметить лишние, будет только предупреждение.')}</p>}
      </Seccion>
      <div className="fila-2-tarjetas">
        <div>{GRUPOS.slice(0, 1).map(([g, t, tru]) => <Grupo key={g} grupo={g} titulo={L(t, tru)} sugeridas={sugeridas} />)}</div>
        <div>{GRUPOS.slice(1).map(([g, t, tru]) => <Grupo key={g} grupo={g} titulo={L(t, tru)} sugeridas={sugeridas} />)}</div>
      </div>
      <Seccion titulo="Salvaciones">
        <ul className="lista-tiradas">
          {ATRIBUTOS.map((a) => {
            const v = valorSalvacion(p, a);
            return (
              <li key={a}>
                <Check valor={p.salvaciones[a].comp} set={(b) => upd((x) => { x.salvaciones[a].comp = b; })} titulo="Competencia" />
                <span className="lt-nombre">{T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}{bonoSalvacion(p, a) !== 0 && <small className="por-rasgo">★ {L('rasgos', 'особенности')} {conSigno(bonoSalvacion(p, a))}</small>}</span>
                <Numero valor={p.salvaciones[a].bonus} set={(n) => upd((x) => { x.salvaciones[a].bonus = n; })} className="mini" />
                <button className="lt-valor" onClick={() => tirarD20(L(`Salvación de ${NOMBRE_ATRIBUTO[a]}`, `Спасбросок: ${T(RU_NOMBRE_ATRIBUTO, NOMBRE_ATRIBUTO[a])}`), v, avisosTirada(p, 'salvacion', a))}>{conSigno(v)}</button>
              </li>
            );
          })}
        </ul>
        <div className="muerte">
          <span>{L('Contra muerte', 'От смерти')}</span>
          <div className="fila-muerte">
            {[0, 1, 2].map((i) => <button key={'e' + i} className={`corazon ${p.muerte.exitos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.exitos = x.muerte.exitos > i ? i : i + 1; })}>{'\u2665\uFE0E'}</button>)}
          </div>
          <div className="fila-muerte">
            {[0, 1, 2].map((i) => <button key={'f' + i} className={`calavera ${p.muerte.fallos > i ? 'on' : ''}`} onClick={() => upd((x) => { x.muerte.fallos = x.muerte.fallos > i ? i : i + 1; })}>{'\u2620\uFE0E'}</button>)}
          </div>
          <button className="btn" onClick={() => tirarD20(L('Salvación contra muerte', 'Спасбросок от смерти'), 0)}>{L('Tirar', 'Бросить')}</button>
        </div>
      </Seccion>
      <p className="nota">{L('C = competencia, P = pericia. La casilla pequeña es un bonus extra a mano. Los bonos de raza y dotes (★) ya se suman solos: no los repitas aquí.', 'В = владение, К = компетентность. Маленькое поле — дополнительный бонус вручную. Бонусы расы и черт (★) уже прибавлены сами: не дублируй их здесь.')}</p>
    </div>
  );
}

function Grupo({ grupo, titulo, sugeridas }: { grupo: string; titulo: string; sugeridas: Set<string> }) {
  const { p, upd } = useFicha();
  const { tirarD20 } = useDados();
  return (
    <Seccion titulo={titulo}>
      <div className="cab-cp"><span>{L('C', 'В')}</span><span>{L('P', 'К')}</span></div>
      <ul className="lista-tiradas">
        {HABILIDADES.filter((h) => h.grupo === grupo).map((h) => {
          const st = p.habilidades[h.id];
          const v = valorHabilidad(p, h.id);
          const r = bonoHabilidad(p, h.id, st.comp);
          return (
            <li key={h.id} className={r.origen.length ? 'con-rasgo' : ''}>
              <Check valor={st.comp} set={(b) => upd((x) => { x.habilidades[h.id].comp = b; if (!b) x.habilidades[h.id].pericia = false; })} titulo="Competencia" />
              <Check valor={st.pericia} set={(b) => upd((x) => { x.habilidades[h.id].pericia = b; if (b) x.habilidades[h.id].comp = true; })} titulo="Pericia" />
              <span className="lt-nombre">{T(RU_HABILIDADES, h.id) === h.id ? h.nombre : T(RU_HABILIDADES, h.id)} <small>({T(RU_ATRIBUTOS, h.atributo.slice(0, 3))})</small>{sugeridas.has(h.id) && !st.comp && !r.comp && <span className="sugerida">◆</span>}
                {r.origen.length > 0 && <small className="por-rasgo">★ {r.origen.join(', ')}</small>}</span>
              <Numero valor={st.bonus} set={(n) => upd((x) => { x.habilidades[h.id].bonus = n; })} className="mini" />
              <button className="lt-valor" onClick={() => tirarD20(T(RU_HABILIDADES, h.id) === h.id ? h.nombre : T(RU_HABILIDADES, h.id), v, [...r.notas, ...avisosTirada(p, 'habilidad', h.atributo, h.id)])}>{conSigno(v)}</button>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}
