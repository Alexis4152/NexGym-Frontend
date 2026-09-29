import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as notificacionesApi from '../api/notificaciones';

const POLL_MS = 60_000;

function tiempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Hace un momento';
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  function cargarContador() {
    notificacionesApi.countNoLeidas().then(({ data }) => setCount(data.data.count)).catch(() => {});
  }

  function cargarLista() {
    setLoading(true);
    notificacionesApi.listNotificaciones(false, 0, 8)
      .then(({ data }) => setItems(data.data.content))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarContador();
    const interval = setInterval(cargarContador, POLL_MS);
    const onFocus = () => cargarContador();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) cargarLista();
  }

  async function handleLeer(n) {
    if (!n.leida) {
      await notificacionesApi.marcarLeida(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setCount((c) => Math.max(0, c - 1));
    }
    if (n.alumnoId) {
      setOpen(false);
      navigate(`/alumnos/${n.alumnoId}`);
    }
  }

  async function handleLeerTodas() {
    await notificacionesApi.marcarTodasLeidas();
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    setCount(0);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300"
        onClick={toggle}
        aria-label="Notificaciones"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
            {count > 0 && (
              <button className="text-xs text-brand-600 hover:underline" onClick={handleLeerTodas}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && <p className="text-center text-xs text-gray-400 py-6">Cargando...</p>}
            {!loading && items.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-6">Sin notificaciones</p>
            )}
            {!loading && items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleLeer(n)}
                className={'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ' + (!n.leida ? 'bg-brand-50/40' : '')}
              >
                <div className="flex items-start gap-2">
                  {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />}
                  <div className={n.leida ? 'ml-3.5' : ''}>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{n.titulo}</p>
                    <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{tiempoRelativo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Link
            to="/notificaciones"
            onClick={() => setOpen(false)}
            className="text-center text-xs font-medium text-brand-600 hover:bg-gray-50 py-2.5 border-t border-gray-100"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
