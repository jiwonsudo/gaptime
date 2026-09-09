import type { Submission } from '@/types';
import { nameColor } from '@/lib/overlap';

interface Props {
  submissions: Submission[];
  expectedSize: number;
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
}

export default function ParticipantList({
  submissions,
  expectedSize,
  selectedSlug,
  onSelect,
}: Props) {
  const done = submissions.length;
  const target = Math.max(expectedSize, done);

  return (
    <div className="rounded-lg border border-ink/10 bg-white/50 p-4">
      <div className="mb-2 text-sm font-extrabold">
        올린 사람 <span className="tnum font-normal text-ink/50">{done} / {target}</span>
      </div>
      {done === 0 ? (
        <p className="text-xs text-ink/40">아직 없어요.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
          {submissions.map((s) => {
            const active = selectedSlug === s.slug;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(s.slug)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors ${
                    active ? 'bg-ink text-paper' : 'hover:bg-ink/5'
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: nameColor(s.display_name) }}
                  />
                  {s.display_name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {done > 0 && onSelect && (
        <p className="mt-2 text-xs text-ink/40">이름을 누르면 그 사람 시간표만 볼 수 있어요.</p>
      )}
    </div>
  );
}
