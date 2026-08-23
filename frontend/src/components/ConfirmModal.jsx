import { AlertTriangle, Trash2 } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Yes, delete",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Confirmation dialog"}
    >
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: confirmVariant === "danger" ? "rgba(220,38,38,0.12)" : "rgba(14,140,134,0.12)",
            color: confirmVariant === "danger" ? "#dc2626" : "var(--teal)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Icon size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}>{title}</h3>
            {message && (
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
                {message}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
          <button
            type="button"
            className="admin-modal-btn admin-modal-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-modal-btn admin-modal-${confirmVariant === "danger" ? "confirm" : "primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmVariant === "danger" && <Trash2 size={13} style={{ marginRight: 4 }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
