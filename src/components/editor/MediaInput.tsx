import { useRef, useState } from 'react';
import { Link2, Trash2, Upload } from 'lucide-react';
import { imageFileToDataURL, isValidUrl, mediaFileToDataURL, youtubeEmbed } from '../../lib/files';
import { Button, IconButton, toast } from '../ui';

export function MediaPreview({ kind, src, className = '' }: { kind: 'image' | 'audio' | 'video'; src: string; className?: string }) {
  if (kind === 'image') return <img src={src} alt="" className={`max-h-48 rounded-lg object-contain ${className}`} />;
  if (kind === 'audio') return <audio src={src} controls className={`w-full ${className}`} />;
  const yt = youtubeEmbed(src);
  if (yt) return <iframe src={yt} title="Video" className={`aspect-video w-full rounded-lg ${className}`} allow="autoplay; encrypted-media" allowFullScreen />;
  return <video src={src} controls className={`max-h-56 w-full rounded-lg ${className}`} />;
}

export function MediaInput({ kind, value, onChange }: { kind: 'image' | 'audio' | 'video'; value?: string; onChange: (v: string | undefined) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';

  const applyUrl = () => {
    const u = url.trim();
    if (!u) return;
    if (!isValidUrl(u)) return toast('Enter a valid http(s) URL.', 'error');
    onChange(u);
    setUrl('');
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      {value ? (
        <div className="space-y-2">
          <MediaPreview kind={kind} src={value} />
          <div className="flex items-center justify-between gap-2 text-xs text-blue-200/60">
            <span className="truncate">{value.startsWith('data:') ? `Uploaded file (${Math.round((value.length * 0.75) / 1024)} KB)` : value}</span>
            <IconButton label={`Remove ${kind}`} onClick={() => onChange(undefined)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" icon={<Upload size={14} />} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Loading…' : `Upload ${kind}`}
          </Button>
          <div className="flex flex-1 gap-1">
            <input
              className="input !py-1.5 text-sm"
              placeholder={kind === 'video' ? 'or paste a video / YouTube URL' : `or paste an ${kind} URL`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
            />
            <Button size="sm" icon={<Link2 size={14} />} onClick={applyUrl} disabled={!url.trim()}>
              Use
            </Button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            onChange(kind === 'image' ? await imageFileToDataURL(f) : await mediaFileToDataURL(f, kind));
          } catch (err) {
            toast((err as Error).message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
