export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read file.'));
    r.readAsDataURL(file);
  });
}

/** Downscale large images so saved games stay small. */
export async function imageFileToDataURL(file: File, maxSize = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const url = await readFileAsDataURL(file);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return url;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not load image.'));
    i.src = url;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 400_000) return url;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
}

export async function mediaFileToDataURL(file: File, kind: 'audio' | 'video'): Promise<string> {
  if (!file.type.startsWith(kind + '/')) throw new Error(`Please choose an ${kind} file.`);
  if (file.size > MAX_MEDIA_BYTES) throw new Error(`File is too large (max ${MAX_MEDIA_BYTES / 1024 / 1024} MB). Use a URL instead.`);
  return readFileAsDataURL(file);
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(s: string) {
  return (s || 'game').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'game';
}

export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function isValidUrl(s: string): boolean {
  if (s.startsWith('data:')) return true;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
