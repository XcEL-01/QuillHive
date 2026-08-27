import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { getStoredToken } from '@/lib/api';
import { Loader2, Zap, Image as ImageIcon, X, Wand2 } from 'lucide-react';

const MAX_CHARS = 280;

export default function SparksNew() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [makingPunchier, setMakingPunchier] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MAX_CHARS - content.length;
  const counterColor = remaining <= 10 ? 'text-destructive' : remaining <= 40 ? 'text-amber-500' : 'text-muted-foreground';

  const handlePublish = async () => {
    if (!content.trim()) return;
    setPublishing(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: content.trim(), type: 'spark', imageUrl: imageUrl || undefined, isPublished: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to publish');
      }
      toast({ title: '⚡ Spark published!', description: 'Your spark is live.' });
      navigate('/');
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleMakePunchier = async () => {
    if (!content.trim()) return;
    setMakingPunchier(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: content.trim(), focus: 'punchy' }),
      });
      if (res.ok) {
        const data = await res.json() as { result?: string; improved?: string };
        const improved = data.result ?? data.improved;
        if (improved) setContent(improved.slice(0, MAX_CHARS));
      }
    } catch {
      /* silent */
    } finally {
      setMakingPunchier(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">New Spark</h1>
            <p className="text-xs text-muted-foreground">Share a quick burst of an idea</p>
          </div>
        </div>

        {/* Main compose card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What's sparking your mind?"
              rows={6}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            />
            {/* Character counter */}
            <div className={`absolute bottom-2 right-3 text-xs font-mono font-medium tabular-nums ${counterColor}`}>
              {remaining}
            </div>
          </div>

          {imageUrl && (
            <div className="relative mx-4 mb-3">
              <img src={imageUrl} alt="" className="w-full rounded-xl object-cover max-h-52" onError={() => setImageUrl('')} />
              <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { const url = prompt('Image URL:'); if (url) setImageUrl(url); }}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                title="Add image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleMakePunchier}
                disabled={!content.trim() || makingPunchier}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40 disabled:opacity-50 transition-colors"
              >
                {makingPunchier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Make it punchier
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="rounded-xl h-8">Cancel</Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={!content.trim() || publishing || content.length > MAX_CHARS}
                className="rounded-xl h-8 bg-amber-500 hover:bg-amber-600 text-white px-5"
              >
                {publishing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Publishing</> : '⚡ Spark'}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">Sparks are short, punchy ideas. No title needed.</p>
      </div>
    </AppLayout>
  );
}
