import { useEscapeClose } from '../hooks/useEscapeClose.js';

export default function Modal({ title, onClose, children, wide }) {
  useEscapeClose(onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className={'card w-full ' + (wide ? 'max-w-2xl' : 'max-w-md') + ' max-h-[90vh] overflow-y-auto'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
