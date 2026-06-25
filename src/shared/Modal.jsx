import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';

export default function Modal({ title, children, actions, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelector('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((item) => !item.disabled && item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, []);
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modalPanel" ref={panelRef}>
        <div className="modalHeader">
          <h3 id={titleId}>{title}</h3>
          <IconButton icon={X} label="Zamknij" onClick={onClose} />
        </div>
        <div className="modalBody">{children}</div>
        {actions ? <div className="modalActions">{actions}</div> : null}
      </div>
    </div>
  );
}
