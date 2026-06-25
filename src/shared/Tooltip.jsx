import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ text, children }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === 'undefined') return;
    const rect = anchor.getBoundingClientRect();
    const topGap = 10;
    const viewportPadding = 12;
    const centerX = rect.left + (rect.width / 2);
    const left = Math.max(viewportPadding, Math.min(centerX, window.innerWidth - viewportPadding));
    const above = rect.top >= 72;
    setStyle({
      left,
      top: above ? rect.top - topGap : rect.bottom + topGap,
      transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [open, updatePosition]);

  if (!text) return children;

  return (
    <>
      <span
        ref={anchorRef}
        className="tooltipWrap"
        onMouseEnter={() => {
          setOpen(true);
          updatePosition();
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          setOpen(true);
          updatePosition();
        }}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open && style ? createPortal(
        <div className="tooltipFloating" role="tooltip" style={style}>
          {text}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
