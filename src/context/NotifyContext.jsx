import { createContext, useCallback, useContext, useRef, useState } from 'react';

const NotifyContext = createContext(null);

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const notify = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const confirmDialog = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: opts.title || null,
        message,
        confirmLabel: opts.confirmLabel || 'Confirmar',
        cancelLabel: opts.cancelLabel || 'Cancelar',
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const handleConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <NotifyContext.Provider value={{ notify, confirmDialog }}>
      {children}

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-lg shadow-lg px-4 py-3 text-sm text-white ' +
              (t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-gray-800')
            }
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onKeyDown={(e) => e.key === 'Escape' && handleConfirm(false)}
        >
          <div className="card w-full max-w-sm">
            {confirmState.title && <h3 className="font-semibold text-gray-900 mb-2">{confirmState.title}</h3>}
            <p className="text-sm text-gray-800 mb-4 whitespace-pre-line">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => handleConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                className={confirmState.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => handleConfirm(true)}
                autoFocus
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify debe usarse dentro de NotifyProvider');
  return ctx;
}
