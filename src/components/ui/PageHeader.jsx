// PageHeader — consistent title block for every page
// Use at the top of page content, inside the page container.

export default function PageHeader({
  eyebrow,          // small label above title (e.g. "SEASON 4")
  title,
  titleHighlight,   // highlighted word(s) — rendered in brand color
  subtitle,
  action,           // right-side element (button, etc.)
  className = "",
}) {
  return (
    <div className={`cp-page-header ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="cp-page-header-label">{eyebrow}</p>
          )}
          <h1 className="cp-page-header-title">
            {title}
            {titleHighlight && (
              <span className="text-cyber"> {titleHighlight}</span>
            )}
          </h1>
          {subtitle && (
            <p className="cp-page-header-sub">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 mt-1">{action}</div>
        )}
      </div>
    </div>
  );
}
