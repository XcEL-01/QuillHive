import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n';
import { getStoredToken } from '@/lib/api';
import { BookMarked, Plus, Trash2, Loader2, FolderOpen } from 'lucide-react';

type Collection = {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  postCount?: number;
};

export default function Collections() {
  const { toast } = useToast();
  const t = useT();
  const token = getStoredToken();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections', { headers: authHeaders });
      if (res.ok) setCollections(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { toast({ title: t('collections.name', 'Name') + ' is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name, description, isPublic }),
      });
      if (res.ok) {
        const c = await res.json();
        setCollections(prev => [c, ...prev]);
        setShowCreate(false);
        setName(''); setDescription(''); setIsPublic(true);
        toast({ title: t('collections.title', 'Collection') + ' created!' });
      } else {
        toast({ title: 'Failed to create collection', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error creating collection', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        setCollections(prev => prev.filter(c => c.id !== id));
        toast({ title: 'Collection deleted' });
      }
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-0 pb-20 space-y-6">
        <div className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
              <BookMarked className="w-7 h-7 text-primary" />
              {t('collections.title', 'Collections')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t('collections.subtitle', 'Curate reading lists and save posts for later')}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> {t('collections.new', 'New Collection')}
          </Button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        )}

        {!loading && collections.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('collections.empty', 'No collections yet')}</p>
            <p className="text-sm">{t('collections.emptyDesc', 'Create a collection to save and organize posts')}</p>
            <Button className="mt-4 rounded-xl" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t('collections.createFirst', 'Create your first collection')}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {collections.map(col => (
            <Card key={col.id} className="rounded-2xl border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base truncate">{col.name}</h3>
                    <Badge variant={col.isPublic ? 'secondary' : 'outline'} className="text-xs flex-shrink-0">
                      {col.isPublic ? t('collections.public', 'Public') : t('collections.private', 'Private')}
                    </Badge>
                    {col.postCount !== undefined && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">{col.postCount} {t('collections.posts', 'posts')}</Badge>
                    )}
                  </div>
                  {col.description && <p className="text-sm text-muted-foreground line-clamp-2">{col.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(col.createdAt).toLocaleDateString()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(col.id)}
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
              <DialogTitle>{t('collections.new', 'New Collection')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('collections.name', 'Name')}</Label>
                <Input
                  placeholder={t('collections.namePlaceholder', 'e.g. Must-Read Sci-Fi')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('collections.description', 'Description')}</Label>
                <Textarea
                  placeholder={t('collections.descriptionPlaceholder', 'What is this collection about?')}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                  {t('collections.makePublic', 'Make this collection public')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('collections.create', 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
