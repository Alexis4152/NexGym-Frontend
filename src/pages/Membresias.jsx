import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as membresiasApi from '../api/membresias';
import * as cortesCajaApi from '../api/cortesCaja';
import * as apartadosPlanApi from '../api/apartadosPlan';
import { useNotify } from '../context/NotifyContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import RegistrarMembresiaForm from '../components/RegistrarMembresiaForm.jsx';
import ApartadosPlanPanel from '../components/ApartadosPlanPanel.jsx';
import { hoyLocal } from '../utils/fechas.js';

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

export default function Membresias() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 });
  const [page, setPage] = useState(0);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalMotivo, setModalMotivo] = useState(null); // { id, motivo }
  const [corteAbierto, setCorteAbierto] = useState(null);
  const { notify } = useNotify();
  // Pestana "Apartados en línea": membresias apartadas desde la tienda que esperan su alta
  // (mismo panel que Apartados > Planes). ?tab=apartados la abre directo.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'apartados' ? 'apartados' : 'membresias';
  const setTab = (t) => setSearchParams(t === 'apartados' ? { tab: 'apartados' } : {}, { replace: true });
  const [apartadosPendientes, setApartadosPendientes] = useState(0);

  useEffect(() => {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }, [page]);

  useEffect(() => {
    cortesCajaApi.getCorteAbierto().then(({ data }) => setCorteAbierto(data.data));
    contarApartadosPendientes();
  }, []);

  function contarApartadosPendientes() {
    apartadosPlanApi.listApartadosPlan({ estado: 'PENDIENTE' }, 0, 1)
      .then(({ data }) => setApartadosPendientes(data.data.totalElements))
      .catch(() => setApartadosPendientes(0));
  }

  function handleApartadoProcesado() {
    contarApartadosPendientes();
    reloadMembresias();
  }

  function reloadMembresias() {
    membresiasApi.listMembresias(page, 20).then(({ data }) => setPageData(data.data));
  }

  function handleMembresiaRegistrada() {
    notify('Membresia registrada', 'success');
    setModalAsignar(false);
    reloadMembresias();
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
        <button className="btn-primary" disabled={!corteAbierto} onClick={() => setModalAsignar(true)}>+ Registrar membresia</button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-4 text-sm">
        <button type="button" className={'pb-2 ' + (tab === 'membresias' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('membresias')}>
          🎫 Membresías
        </button>
        <button type="button" className={'pb-2 ' + (tab === 'apartados' ? 'border-b-2 border-brand-600 text-brand-700 font-medium' : 'text-gray-500')} onClick={() => setTab('apartados')}>
          🌐 Apartados en línea
          {apartadosPendientes > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{apartadosPendientes}</span>
          )}
        </button>
      </div>

      {tab === 'apartados' && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Planes apartados desde la tienda en línea con anticipo. Usa <strong>Dar de alta</strong> para ligarlos a un alumno (existente o nuevo) y crear su membresía; el anticipo queda como primer pago.
          </p>
          <ApartadosPlanPanel estadoInicial="PENDIENTE" onCambio={handleApartadoProcesado} />
        </>
      )}

      {tab === 'membresias' && <>
      {!corteAbierto && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 mb-4">
          ⚠️ No hay corte de caja abierto. Debes <Link to="/cortes-caja" className="underline font-semibold">abrir un corte</Link> antes de poder registrar una membresía.
        </div>
      )}

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
                      {m.estado === 'PENDIENTE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700"
                          title="Regla de inicio: si hoy aún había clase disponible, arranca al registrar su asistencia hoy">
                          {m.fechaInicioAnticipable === hoyLocal() ? `Arranca hoy al asistir (si no, ${m.fechaInicio})` : `Inicia ${m.fechaInicio}`}
                        </span>
                      )}
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
      </>}

      {modalAsignar && (
        <Modal title="Registrar membresia" onClose={() => setModalAsignar(false)}>
          <RegistrarMembresiaForm onSuccess={handleMembresiaRegistrada} onCancel={() => setModalAsignar(false)} />
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
