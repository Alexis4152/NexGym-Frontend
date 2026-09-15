import { useEffect } from 'react';

export function useEscapeClose(onClose) {
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
