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
    <div className={`section-header-root ${className}`.trim()}>
      <div className="section-header-content">
        {title && <h2 className="section-header-title">{title}</h2>}
        {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  );
}
