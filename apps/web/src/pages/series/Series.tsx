import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n';
import { getStoredToken } from '@/lib/api';
import { BookOpen, Plus, Trash2, Loader2, Library } from 'lucide-react';

type SeriesItem = {
  id: number;
  title: string;
  description?: string;
  coverUrl?: string;
  status: string;
  createdAt: string;
  postCount?: number;
};

export default function Series() {
  const { toast } = useToast();
  const t = useT();
  const token = getStoredToken();
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSeries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/series', { headers: authHeaders });
      if (res.ok) setSeriesList(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSeries(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const s = await res.json();
        setSeriesList(prev => [s, ...prev]);
        setShowCreate(false);
        setTitle(''); setDescription('');
        toast({ title: 'Series created!' });
      } else {
        toast({ title: 'Failed to create series', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error creating series', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/series/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        setSeriesList(prev => prev.filter(s => s.id !== id));
        toast({ title: 'Series deleted' });
      }
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-0 pb-20 space-y-6">
        <BackButton />
        <div className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
              <Library className="w-7 h-7 text-primary" />
              {t('series.title', 'Content Series')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t('series.subtitle', 'Group posts into ordered series for your readers')}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> {t('series.new', 'New Series')}
          </Button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        )}

        {!loading && seriesList.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('series.empty', 'No series yet')}</p>
            <p className="text-sm">{t('series.emptyDesc', 'Create a series to organize multi-part stories or tutorials')}</p>
            <Button className="mt-4 rounded-xl" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t('series.start', 'Start a series')}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {seriesList.map(s => (
            <Card key={s.id} className="rounded-2xl border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-start gap-4">
                {s.coverUrl && (
                  <img src={s.coverUrl} alt={s.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base truncate">{s.title}</h3>
                    <Badge variant="secondary" className="text-xs capitalize">{s.status}</Badge>
                    {s.postCount !== undefined && (
                      <Badge variant="outline" className="text-xs">{s.postCount} {t('series.parts', 'parts')}</Badge>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(s.id)}
                  className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t('series.new', 'New Series')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('series.titleLabel', 'Title')}</Label>
                <Input
                  placeholder={t('series.titlePlaceholder', 'e.g. The Dragon Chronicles')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="rounded-xl font-serif"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('series.description', 'Description')}</Label>
                <Textarea
                  placeholder={t('series.descriptionPlaceholder', 'Briefly describe this series...')}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('series.create', 'Create Series')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
