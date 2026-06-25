export default function PageShell({ title, description, actions, children, className = '' }) {
  return (
    <section className={`pageSection ${className}`.trim()}>
      <div className="sectionHeader pageTitle">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="pageActions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
