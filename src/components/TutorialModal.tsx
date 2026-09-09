import { useState } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: '에브리프리타임이 뭔가요',
    body: '팀플·스터디 시간 잡을 때, 팀원 모두의 에타 시간표를 한 화면에 겹쳐서 "몇 명이 비는지"를 색으로 보여주는 서비스예요. When2meet의 시간표 버전.',
  },
  {
    title: '방을 만들고 링크를 공유하세요',
    body: '방 이름 · 시간 범위 · 예상 인원을 정하고 방을 만들면 짧은 링크가 나옵니다. 그 링크(또는 QR)를 단톡방에 뿌리면 끝. 로그인 없어요.',
  },
  {
    title: '각자 자기 폰에서 올려요',
    body: '링크를 연 사람은 이름을 넣고 에타 시간표 스크린샷을 올린 뒤, 주황색 두 점을 드래그해 격자 모서리에 맞추면 됩니다. 이미지는 서버로 안 가고, 빈 시간 정보만 전송돼요.',
  },
  {
    title: '결과는 실시간 히트맵',
    body: '누가 새로 올릴 때마다 히트맵이 즉시 갱신됩니다. 진한 초록일수록 많은 사람이 비는 시간. 칸에 마우스를 올리면 누가 가능한지 이름이 나와요.',
  },
];

export default function TutorialModal({ open, onClose }: Props) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex items-center justify-between">
        <span className="tnum text-xs font-bold text-ink/40">
          {i + 1} / {STEPS.length}
        </span>
        <button className="text-xs text-ink/40 underline" onClick={onClose}>
          건너뛰기
        </button>
      </div>
      <h2 className="mt-3 text-lg font-extrabold">{step.title}</h2>
      <p className="mt-2 min-h-[5.5rem] text-sm leading-relaxed text-ink/70">{step.body}</p>
      <div className="mt-4 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={i === 0}
          onClick={() => setI((n) => Math.max(0, n - 1))}
        >
          이전
        </Button>
        {last ? (
          <Button variant="cta" size="sm" onClick={onClose}>
            시작하기
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setI((n) => n + 1)}>
            다음
          </Button>
        )}
      </div>
    </Dialog>
  );
}
