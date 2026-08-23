import { CheckCircle, AlertTriangle } from "lucide-react";

export default function ToastNotification({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`admin-toast ${toast.type === "success" ? "admin-toast-success" : "admin-toast-error"}`}
      role="status"
      aria-live="polite"
    >
      {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
      {toast.message}
    </div>
  );
}
