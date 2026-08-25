/**
 * Standardized MetricCard component for displaying key metric summaries,
 * KPI stats, severity score averages, and trend indicators across the platform.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.label - Metric label/title (e.g., "Waste Items")
 * @param {string|number|React.ReactNode} props.value - Primary metric number or value
 * @param {React.ReactNode} [props.icon] - Optional leading or accent icon
 * @param {string} [props.tier] - Optional severity tier ('Low'|'Moderate'|'High'|'Severe')
 * @param {string|React.ReactNode} [props.supportingText] - Optional subtext below the value
 * @param {string|React.ReactNode|Object} [props.trend] - Optional trend delta (e.g., "+12% vs last month")
 * @param {string} [props.className] - Optional custom CSS classes
 * @param {Function} [props.onClick] - Optional click handler
 */
export default function MetricCard({
  label,
  value,
  icon,
  tier,
  supportingText,
  subtext,
  trend,
  className = "",
  onClick,
}) {
  const tierKey = typeof tier === "string" ? tier.toLowerCase().trim() : "";
  const finalSupportingText = supportingText || subtext;

  return (
    <div
      className={`bg-surface border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all duration-200 ${onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md" : ""} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-sans text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
        {icon && <div className="text-primary shrink-0">{icon}</div>}
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-2xl font-bold text-text-primary tracking-tight">{value}</span>
          {tier && (
            <span className="px-2 py-0.5 rounded-pill text-xs font-bold">
              {tier}
            </span>
          )}
        </div>

        {(finalSupportingText || trend) && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pt-1 text-xs">
            {trend && (
              <span className="font-semibold text-status-success">
                {typeof trend === "object" && trend.value ? trend.value : trend}
              </span>
            )}
            {finalSupportingText && (
              <span className="text-text-muted font-medium">{finalSupportingText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
