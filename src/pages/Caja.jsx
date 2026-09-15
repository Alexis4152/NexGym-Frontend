import { useEffect, useState } from 'react';
import * as cajaApi from '../api/caja';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

export default function Caja() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [categoriasIngreso, setCategoriasIngreso] = useState([]);
  const [categoriasEgreso, setCategoriasEgreso] = useState([]);
  const [modal, setModal] = useState(null); // 'INGRESO' | 'EGRESO' | null
  const [form, setForm] = useState({ categoriaId: '', monto: '', metodoPago: 'EFECTIVO', descripcion: '' });
  const { notify } = useNotify();

  useEffect(() => {
    cajaApi.listCategoriasMovimiento('INGRESO').then(({ data }) => setCategoriasIngreso(data.data));
    cajaApi.listCategoriasMovimiento('EGRESO').then(({ data }) => setCategoriasEgreso(data.data));
  }, []);

  useEffect(() => {
    load();
  }, [page]);

  function load() {
    cajaApi.listMovimientos(undefined, undefined, page, 20).then(({ data }) => setPageData(data.data));
  }

  function openModal(tipo) {
    setForm({ categoriaId: '', monto: '', metodoPago: 'EFECTIVO', descripcion: '' });
    setModal(tipo);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.categoriaId || !form.monto) {
      notify('Selecciona una categoria e indica el monto', 'error');
      return;
    }
    const payload = { ...form, monto: Number(form.monto) };
    try {
      if (modal === 'INGRESO') await cajaApi.registrarIngreso(payload);
      else await cajaApi.registrarEgreso(payload);
      notify(`${modal === 'INGRESO' ? 'Ingreso' : 'Egreso'} registrado`, 'success');
      setModal(null);
      load();
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar el movimiento', 'error');
    }
  }

  const categorias = modal === 'INGRESO' ? categoriasIngreso : categoriasEgreso;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Caja</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => openModal('EGRESO')}>+ Egreso</button>
          <button className="btn-primary" onClick={() => openModal('INGRESO')}>+ Ingreso</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Fecha</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Metodo</th>
              <th>Descripcion</th>
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
                <td className="text-gray-500">{m.descripcion || m.alumnoNombre || m.proveedorNombre || '-'}</td>
                <td className={'text-right font-medium ' + (m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600')}>
                  {m.tipo === 'INGRESO' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                </td>
              </tr>
            ))}
            {pageData.content.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">Sin movimientos registrados</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
      </div>

      {modal && (
        <Modal title={modal === 'INGRESO' ? 'Registrar ingreso' : 'Registrar egreso'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="input" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}>
                <option value="">Selecciona...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
            <button className="btn-primary w-full mt-2">Registrar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
