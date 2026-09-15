import { useState, useEffect } from 'react';
import { useGetPosts, GetPostsType } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/post/PostCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Users, Flame, Star, UserPlus, Hash, BookOpen, Check, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { getStoredToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n';

interface ExploreTopicItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  postCount?: number;
  followerCount?: number;
  emoji?: string | null;
}

interface ExploreCreatorItem {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  headline?: string | null;
  followersCount?: number;
  postsCount?: number;
}

function TopicsGrid() {
  const [topics, setTopics] = useState<ExploreTopicItem[]>([]);
  const [trending, setTrending] = useState<ExploreTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const t = useT();
  const token = getStoredToken();
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/topics', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()),
      fetch('/api/topics/following', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => []),
      fetch('/api/topics/trending', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => []),
    ]).then(([all, following, trend]) => {
      setTopics(Array.isArray(all) ? all : []);
      const ids = new Set<number>((Array.isArray(following) ? following : []).map((t: ExploreTopicItem) => t.id));
      setFollowedIds(ids);
      setTrending(Array.isArray(trend) ? trend : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (topic: ExploreTopicItem) => {
    const isFollowing = followedIds.has(topic.id);
    try {
      const res = await fetch(`/api/topics/${topic.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFollowedIds(s => {
          const next = new Set(s);
          isFollowing ? next.delete(topic.id) : next.add(topic.id);
          return next;
        });
        toast({ title: isFollowing ? t('explore.unfollowedTopic', 'Unfollowed') : t('explore.followingTopic', 'Following topic!') });
      }
    } catch {
      toast({ title: t('common.failed', 'Failed'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {trending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">{t('explore.trendingTopics')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending.slice(0, 10).map((topic, i) => (
              <Link key={topic.id ?? i} href={`/topics/${topic.slug}`}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer">
                  <Hash className="w-3 h-3" />
                  {topic.name}
                  <span className="text-xs text-primary/70">· {topic.postCount ?? 0}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-foreground mb-4">{t('explore.allTopics')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {topics.map(topic => (
        <div key={topic.id} className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md hover:border-primary/20 transition-all flex flex-col gap-3">
          <Link href={`/topics/${topic.slug}`} className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">{topic.name}</p>
            </div>
            {topic.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{topic.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {topic.followerCount ?? 0}</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {topic.postCount ?? 0}</span>
            </div>
          </Link>
          <Button
            size="sm"
            variant={followedIds.has(topic.id) ? 'secondary' : 'outline'}
            onClick={() => handleToggle(topic)}
            className="w-full h-7 text-xs rounded-lg gap-1"
          >
            {followedIds.has(topic.id) ? <><Check className="w-3 h-3" /> {t('explore.following')}</> : t('explore.follow')}
          </Button>
        </div>
      ))}
        </div>
      </div>
    </div>
  );
}

function CreatorCard({ creator, onFollow }: { creator: ExploreCreatorItem; onFollow?: (username: string) => void }) {
  const t = useT();
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-primary/20 transition-all">
      <Link href={`/profile/${creator.username}`} className="flex items-center gap-3 group">
        <Avatar className="h-12 w-12 border-2 border-border group-hover:border-primary transition-colors">
          <AvatarImage src={creator.avatarUrl || ''} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {creator.displayName?.substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{creator.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{creator.headline || `@${creator.username}`}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{creator.followersCount ?? 0}</strong> {t('explore.followers')}</span>
          <span><strong className="text-foreground">{creator.postsCount ?? 0}</strong> {t('explore.posts')}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs rounded-lg"
          onClick={() => onFollow?.(creator.username)}
        >
          <UserPlus className="w-3 h-3 mr-1" /> {t('explore.follow')}
        </Button>
      </div>
    </div>
  );
}

function CreatorDiscovery() {
  const [recommended, setRecommended] = useState<ExploreCreatorItem[]>([]);
  const [featured, setFeatured] = useState<ExploreCreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const token = getStoredToken();
  const t = useT();

  useEffect(() => {
    const loadCreators = async () => {
      const [recRes, featRes] = await Promise.all([
        fetch('/api/users/recommended?limit=8', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/users/featured', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      const [recData, featData] = await Promise.all([recRes.json(), featRes.json()]);
      setRecommended(Array.isArray(recData) ? recData : []);
      setFeatured(Array.isArray(featData) ? featData : []);
      setLoading(false);
    };
    loadCreators().catch(() => setLoading(false));
  }, []);

  const handleFollow = async (username: string) => {
    try {
      await fetch(`/api/users/${username}/follow`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRecommended(c => c.filter(cr => cr.username !== username));
      setFeatured(c => c.filter(cr => cr.username !== username));
      toast({ title: t('explore.followingUser', 'Following user!') });
    } catch {
      toast({ title: t('explore.followFailed', 'Failed to follow'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-foreground">{t('explore.featuredCreators')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {featured.map(creator => (
              <CreatorCard key={creator.id} creator={creator} onFollow={handleFollow} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">{t('explore.peopleToFollow')}</h2>
        </div>
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}
        {!loading && recommended.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('explore.allCaughtUp')}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {recommended.map(creator => (
            <CreatorCard key={creator.id} creator={creator} onFollow={handleFollow} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FeaturedPost {
  id: number;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  coverUrl?: string | null;
  authorId?: number | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  createdAt?: string | null;
  isFeatured: boolean;
}

function FeaturedThisWeek() {
  const token = getStoredToken();
  const { data: featured } = useQuery<{ posts: FeaturedPost[] }>({
    queryKey: ["featured-posts"],
    queryFn: async () => {
      const res = await fetch('/api/featured-posts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!featured?.posts?.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-amber-500 text-lg">✦</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Featured by QuillHive
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featured.posts.map(post => (
          <PostCard key={post.id} post={post as any} />
        ))}
      </div>
    </section>
  );
}

export default function Explore() {
  const [activeType, setActiveType] = useState<GetPostsType>(null);
  const [activeTab, setActiveTab] = useState('content');
  const { data, isLoading } = useGetPosts({ type: activeType, feed: 'explore', limit: 30 });
  const t = useT();

  const categories = [
    { id: null, label: t('explore.categoryAll') },
    { id: 'story', label: t('explore.categoryStories') },
    { id: 'poem', label: t('explore.categoryPoetry') },
    { id: 'novel', label: t('explore.categoryNovels') },
    { id: 'artwork', label: t('explore.categoryArtwork') },
    { id: 'post', label: t('explore.categoryDiscussions') },
  ] as const;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-8 text-center max-w-2xl mx-auto pt-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-3">{t('explore.discover')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('explore.discoverSubtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-muted/50 p-1 rounded-xl mb-8">
            <TabsTrigger value="content" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
              <Flame className="w-4 h-4" /> {t('explore.tabContent')}
            </TabsTrigger>
            <TabsTrigger value="topics" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
              <Hash className="w-4 h-4" /> {t('explore.tabTopics')}
            </TabsTrigger>
            <TabsTrigger value="creators" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
              <Users className="w-4 h-4" /> Discover People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveType(cat.id)}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                    activeType === cat.id
                      ? 'bg-primary text-primary-foreground shadow-md -translate-y-0.5'
                      : 'bg-card text-foreground hover:bg-muted border border-border/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {isLoading && (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid bg-card border border-border/50 rounded-2xl p-5 space-y-4 mb-6">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))
              )}
              {(Array.isArray(data?.posts) ? data.posts : []).map((post) => (
                <div key={post.id} className="break-inside-avoid mb-6">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="topics">
            <FeaturedThisWeek />
            <TopicsGrid />
          </TabsContent>

          <TabsContent value="creators">
            <CreatorDiscovery />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
