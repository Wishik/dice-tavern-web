import { useFicha } from './Ficha';
import { Seccion } from '../ui';

export function TabNotas() {
  const { p, upd } = useFicha();
  return (
    <div className="tab">
      <Seccion titulo="Notas y mapas">
        <textarea className="campo cuaderno" rows={18} value={p.notas} onChange={(e) => upd((x) => { x.notas = e.target.value; })}
          placeholder="Nombres de PNJ, pistas, misiones…" />
      </Seccion>
    </div>
  );
}
