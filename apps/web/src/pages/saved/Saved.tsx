import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/post/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, Inbox } from 'lucide-react';
import { getStoredToken } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function Saved() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();
  const t = useT();

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/users/me/saved', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setPosts(data.posts || []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-0 space-y-6">
        <div className="flex items-center gap-3 pt-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{t('saved.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('saved.subtitle')}</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{t('saved.noPostsTitle')}</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              {t('saved.noPostsDesc')}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
