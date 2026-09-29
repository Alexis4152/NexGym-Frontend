import { useEffect, useState } from 'react';
import * as cajaApi from '../api/caja';
import { useNotify } from '../context/NotifyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const ESTADO_BADGE = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADO: 'bg-emerald-100 text-emerald-700',
  RECHAZADO: 'bg-red-100 text-red-700',
};

const emptyForm = { categoriaId: '', monto: '', metodoPago: 'EFECTIVO', descripcion: '' };

export default function Caja() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [categoriasEgreso, setCategoriasEgreso] = useState([]);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [comprobante, setComprobante] = useState(null);
  const [pendientes, setPendientes] = useState({ content: [], totalPages: 0 });
  const [modalRechazar, setModalRechazar] = useState(null); // { id, motivo }
  const { notify, confirmDialog } = useNotify();
  const { isEncargadoOSuperior } = useAuth();

  useEffect(() => {
    cajaApi.listCategoriasMovimiento('EGRESO').then(({ data }) => setCategoriasEgreso(data.data));
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    if (isEncargadoOSuperior) cargarPendientes();
  }, [isEncargadoOSuperior]);

  function load() {
    cajaApi.listMovimientos(undefined, undefined, page, 20).then(({ data }) => setPageData(data.data));
  }

  function cargarPendientes() {
    cajaApi.listEgresosPendientes(0, 20).then(({ data }) => setPendientes(data.data));
  }

  function openModalEgreso() {
    setForm(emptyForm);
    setComprobante(null);
    setModalEgreso(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.categoriaId || !form.monto) {
      notify('Selecciona una categoria e indica el monto', 'error');
      return;
    }
    try {
      await cajaApi.registrarEgreso(form, comprobante);
      notify(comprobante ? 'Egreso registrado' : 'Egreso registrado, queda pendiente de aprobacion (sin comprobante)', 'success');
      setModalEgreso(false);
      load();
      if (isEncargadoOSuperior) cargarPendientes();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar el egreso', 'error');
    }
  }

  async function handleAprobar(m) {
    const ok = await confirmDialog(`¿Aprobar el egreso "${m.categoriaNombre}" por $${Number(m.monto).toFixed(2)}?`);
    if (!ok) return;
    try {
      await cajaApi.aprobarMovimiento(m.id);
      notify('Egreso aprobado', 'success');
      cargarPendientes();
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo aprobar', 'error');
    }
  }

  async function handleRechazarSubmit(e) {
    e.preventDefault();
    if (!modalRechazar.motivo.trim()) {
      notify('El motivo es obligatorio', 'error');
      return;
    }
    try {
      await cajaApi.rechazarMovimiento(modalRechazar.id, modalRechazar.motivo);
      notify('Egreso rechazado', 'success');
      setModalRechazar(null);
      cargarPendientes();
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo rechazar', 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Caja</h1>
        <button className="btn-primary" onClick={openModalEgreso}>+ Egreso</button>
      </div>

      {isEncargadoOSuperior && pendientes.content.length > 0 && (
        <div className="card mb-4 border-amber-200 bg-amber-50/50">
          <h3 className="font-semibold text-amber-800 mb-2">⏳ Egresos pendientes de aprobacion</h3>
          <div className="divide-y divide-amber-100">
            {pendientes.content.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-800">{m.categoriaNombre}</span>
                  <span className="text-gray-500"> · ${Number(m.monto).toFixed(2)} · {m.fecha}</span>
                  {m.registradoPorNombre && <span className="text-gray-400"> · registro {m.registradoPorNombre}</span>}
                  {m.sucursalNombre && <span className="text-gray-400"> · {m.sucursalNombre}</span>}
                  {m.descripcion && <div className="text-xs text-gray-400">{m.descripcion}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-emerald-600 hover:underline text-xs font-medium" onClick={() => handleAprobar(m)}>Aprobar</button>
                  <button className="text-red-600 hover:underline text-xs font-medium" onClick={() => setModalRechazar({ id: m.id, motivo: '' })}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Fecha</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Metodo</th>
              <th>Descripcion</th>
              <th>Estado</th>
              <th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {pageData.content.map((m) => (
              <tr key={m.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-600">{m.fecha}</td>
                <td className="text-gray-800">{m.categoriaNombre}</td>
                <td>
                  <span className={m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}>{m.tipo}</span>
                </td>
                <td className="text-gray-500">{m.metodoPago}</td>
                <td className="text-gray-500">
                  {m.descripcion || m.alumnoNombre || m.proveedorNombre || '-'}
                  {m.comprobanteUrl && (
                    <a href={m.comprobanteUrl} target="_blank" rel="noreferrer" className="ml-2 text-brand-600 hover:underline text-xs">📎 comprobante</a>
                  )}
                  {m.estadoAprobacion === 'RECHAZADO' && m.rechazadoMotivo && (
                    <div className="text-xs text-red-500">Motivo: {m.rechazadoMotivo}</div>
                  )}
                </td>
                <td>
                  {m.tipo === 'EGRESO' && (
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + ESTADO_BADGE[m.estadoAprobacion]}>{m.estadoAprobacion}</span>
                  )}
                </td>
                <td className={'text-right font-medium ' + (m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600')}>
                  {m.tipo === 'INGRESO' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-400">Sin movimientos registrados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modalEgreso && (
        <Modal title="Registrar egreso" onClose={() => setModalEgreso(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="input" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}>
                <option value="">Selecciona...</option>
                {categoriasEgreso.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input type="number" step="0.01" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
              <select className="input" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
              <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (PDF o imagen, opcional)</label>
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="input"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-400 mt-1">
                {comprobante
                  ? 'Con comprobante, el egreso queda aprobado de inmediato.'
                  : 'Sin comprobante, el egreso queda pendiente hasta que el Dueno o el Encargado lo aprueben.'}
              </p>
            </div>
            <button className="btn-primary w-full mt-2">Registrar</button>
          </form>
        </Modal>
      )}

      {modalRechazar && (
        <Modal title="Rechazar egreso" onClose={() => setModalRechazar(null)}>
          <form onSubmit={handleRechazarSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (obligatorio)</label>
              <textarea className="input" rows={3} value={modalRechazar.motivo} onChange={(e) => setModalRechazar({ ...modalRechazar, motivo: e.target.value })} />
            </div>
            <button className="btn-danger w-full mt-2">Rechazar egreso</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
