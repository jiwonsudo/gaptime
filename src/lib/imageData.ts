// 원본 이미지를 오프스크린 캔버스에 그려 픽셀 데이터를 얻는다.
// 이 데이터는 로컬에서만 쓰이고 서버로 전송되지 않는다.
export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}
