/* Profile photo: a picked image is cropped to a centred square and made small,
   so it fits next to the rest of the profile in the phone's storage. */

const SIZE = 192; // px; shown at up to 88 px, so sharp on 2x screens
const QUALITY = 0.82;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('bad_image'));
    img.src = url;
  });
}

/** File from an <input type="file"> → square JPEG data URL (about 10–20 KB). */
export async function squarePhoto(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('not_image');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error('bad_image');
    const side = Math.min(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNGs get a white background in JPEG
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL('image/jpeg', QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
