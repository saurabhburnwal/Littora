import { CheckCircle, AlertTriangle } from "lucide-react";

export default function ToastNotification({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`admin-toast ${toast.type === "success" ? "admin-toast-success" : "admin-toast-error"} fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg font-medium text-sm border bg-surface`}
      role="status"
      aria-live="polite"
    >
      {toast.type === "success" ? <CheckCircle size={15} className="text-status-success shrink-0" /> : <AlertTriangle size={15} className="text-status-error shrink-0" />}
      <span>{toast.message}</span>
    </div>
  );
}
