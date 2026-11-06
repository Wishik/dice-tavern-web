import { useFicha } from './Ficha';
import { Seccion, Texto } from '../ui';

export function TabNotas() {
  const { p, upd } = useFicha();
  return (
    <div className="tab">
      <Seccion titulo="Notas y mapas">
        <Texto multilinea className="cuaderno" filas={18} valor={p.notas} set={(v) => upd((x) => { x.notas = v; })}
          placeholder="Nombres de PNJ, pistas, misiones… (🎙 para dictar)" />
      </Seccion>
    </div>
  );
}
