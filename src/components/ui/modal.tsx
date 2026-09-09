import * as React from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  dismissable?: boolean;
}

// 톤 맞춘 공용 모달. window.alert/confirm 대체.
export function Modal({ open, onClose, children, className, dismissable = true }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => dismissable && e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4"
      onClick={() => dismissable && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full max-w-sm animate-modal-in rounded-xl border border-ink/10 bg-paper p-5 shadow-2xl',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
