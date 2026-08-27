import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { Link2, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

const CATEGORIES = ['Fiction', 'Poetry', 'Essay', 'Art', 'Humor', 'Tech', 'Lifestyle', 'Other'];

export default function ChainNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [maxEntries, setMaxEntries] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [category, setCategory] = useState('');

  const { mutate: createChain, isPending } = useMutation({
    mutationFn: () =>
      (apiRequest('POST', '/api/chains', {
        title: title.trim(),
        description: description.trim() || undefined,
        prompt: prompt.trim() || undefined,
        maxEntries,
        isPublic,
        category: category || undefined,
      }) as unknown) as Promise<{ id: number }>,
    onSuccess: (chain) => {
      toast({ title: 'Chain created!', description: 'Others can now add their links.' });
      navigate(`/chains/${chain.id}`);
    },
    onError: () => {
      toast({ title: 'Failed to create chain', variant: 'destructive' });
    },
  });

  const canSubmit = title.trim().length >= 3 && !isPending;

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/chains">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" /> Start a Chain
            </h1>
            <p className="text-xs text-muted-foreground">
              Set a theme, invite collaboration, build something together.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="chain-title" className="text-sm font-medium">
              Chain Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="chain-title"
              placeholder="e.g. 'A story told in turns'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/120</p>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="chain-prompt" className="text-sm font-medium">
              Prompt / Theme
            </Label>
            <Input
              id="chain-prompt"
              placeholder="e.g. 'Each entry must end with a cliffhanger'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={300}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Give contributors a creative constraint or direction.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="chain-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="chain-description"
              placeholder="Describe what this chain is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(category === cat.toLowerCase() ? '' : cat.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    category === cat.toLowerCase()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Max entries */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Max Links: <span className="text-primary font-semibold">{maxEntries}</span>
            </Label>
            <input
              type="range"
              min={2}
              max={50}
              value={maxEntries}
              onChange={(e) => setMaxEntries(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 min</span>
              <span>50 max</span>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border/40">
            <div>
              <p className="text-sm font-medium">Public chain</p>
              <p className="text-xs text-muted-foreground">Anyone can discover and join this chain</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        {/* Preview */}
        {title && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Preview</p>
            <p className="font-semibold text-foreground">{title}</p>
            {prompt && <p className="text-sm text-muted-foreground italic mt-1">"{prompt}"</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {category && <span className="capitalize">{category}</span>}
              <span>{maxEntries} max links</span>
              <span>{isPublic ? 'Public' : 'Private'}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={() => createChain()}
          disabled={!canSubmit}
          className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 h-11"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {isPending ? 'Creating...' : 'Create Chain'}
        </Button>
      </div>
    </AppLayout>
  );
}
