import { useRef } from 'react';
import { Button } from './ui/button';

interface Props {
  onImage: (img: HTMLImageElement) => void;
}

export default function ImageUploader({ onImage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onImage(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink/25 bg-white/40 p-10 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <p className="text-sm text-ink/60">
        에타 시간표 스크린샷을 올려주세요. 이미지는 이 브라우저를 벗어나지 않습니다.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        이미지 선택
      </Button>
    </div>
  );
}
