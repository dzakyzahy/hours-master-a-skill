// Phone photos are 3-8 MB. The avatar travels inside the profiles row and the zustand
// store, so it has to be shrunk before it is ever stored.
// ponytail: data URL in a TEXT column. Fine for a few hundred users; move to Supabase
// Storage once profile list queries carry enough of these rows to hurt.

const MAX_PX = 256;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Longest side capped at `max`, aspect ratio kept. Rendering uses object-fit: cover, so no crop. */
export function fitDimensions(width: number, height: number, max = MAX_PX) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (JPG, PNG, atau WEBP).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Gambar terlalu besar. Maksimal 12 MB.');
  }

  // imageOrientation honours EXIF, otherwise photos from the phone camera come out sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitDimensions(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Perangkat ini tidak bisa memproses gambar.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}
