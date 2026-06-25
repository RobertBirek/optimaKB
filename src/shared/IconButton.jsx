import Tooltip from './Tooltip';

export default function IconButton({
  icon: Icon,
  label,
  tooltip,
  className = '',
  variant = 'secondary',
  showLabel = false,
  children,
  ...props
}) {
  const button = (
    <button
      {...props}
      type={props.type || 'button'}
      className={`iconButton ${variant} ${showLabel ? 'withLabel' : ''} ${className}`.trim()}
      aria-label={label}
      title={undefined}
    >
      <Icon className="buttonIcon" aria-hidden="true" />
      {showLabel ? <span>{children || label}</span> : null}
    </button>
  );
  return <Tooltip text={tooltip || label}>{button}</Tooltip>;
}
