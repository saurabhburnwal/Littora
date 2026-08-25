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
      className={`metric-card-root ${onClick ? "metric-card-clickable" : ""} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-card-header">
        {icon && <div className="metric-card-icon">{icon}</div>}
        <span className="metric-card-label">{label}</span>
      </div>

      <div className="metric-card-body">
        <div className="metric-card-value-row">
          <span className="metric-card-value">{value}</span>
          {tier && (
            <span className={`metric-card-tier tier-${tierKey}`}>
              {tier}
            </span>
          )}
        </div>

        {(finalSupportingText || trend) && (
          <div className="metric-card-footer">
            {trend && (
              <span className="metric-card-trend">
                {typeof trend === "object" && trend.value ? trend.value : trend}
              </span>
            )}
            {finalSupportingText && (
              <span className="metric-card-subtext">{finalSupportingText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
