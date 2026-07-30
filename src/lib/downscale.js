// Shrink an image before upload so Storage stays cheap and the carousel stays
// smooth. Used on every upload path — guest and admin bulk seed alike.
export async function downscale(file, maxDim = 2048, quality = 0.85) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
}
