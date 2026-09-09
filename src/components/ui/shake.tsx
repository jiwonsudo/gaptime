import * as React from 'react';

// 부적절한 값 입력 시 필드를 흔드는 공용 모션.
// useShake() 로 shake() 를 호출하면 key 가 바뀌며 애니메이션이 재생된다.
export function useShake() {
  const [n, setN] = React.useState(0);
  const shake = React.useCallback(() => setN((v) => v + 1), []);
  return { shakeKey: n, shake };
}

interface ShakeProps {
  shakeKey: number;
  children: React.ReactNode;
  className?: string;
}

export function Shake({ shakeKey, children, className }: ShakeProps) {
  return (
    <div key={shakeKey} className={shakeKey > 0 ? `animate-shake ${className ?? ''}` : className}>
      {children}
    </div>
  );
}
