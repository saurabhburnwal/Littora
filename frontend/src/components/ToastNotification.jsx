import { CheckCircle, AlertTriangle, Info } from "lucide-react";

export default function ToastNotification({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  const isInfo = toast.type === "info";
  return (
    <div
      className={`admin-toast ${isSuccess ? "admin-toast-success" : isInfo ? "admin-toast-info" : "admin-toast-error"} fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg font-medium text-sm border bg-surface`}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? (
        <CheckCircle size={15} className="text-status-success shrink-0" />
      ) : isInfo ? (
        <Info size={15} className="text-primary shrink-0" />
      ) : (
        <AlertTriangle size={15} className="text-status-error shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}
