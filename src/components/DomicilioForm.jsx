import { useEffect, useRef, useState } from 'react';
import { buscarCodigoPostal } from '../api/codigosPostales';

export const PAIS_DEFAULT = 'México';

export const domicilioVacio = () => ({
  calle: '', numeroExterior: '', numeroInterior: '', colonia: '',
  municipio: '', estado: '', pais: PAIS_DEFAULT, codigoPostal: '',
});

/** Normaliza lo que llega del backend (null en registros anteriores) a un objeto editable. */
export function domicilioDesde(d) {
  const base = domicilioVacio();
  if (!d) return base;
  return Object.fromEntries(Object.keys(base).map((k) => [k, d[k] ?? base[k]]));
}

/** Mismas reglas que DomicilioDto en el backend. Regresa { campo: mensaje }. */
export function validarDomicilio(d) {
  const e = {};
  if (!/^\d{5}$/.test(d.codigoPostal || '')) e.codigoPostal = 'Captura un código postal de 5 dígitos';
  if (!d.calle?.trim()) e.calle = 'La calle es obligatoria';
  if (!d.numeroExterior?.trim()) e.numeroExterior = 'El número exterior es obligatorio';
  if (!d.colonia?.trim()) e.colonia = 'La colonia es obligatoria';
  if (!d.municipio?.trim()) e.municipio = 'El municipio es obligatorio';
  if (!d.estado?.trim()) e.estado = 'El estado es obligatorio';
  if (!d.pais?.trim()) e.pais = 'El país es obligatorio';
  return e;
}

/** Errores de validacion del backend ({ "domicilio.calle": "..." }) -> { calle: "..." }. */
export function erroresDomicilioDelServidor(data) {
  if (!data || typeof data !== 'object') return {};
  const e = {};
  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith('domicilio.')) e[k.slice('domicilio.'.length)] = v;
    else if (k === 'domicilio') e.calle = v;
  });
  return e;
}

const OTRA = '__otra__';

/**
 * Formulario de domicilio (México). Al capturar el C.P. consulta el catálogo de SEPOMEX y
 * llena estado y municipio, y ofrece las colonias de ese C.P. en un selector.
 */
export default function DomicilioForm({ value, onChange, errors = {} }) {
  const [catalogo, setCatalogo] = useState(null); // { codigoPostal, estados, municipios, colonias }
  const [buscando, setBuscando] = useState(false);
  const [cpError, setCpError] = useState('');
  const [coloniaManual, setColoniaManual] = useState(false);
  const ultimaBusqueda = useRef('');

  const set = (campo, v) => onChange({ ...value, [campo]: v });

  async function consultar(cp, { rellenar }) {
    ultimaBusqueda.current = cp;
    setBuscando(true);
    setCpError('');
    try {
      const { data } = await buscarCodigoPostal(cp);
      if (ultimaBusqueda.current !== cp) return;
      const info = data.data;
      setCatalogo(info);
      const coloniaExiste = info.colonias.some((c) => c.nombre === value.colonia);
      setColoniaManual(!!value.colonia && !coloniaExiste);
      if (rellenar) {
        const unica = info.colonias.length === 1 ? info.colonias[0] : null;
        onChange({
          ...value,
          codigoPostal: cp,
          estado: info.estados.length === 1 ? info.estados[0] : '',
          municipio: info.municipios.length === 1 ? info.municipios[0] : '',
          colonia: unica ? unica.nombre : (coloniaExiste ? value.colonia : ''),
          pais: value.pais || PAIS_DEFAULT,
        });
        setColoniaManual(false);
      }
    } catch (err) {
      if (ultimaBusqueda.current !== cp) return;
      setCatalogo(null);
      setCpError(err.response?.status === 404
        ? 'No encontramos ese código postal. Revisa que esté bien escrito.'
        : 'No se pudo consultar el código postal. Captura los datos a mano.');
    } finally {
      if (ultimaBusqueda.current === cp) setBuscando(false);
    }
  }

  // Al abrir un domicilio ya capturado, carga sus colonias sin tocar lo guardado.
  useEffect(() => {
    if (/^\d{5}$/.test(value.codigoPostal || '')) consultar(value.codigoPostal, { rellenar: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarCp(raw) {
    const cp = raw.replace(/\D/g, '').slice(0, 5);
    onChange({ ...value, codigoPostal: cp });
    if (cp.length === 5) {
      consultar(cp, { rellenar: true });
    } else {
      ultimaBusqueda.current = '';
      setCatalogo(null);
      setCpError('');
      setBuscando(false);
    }
  }

  function elegirColonia(nombre) {
    if (nombre === OTRA) {
      setColoniaManual(true);
      set('colonia', '');
      return;
    }
    const c = catalogo?.colonias.find((x) => x.nombre === nombre);
    // Un C.P. que cruza municipios: la colonia elegida define municipio/estado.
    onChange({ ...value, colonia: nombre, ...(c ? { municipio: c.municipio, estado: c.estado } : {}) });
  }

  const estadoFijo = catalogo?.estados.length === 1;
  const municipioFijo = catalogo?.municipios.length === 1;
  const err = (campo) => errors[campo] && <p className="text-xs text-red-600 mt-1">{errors[campo]}</p>;
  const label = (texto, obligatorio = true) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {texto}{obligatorio && <span className="text-red-500"> *</span>}
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {label('Código postal')}
          <input className="input" inputMode="numeric" placeholder="Ej. 40200" value={value.codigoPostal}
            onChange={(e) => cambiarCp(e.target.value)} />
          {buscando && <p className="text-xs text-gray-400 mt-1">Buscando código postal...</p>}
          {!buscando && cpError && <p className="text-xs text-red-600 mt-1">{cpError}</p>}
          {!buscando && !cpError && err('codigoPostal')}
          {!buscando && !cpError && !errors.codigoPostal && !catalogo && (
            <p className="text-xs text-gray-400 mt-1">Escríbelo primero: llenamos estado, municipio y colonias.</p>
          )}
        </div>
        <div>
          {label('País')}
          <input className="input" value={value.pais} onChange={(e) => set('pais', e.target.value)} />
          {err('pais')}
        </div>
      </div>

      <div>
        {label('Calle')}
        <input className="input" placeholder="Ej. Av. Benito Juárez" value={value.calle} onChange={(e) => set('calle', e.target.value)} />
        {err('calle')}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          {label('Núm. exterior')}
          <input className="input" placeholder="Ej. 123" value={value.numeroExterior} onChange={(e) => set('numeroExterior', e.target.value)} />
          {err('numeroExterior')}
        </div>
        <div>
          {label('Núm. interior', false)}
          <input className="input" placeholder="Opcional" value={value.numeroInterior} onChange={(e) => set('numeroInterior', e.target.value)} />
          {err('numeroInterior')}
        </div>
      </div>

      <div>
        {label('Colonia')}
        {catalogo && !coloniaManual ? (
          <select className="input" value={value.colonia} onChange={(e) => elegirColonia(e.target.value)}>
            <option value="">Selecciona la colonia...</option>
            {catalogo.colonias.map((c) => (
              <option key={`${c.nombre}|${c.tipo}|${c.municipio}`} value={c.nombre}>
                {c.nombre}{c.tipo && c.tipo !== 'Colonia' ? ` (${c.tipo})` : ''}
              </option>
            ))}
            <option value={OTRA}>Otra (no aparece en la lista)...</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className="input" placeholder="Nombre de la colonia" value={value.colonia} onChange={(e) => set('colonia', e.target.value)} />
            {catalogo && (
              <button type="button" className="btn-secondary text-sm whitespace-nowrap" onClick={() => { setColoniaManual(false); set('colonia', ''); }}>
                Ver lista
              </button>
            )}
          </div>
        )}
        {err('colonia')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {label('Municipio / Alcaldía')}
          <input className={`input ${municipioFijo ? 'bg-gray-50' : ''}`} value={value.municipio} readOnly={municipioFijo}
            onChange={(e) => set('municipio', e.target.value)} />
          {err('municipio')}
        </div>
        <div>
          {label('Estado')}
          <input className={`input ${estadoFijo ? 'bg-gray-50' : ''}`} value={value.estado} readOnly={estadoFijo}
            onChange={(e) => set('estado', e.target.value)} />
          {err('estado')}
        </div>
      </div>
    </div>
  );
}
