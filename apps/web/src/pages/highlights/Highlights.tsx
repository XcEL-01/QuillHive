import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Sparkles, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import { useEffect, useState } from 'react';

interface HighlightPost {
  id: number;
  title: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  type: string;
  expiresAt: string;
  createdAt: string;
  author: {
    id: number;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function Highlights() {
  const { data, isLoading } = useQuery<HighlightPost[]>({
    queryKey: ['/api/highlights'],
    queryFn: async () => (await apiRequest('GET', '/api/highlights')).json(),
  });

  // Re-render every 60s so countdowns stay fresh
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide font-semibold">Sparks</span>
          </div>
          <h1 className="text-3xl font-serif font-bold">Moments that vanish in 24 hours</h1>
          <p className="text-muted-foreground mt-1">Quick thoughts and work updates that disappear after a day.</p>
        </header>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-2xl">
            No active highlights right now. Check back soon.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`}>
                <a className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
                  {p.imageUrl && (
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{timeLeft(p.expiresAt)}</span>
                      <span>·</span>
                      <span>@{p.author.username ?? 'unknown'}</span>
                    </div>
                    <h2 className="font-serif text-lg font-semibold leading-snug mb-1 line-clamp-2">
                      {p.title || 'Untitled'}
                    </h2>
                    {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
