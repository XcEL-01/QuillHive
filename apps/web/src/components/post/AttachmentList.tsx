import { attachmentIcon, type Attachment } from './AttachmentPicker';
import { Download } from 'lucide-react';

interface AttachmentListProps {
  attachments: Attachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
  const resolveUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiBase}${url}`;
  };

  const images = attachments.filter((a) => a.mimeType.startsWith('image/'));
  const videos = attachments.filter((a) => a.mimeType.startsWith('video/'));
  const audios = attachments.filter((a) => a.mimeType.startsWith('audio/'));
  const docs = attachments.filter((a) => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('video/') && !a.mimeType.startsWith('audio/'));

  return (
    <div className="space-y-3 mt-3">
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {images.map((a, i) => (
            <a key={`img-${i}`} href={resolveUrl(a.url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden bg-muted">
              <img src={resolveUrl(a.url)} alt={a.filename || 'attachment'} className="w-full h-full object-cover max-h-96" />
            </a>
          ))}
        </div>
      )}
      {videos.map((a, i) => (
        <video key={`vid-${i}`} controls preload="metadata" className="w-full max-h-96 rounded-xl bg-black">
          <source src={resolveUrl(a.url)} type={a.mimeType} />
        </video>
      ))}
      {audios.map((a, i) => (
        <div key={`aud-${i}`} className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1.5 truncate">{a.filename || 'Audio'}</p>
          <audio controls preload="metadata" className="w-full">
            <source src={resolveUrl(a.url)} type={a.mimeType} />
          </audio>
        </div>
      ))}
      {docs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {docs.map((a, i) => {
            const Icon = attachmentIcon(a.mimeType);
            return (
              <a
                key={`doc-${i}`}
                href={resolveUrl(a.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.filename || 'Attachment'}</p>
                  <p className="text-xs text-muted-foreground">{a.mimeType}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
