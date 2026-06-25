export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="empty emptyFadeIn">
      {Icon ? <Icon className="emptyIcon" aria-hidden="true" /> : null}
      {title ? <span className="emptyTitle">{title}</span> : null}
      {description ? <span>{description}</span> : null}
      {children ? <span>{children}</span> : null}
    </div>
  );
}
