import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getStoredToken } from '@/lib/api';
import { Film, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { ImageUploadField } from '@/components/media/ImageUploadField';
import { BackButton } from '@/components/ui/BackButton';

export default function MotionUpload() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [publishing, setPublishing] = useState(false);

  const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm'];
  const MAX_SIZE = 500 * 1024 * 1024;

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      toast({ title: 'Unsupported format', description: 'Please upload MP4, MOV, or WebM.', variant: 'destructive' }); return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 500MB.', variant: 'destructive' }); return;
    }
    setFile(f);
    simulateUpload(f);
  }, []);

  const simulateUpload = async (f: File) => {
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + Math.random() * 15;
      });
    }, 200);

    try {
      const token = getStoredToken();
      const formData = new FormData();
      formData.append('file', f);
      formData.append('upload_preset', 'quillhive_motion');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dff8hzsnr'}/video/upload`, {
        method: 'POST',
        body: formData,
      });
      clearInterval(interval);
      if (res.ok) {
        const data = await res.json() as { secure_url?: string };
        setUploadedUrl(data.secure_url || '');
        setUploadProgress(100);
      } else {
        setUploadProgress(0);
        toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch {
      clearInterval(interval);
      setUploadProgress(0);
      toast({ title: 'Upload failed', description: 'Please check your connection.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handlePublish = async () => {
    if (!title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setPublishing(true);
    try {
      const token = getStoredToken();
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: title.trim(),
          content: description.trim() || title.trim(),
          type: 'artwork',
          imageUrl: thumbnail || uploadedUrl || undefined,
          tags,
          isPublished: true,
          attachments: uploadedUrl ? [{ type: 'video', url: uploadedUrl, name: file?.name }] : [],
        }),
      });
      if (!res.ok) throw new Error('Failed to publish');
      const post = await res.json() as { id?: number };
      toast({ title: 'Motion published!', description: 'Your video is live.' });
      navigate(post.id ? `/post/${post.id}` : '/motion');
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackButton fallback="/motion" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Upload Motion</h1>
            <p className="text-xs text-muted-foreground">Share video or visual content with your audience</p>
          </div>
        </div>

        {/* Upload Zone */}
        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed cursor-pointer transition-all min-h-[280px] ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Drop your video here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM - max 500MB</p>
              </div>
              <Button variant="outline" className="rounded-xl mt-2">Browse files</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                <Film className="w-6 h-6 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              {!uploading && (
                <button onClick={() => { setFile(null); setUploadedUrl(''); setUploadProgress(0); }} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {(uploading || uploadProgress > 0) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uploading ? 'Uploading...' : 'Upload complete'}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            {uploadProgress === 100 && !uploading && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Video uploaded successfully
              </div>
            )}
          </div>
        )}

        {/* Metadata (shown after file selected) */}
        {file && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Title <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your motion a title..." className="rounded-xl" maxLength={180} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this video about?"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tags <span className="text-xs font-normal text-muted-foreground">(comma-separated, max 5)</span></Label>
              <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="filmmaking, creative, vlog..." className="rounded-xl" />
            </div>
            <ImageUploadField value={thumbnail} onChange={setThumbnail} category="post" label="Choose custom thumbnail" />

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate('/motion')} className="rounded-xl flex-1">Cancel</Button>
              <Button
                onClick={handlePublish}
                disabled={!title.trim() || publishing || uploading}
                className="rounded-xl flex-1 bg-pink-600 hover:bg-pink-700 text-white"
              >
                {publishing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</> : 'Publish Motion'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
