import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import MiCajaTab from './cortescaja/MiCajaTab.jsx';
import CajasTab from './cortescaja/CajasTab.jsx';
import HistorialTab from './cortescaja/HistorialTab.jsx';

// Cortes de caja, homologado con DemoPV (pages/CashCuts): cajas fisicas por sucursal, entrega
// del efectivo entre turnos, arqueo al cerrar (incluye pagos de membresia en efectivo),
// movimientos de efectivo del turno, cierre forzado y automatico. "Cajas" solo la ven
// Encargado/Dueño/SUPER_ADMIN.
export default function CortesCaja() {
  const { isSuperAdmin, isEncargadoOSuperior } = useAuth();
  const esAdmin = isSuperAdmin || isEncargadoOSuperior;
  const [tab, setTab] = useState('mia');
  const [version, setVersion] = useState(0); // fuerza recargar las otras pestañas tras un cambio

  const tabs = [
    { key: 'mia', label: 'Mi caja' },
    ...(esAdmin ? [{ key: 'cajas', label: 'Cajas' }] : []),
    { key: 'historial', label: 'Historial' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Cortes de caja</h1>
      <div className="flex gap-6 border-b border-gray-200 mb-4 text-sm">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={'pb-2 ' + (tab === t.key ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Mi caja se recarga sola (sin key por version: perderia el aviso de "corte cerrado"). */}
      {tab === 'mia' && <MiCajaTab onCambio={() => setVersion((v) => v + 1)} />}
      {tab === 'cajas' && esAdmin && <CajasTab key={`cajas-${version}`} onCambio={() => setVersion((v) => v + 1)} />}
      {tab === 'historial' && <HistorialTab key={`hist-${version}`} />}
    </div>
  );
}
