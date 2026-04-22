import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  ariaLabel,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      lastFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      node.showModal();
      window.requestAnimationFrame(() => {
        focusInitialElement(node);
      });
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleClose = () => {
      restoreFocus(lastFocusedElementRef.current);
      onClose();
    };
    node.addEventListener('cancel', handleCancel);
    node.addEventListener('close', handleClose);
    return () => {
      node.removeEventListener('cancel', handleCancel);
      node.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={className ? `doku-dialog ${className}` : 'doku-dialog'}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="doku-dialog__body" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header className="doku-dialog__header">
          <h2 id={titleId} className="doku-dialog__title">{title}</h2>
          {subtitle && <p id={subtitleId} className="doku-dialog__subtitle">{subtitle}</p>}
        </header>
        <div>{children}</div>
        {footer && <div className="doku-dialog__footer">{footer}</div>}
      </div>
    </dialog>
  );
}

function focusInitialElement(node: HTMLDialogElement) {
  const preferredTarget = node.querySelector<HTMLElement>(
    '[data-dialog-autofocus], [autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );

  if (preferredTarget) {
    preferredTarget.focus();
    return;
  }

  const body = node.querySelector<HTMLElement>('.doku-dialog__body');
  body?.focus();
}

function restoreFocus(target: HTMLElement | null) {
  if (!target || !target.isConnected) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.focus();
  });
}
