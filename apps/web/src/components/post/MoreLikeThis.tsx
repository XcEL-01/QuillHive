import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Link } from 'wouter';
import { Sparkles, Loader2 } from 'lucide-react';

interface SimilarPost {
  post: {
    id: number;
    title: string | null;
    excerpt: string | null;
    imageUrl: string | null;
    type: string;
    authorId: number;
  };
  score: number;
}

export function MoreLikeThis({ postId }: { postId: number }) {
  const { data, isLoading } = useQuery<SimilarPost[]>({
    queryKey: ['/api/posts', postId, 'similar'],
    queryFn: async () => (await apiRequest('GET', `/api/posts/${postId}/similar?limit=6`)).json(),
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="my-10 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Finding similar posts…
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <section className="my-12 border-t border-border pt-8">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground mb-5">
        <Sparkles className="w-4 h-4 text-primary" /> More like this
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(({ post }) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/30 transition-colors p-4"
            data-testid={`similar-post-${post.id}`}
          >
            {post.imageUrl && (
              <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                <img src={post.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            )}
            <h4 className="font-serif font-medium text-foreground line-clamp-2 mb-1.5">
              {post.title ?? 'Untitled'}
            </h4>
            {post.excerpt && (
              <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
