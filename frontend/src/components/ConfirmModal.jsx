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
      className="admin-modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Confirmation dialog"}
    >
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div
            className={`admin-modal-icon-badge ${
              isPrimary ? "admin-modal-icon-badge--primary" : "admin-modal-icon-badge--danger"
            }`}
          >
            <Icon size={20} />
          </div>
          <div className="admin-modal-text-wrap">
            <h3 className="admin-modal-title">{title}</h3>
            {message && <p className="admin-modal-message">{message}</p>}
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-modal-btn admin-modal-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-modal-btn admin-modal-${isPrimary ? "primary" : "confirm"}`}
            onClick={onConfirm}
            autoFocus
          >
            {!isPrimary && <Trash2 size={13} style={{ marginRight: 2 }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
