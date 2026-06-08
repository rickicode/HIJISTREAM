import { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — custom confirmation modal replacing native confirm().
 *
 * Features:
 * - Escape key closes the dialog
 * - Focus trap: Tab cycles between Cancel and Confirm buttons
 * - Auto-focus on Confirm button when opened
 * - Backdrop click closes the dialog
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel='Confirm']
 * @param {string} [props.cancelLabel='Batal']
 * @param {boolean} [props.danger=false] - Red confirm button for destructive actions
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Batal', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // Escape key handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }

    // Focus trap: Tab cycles between the two buttons
    if (e.key === 'Tab') {
      const focused = document.activeElement;
      const cancelEl = cancelRef.current;
      const confirmEl = confirmRef.current;

      if (!cancelEl || !confirmEl) return;

      if (e.shiftKey) {
        // Shift+Tab: wrap from Cancel → Confirm, or from Confirm → Cancel
        e.preventDefault();
        focused === cancelEl ? confirmEl.focus() : cancelEl.focus();
      } else {
        // Tab: wrap from Confirm → Cancel, or from Cancel → Confirm
        e.preventDefault();
        focused === confirmEl ? cancelEl.focus() : confirmEl.focus();
      }
    }
  }, [onCancel]);

  // Auto-focus Confirm button and attach keyboard listener when opened
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        confirmRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Global keyboard listener
  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            {danger && (
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 id="confirm-dialog-title" className="text-lg font-semibold text-white mb-1">{title}</h3>
              <p id="confirm-dialog-message" className="text-sm text-[#b3b3b3]">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#808080] hover:text-white border border-[#333] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#555] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'
                : 'bg-[#E50914] text-white hover:bg-[#f6121d] focus:ring-[#E50914]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
