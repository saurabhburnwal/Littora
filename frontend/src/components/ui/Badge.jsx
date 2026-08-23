import PropTypes from "prop-types";

/**
 * Standardized Badge component for severity ratings, waste categories,
 * user roles, and status indicators.
 *
 * @param {Object} props
 * @param {string} [props.variant='default'] - Variant category: 'severity' | 'waste' | 'role' | 'status' | 'default'
 * @param {string} [props.type] - Subtype within variant (e.g., 'low'|'moderate'|'high'|'severe', 'bottle'|'can'|'bag', 'admin'|'member'|'guest', 'active'|'pending')
 * @param {string} [props.size='standard'] - 'compact' | 'standard'
 * @param {boolean} [props.overlay=false] - If true, applies frosted translucent backdrop for image overlay
 * @param {React.ReactNode} [props.icon] - Optional leading icon
 * @param {React.ReactNode} [props.children] - Badge content/label
 * @param {string} [props.className] - Additional CSS classes
 */
export default function Badge({
  variant = "default",
  type,
  size = "standard",
  overlay = false,
  icon,
  children,
  className = "",
  ...rest
}) {
  const normType = typeof type === "string" ? type.toLowerCase().trim() : "";
  const normVariant = typeof variant === "string" ? variant.toLowerCase().trim() : "default";

  // Derive class names
  const classes = [
    "badge-root",
    `badge-${normVariant}`,
    normType ? `badge-${normVariant}-${normType}` : "",
    size === "compact" ? "badge-compact" : "badge-standard",
    overlay ? "badge-overlay" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-label">{children || type}</span>
    </span>
  );
}

Badge.propTypes = {
  variant: PropTypes.oneOf(["severity", "waste", "role", "status", "default"]),
  type: PropTypes.string,
  size: PropTypes.oneOf(["compact", "standard"]),
  overlay: PropTypes.bool,
  icon: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};
