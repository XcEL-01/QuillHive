import { useEffect, useState } from "react";
import { Link } from "wouter";
import { TrendingUp, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingTopic {
  topic: string;
  count: number;
}

interface TrendingPost {
  id: number;
  title?: string;
  excerpt?: string;
  authorDisplayName?: string;
  author?: { username?: string; displayName?: string };
  likeCount?: number;
}

export function TrendingWidget() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [topicsRes, postsRes] = await Promise.all([
          fetch("/api/topics/trending?limit=5").then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch("/api/feed/trending?limit=5").then((r) => (r.ok ? r.json() : { posts: [] })).catch(() => ({ posts: [] })),
        ]);
        if (cancelled) return;
        const t = Array.isArray(topicsRes) ? topicsRes : Array.isArray(topicsRes?.topics) ? topicsRes.topics : [];
        setTopics(t.slice(0, 5));
        setPosts(Array.isArray(postsRes?.posts) ? postsRes.posts.slice(0, 5) : []);
      } catch {
        if (!cancelled) {
          setTopics([]);
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const isEmpty = !loading && topics.length === 0 && posts.length === 0;

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-6">
      <h2 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        Trending now
      </h2>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )}

      {isEmpty && (
        <p className="text-xs text-muted-foreground py-2">
          Trends are still warming up. Post or follow topics to start the buzz.
        </p>
      )}

      {topics.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {topics.map((t) => (
            <Link
              key={t.topic}
              href={`/explore?topic=${encodeURIComponent(t.topic)}`}
              className="flex items-center justify-between text-sm text-foreground/90 hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{t.topic}</span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Hot reads
          </p>
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.id}`}
              className="block text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {p.title || p.excerpt || "Untitled"}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
