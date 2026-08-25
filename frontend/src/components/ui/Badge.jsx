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
  // Derive class names
  const classes = [
    "inline-flex items-center gap-1.5 font-bold rounded-pill leading-none whitespace-nowrap tracking-wide transition-all duration-150",
    size === "compact" ? "text-xs" : "text-xs sm:text-sm",
    overlay ? "backdrop-blur-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {icon && <span className="inline-flex items-center justify-center shrink-0">{icon}</span>}
      <span className="inline-block leading-tight">{children || type}</span>
    </span>
  );
}
