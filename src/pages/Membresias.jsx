import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as membresiasApi from '../api/membresias';
import * as planesApi from '../api/membresiaPlanes';
import * as alumnosApi from '../api/alumnos';
import * as disciplinasApi from '../api/disciplinas';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const ESTADO_COLOR = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDA: 'bg-orange-100 text-orange-700',
  VENCIDA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-600',
};
const INDICADOR_LABEL = {
  PROXIMA_A_VENCER: 'Próxima a vencer',
  SALDO_PENDIENTE: 'Saldo pendiente',
  PAGO_VENCIDO: 'Pago vencido',
  CLASES_POR_AGOTARSE: 'Clases por agotarse',
  AGOTADA: 'Agotada',
};

const emptyAsignarForm = {
  alumnoId: '', planId: '', disciplinaIds: [], fechaInicio: new Date().toISOString().slice(0, 10),
  descuento: '0', montoPagoInicial: '', metodoPago: 'EFECTIVO',
};

export default function Membresias() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [planes, setPlanes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [asignarForm, setAsignarForm] = useState(emptyAsignarForm);
  const [alumnoQuery, setAlumnoQuery] = useState('');
  const [alumnoResultados, setAlumnoResultados] = useState([]);
  const [modalMotivo, setModalMotivo] = useState(null); // { id, motivo }
  const { notify, confirmDialog } = useNotify();

  useEffect(() => {
    cargarPlanes();
    disciplinasApi.listDisciplinasActivas().then(({ data }) => setDisciplinas(data.data));
  }, []);

  useEffect(() => {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }, [page]);

  useEffect(() => {
    if (!alumnoQuery) { setAlumnoResultados([]); return; }
    const t = setTimeout(() => {
      alumnosApi.listAlumnos(alumnoQuery, 0, 8).then(({ data }) => setAlumnoResultados(data.data.content));
    }, 250);
    return () => clearTimeout(t);
  }, [alumnoQuery]);

  function cargarPlanes() {
    planesApi.listMembresiaPlanesActivos().then(({ data }) => setPlanes(data.data));
  }

  function reloadMembresias() {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }

  const planSeleccionado = planes.find((p) => String(p.id) === String(asignarForm.planId));
  const totalContratado = planSeleccionado ? Math.max(0, Number(planSeleccionado.precio) - Number(asignarForm.descuento || 0)) : 0;

  function toggleDisciplinaAsignar(id) {
    setAsignarForm((f) => {
      const max = planSeleccionado?.maxDisciplinasSeleccionables || 1;
      const yaEsta = f.disciplinaIds.includes(id);
      if (yaEsta) return { ...f, disciplinaIds: f.disciplinaIds.filter((x) => x !== id) };
      if (f.disciplinaIds.length >= max) return f;
      return { ...f, disciplinaIds: [...f.disciplinaIds, id] };
    });
  }

  async function handleAsignar(e) {
    e.preventDefault();
    if (!asignarForm.alumnoId || !asignarForm.planId) {
      notify('Selecciona un alumno y un plan', 'error');
      return;
    }
    try {
      await membresiasApi.createMembresia({
        alumnoId: asignarForm.alumnoId,
        planId: asignarForm.planId,
        disciplinaIds: asignarForm.disciplinaIds,
        fechaInicio: asignarForm.fechaInicio,
        descuento: Number(asignarForm.descuento || 0),
        montoPagoInicial: asignarForm.montoPagoInicial ? Number(asignarForm.montoPagoInicial) : null,
        metodoPago: asignarForm.metodoPago,
      });
      notify('Membresia registrada', 'success');
      setModalAsignar(false);
      setAsignarForm(emptyAsignarForm);
      setAlumnoQuery('');
      reloadMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la membresia', 'error');
    }
  }

  async function handleCancelarSubmit(e) {
    e.preventDefault();
    if (!modalMotivo.motivo.trim()) {
      notify('El motivo es obligatorio', 'error');
      return;
    }
    try {
      await membresiasApi.cancelarMembresia(modalMotivo.id, modalMotivo.motivo);
      notify('Membresia cancelada', 'success');
      setModalMotivo(null);
      reloadMembresias();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Membresias</h1>
        <button className="btn-primary" onClick={() => setModalAsignar(true)}>+ Registrar membresia</button>
      </div>

      <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Alumno</th>
                <th>Plan</th>
                <th>Vigencia</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageData.content.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">
                    <Link to={`/alumnos/${m.alumnoId}`} className="hover:underline">{m.alumnoNombre}</Link>
                  </td>
                  <td className="text-gray-600">{m.planNombre}</td>
                  <td className="text-gray-600">{m.fechaInicio} — {m.fechaFin || 'sin fecha'}</td>
                  <td className="text-gray-600">${Number(m.saldo).toFixed(2)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_COLOR[m.estado]}>{m.estado}</span>
                      {m.indicadores?.map((ind) => (
                        <span key={ind} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">{INDICADOR_LABEL[ind] || ind}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right space-x-2">
                    <Link to={`/alumnos/${m.alumnoId}`} className="text-brand-600 hover:underline">Ver</Link>
                    {m.estado !== 'CANCELADA' && (
                      <button className="text-red-600 hover:underline" onClick={() => setModalMotivo({ id: m.id, motivo: '' })}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pageData.content.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">Sin membresias registradas</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
        </div>

      {modalAsignar && (
        <Modal title="Registrar membresia" onClose={() => setModalAsignar(false)}>
          <form onSubmit={handleAsignar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
              <input className="input" placeholder="Buscar alumno..." value={alumnoQuery} onChange={(e) => setAlumnoQuery(e.target.value)} />
              {alumnoResultados.length > 0 && (
                <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {alumnoResultados.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      className={'block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ' + (asignarForm.alumnoId === a.id ? 'bg-brand-50 text-brand-700' : '')}
                      onClick={() => { setAsignarForm({ ...asignarForm, alumnoId: a.id }); setAlumnoQuery(a.nombre); setAlumnoResultados([]); }}
                    >
                      {a.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input" value={asignarForm.planId} onChange={(e) => setAsignarForm({ ...asignarForm, planId: e.target.value, disciplinaIds: [] })}>
                <option value="">Selecciona un plan</option>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toFixed(2)}</option>)}
              </select>
            </div>
            {planSeleccionado && !planSeleccionado.accesoCompleto && planSeleccionado.disciplinaIds?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplinas (máx. {planSeleccionado.maxDisciplinasSeleccionables || 1})
                </label>
                <div className="flex flex-wrap gap-2">
                  {disciplinas.filter((d) => planSeleccionado.disciplinaIds.includes(d.id)).map((d) => (
                    <button type="button" key={d.id} onClick={() => toggleDisciplinaAsignar(d.id)}
                      className={'px-3 py-1 rounded-full text-xs border ' + (asignarForm.disciplinaIds.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300')}>
                      {d.icono} {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                <input className="input" type="date" value={asignarForm.fechaInicio} onChange={(e) => setAsignarForm({ ...asignarForm, fechaInicio: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                <input className="input" type="number" step="0.01" value={asignarForm.descuento} onChange={(e) => setAsignarForm({ ...asignarForm, descuento: e.target.value })} />
              </div>
            </div>
            {planSeleccionado && (
              <p className="text-sm text-gray-600">Total contratado: <strong>${totalContratado.toFixed(2)}</strong></p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pago inicial (opcional)</label>
                <input className="input" type="number" step="0.01" value={asignarForm.montoPagoInicial} onChange={(e) => setAsignarForm({ ...asignarForm, montoPagoInicial: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select className="input" value={asignarForm.metodoPago} onChange={(e) => setAsignarForm({ ...asignarForm, metodoPago: e.target.value })}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            {planSeleccionado && !planSeleccionado.permiteAbonos && (
              <p className="text-xs text-gray-400">Este plan no permite abonos: deja el pago inicial en 0 para cobrar despues, o cubre el total.</p>
            )}
            <button className="btn-primary w-full mt-2">Registrar</button>
          </form>
        </Modal>
      )}

      {modalMotivo && (
        <Modal title="Cancelar membresia" onClose={() => setModalMotivo(null)}>
          <form onSubmit={handleCancelarSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (obligatorio)</label>
              <textarea className="input" rows={3} value={modalMotivo.motivo} onChange={(e) => setModalMotivo({ ...modalMotivo, motivo: e.target.value })} />
            </div>
            <button className="btn-danger w-full mt-2">Cancelar membresia</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
