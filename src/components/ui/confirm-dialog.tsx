import { useEffect, useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Input } from './input';

interface Props {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  // 값을 넣으면 이 문구를 정확히 입력해야 확인 버튼 활성화 (GitHub 스타일)
  confirmPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  confirmPhrase,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const locked = confirmPhrase != null && typed.trim() !== confirmPhrase;

  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="text-base font-extrabold">{title}</h3>
      {body && <div className="mt-2 text-sm leading-relaxed text-ink/70">{body}</div>}
      {confirmPhrase != null && (
        <div className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-ink/50">
            확인하려면 <b className="text-ink/80">{confirmPhrase}</b> 를 입력하세요
          </span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? 'cta' : 'primary'}
          size="sm"
          disabled={locked}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
