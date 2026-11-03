import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CircleCheck size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // Every call creates a NEW toast (new id), so showing the same message
  // twice in a row (e.g. adding the same item to the cart) always shows again.
  const show = useCallback((type, message, duration = 3500) => {
    if (!message) return;
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  // Confirmation shown as a toast-style card. Returns a Promise<boolean>.
  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...(typeof options === 'string' ? { message: options } : options), resolve });
  }), []);

  const answer = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { dialog.resolve(false); setDialog(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const api = useMemo(() => ({
    success: (m, d) => show('success', m, d),
    error: (m, d) => show('error', m, d ?? 5000),
    info: (m, d) => show('info', m, d),
    confirm
  }), [show, confirm]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            {ICONS[t.type]}
            <span>{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="toast-scrim" onClick={() => answer(false)}>
          <div className="toast toast-confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="toast-confirm-text">
              {dialog.title && <b>{dialog.title}</b>}
              <span>{dialog.message}</span>
            </div>
            <div className="toast-confirm-actions">
              <button type="button" className="toast-btn" onClick={() => answer(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                className={`toast-btn ${dialog.danger ? 'toast-btn-danger' : 'toast-btn-primary'}`}
                onClick={() => answer(true)}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
