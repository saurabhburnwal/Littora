import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Universal Confirmation Modal dialog.
 * Used for Confirm Sign Out, Delete Record, and irreversible account actions.
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Yes, delete",
  cancelLabel = "Cancel",
  confirmVariant = "danger", // "danger" | "primary"
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isPrimary = confirmVariant === "primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Confirmation dialog"}
      data-testid="confirm-modal-backdrop"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isPrimary ? "bg-primary-light text-primary" : "bg-rose-500/15 text-rose-500"
            }`}
            data-testid="confirm-modal-icon"
          >
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-text-primary mb-1">{title}</h3>
            {message && <p className="text-sm text-text-muted leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 rounded-pill text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`px-5 py-2.5 rounded-pill text-sm font-semibold text-white transition-all shadow-sm flex items-center justify-center gap-1.5 ${
              isPrimary ? "bg-primary hover:bg-primary-hover active:bg-primary-active" : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
            }`}
            onClick={onConfirm}
            autoFocus
          >
            {!isPrimary && <Trash2 size={13} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
