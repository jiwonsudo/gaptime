import type { Submission } from '@/types';
import { nameColor } from '@/lib/overlap';

interface Props {
  submissions: Submission[];
  expectedSize: number;
}

export default function ParticipantList({ submissions, expectedSize }: Props) {
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
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {submissions.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: nameColor(s.display_name) }}
              />
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
