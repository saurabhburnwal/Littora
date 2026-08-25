/**
 * Standardized SectionHeader component for consistent section headings,
 * subtitles, and right-aligned action controls across the Littora application.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Section title (Sora font, 17-18px, weight 600)
 * @param {string|React.ReactNode} [props.subtitle] - Optional subtitle (Inter font, 13-14px, muted)
 * @param {React.ReactNode} [props.action] - Optional right-aligned action element
 * @param {string} [props.className] - Optional additional CSS classes
 */
export default function SectionHeader({ title, subtitle, action, className = "" }) {
  if (!title && !subtitle && !action) return null;

  return (
    <div className={`flex items-start justify-between gap-4 mb-4 pb-1.5 ${className}`.trim()}>
      <div className="flex-1 min-w-0">
        {title && <h2 className="font-display text-lg font-bold text-text-primary tracking-tight">{title}</h2>}
        {subtitle && <p className="text-xs sm:text-sm text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
