import { useEffect, useRef } from 'react';

// Thin wrapper over the native <dialog>, which gives us focus trapping,
// Esc-to-close and a ::backdrop for free. Children only render while open.
export default function Modal({ open, onClose, className, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      dlg.querySelector('[data-autofocus]')?.focus();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className={className} onClose={onClose}>
      {open ? children : null}
    </dialog>
  );
}
