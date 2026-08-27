import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apiRequest } from '@/lib/api';
import { SUPPORTED_LANGS } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface Props {
  postId: number;
  sourceText: string;
  onTranslated: (translated: string | null) => void;
}

export function TranslateButton({ postId, sourceText, onTranslated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { toast } = useToast();

  async function translate(lang: string) {
    if (loading) return;
    if (active === lang) {
      setActive(null);
      onTranslated(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/ai/translate', {
        text: sourceText,
        targetLang: lang,
        postId,
      });
      const data = await res.json();
      if (data?.translatedText) {
        setActive(lang);
        onTranslated(data.translatedText);
      } else {
        throw new Error('No translation returned');
      }
    } catch (err: any) {
      toast({ title: 'Translation failed', description: err?.message ?? 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
          {active ? `Translated · ${active.toUpperCase()}` : 'Translate'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-xs text-muted-foreground px-2 py-1">Translate this post to…</div>
        <ul className="space-y-0.5 max-h-72 overflow-y-auto">
          {SUPPORTED_LANGS.map((l) => (
            <li key={l.code}>
              <button
                onClick={() => translate(l.code)}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                  active === l.code ? 'bg-accent font-medium' : ''
                }`}
              >
                {l.name}
              </button>
            </li>
          ))}
          {active && (
            <li className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setActive(null);
                  onTranslated(null);
                  setOpen(false);
                }}
                className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
              >
                Show original
              </button>
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
