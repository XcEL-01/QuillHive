import { useState, useEffect } from 'react';
import { useGetPosts } from '@workspace/api-client-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PostCard } from '@/components/post/PostCard';
import { SparkComposer } from '@/components/post/SparkComposer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { PenTool, UserPlus, BookOpen, Check, TrendingUp, Rocket, Sparkles, ArrowUpRight, BriefcaseBusiness, Users, Quote } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { useSocketConnection } from '@/hooks/useSocket';
import { apiUrl, getStoredToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/lib/i18n';
import { StreakChip } from '@/components/profile/StreakWidget';
import { StoriesRow } from '@/components/sparks/StoriesRow';
import { StoryViewer } from '@/components/sparks/StoryViewer';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

type FeedSource = 'explore' | 'following';
type FeedAlgorithm = 'algorithmic' | 'chronological';

interface SuggestedCreator {
  id?: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  headline?: string | null;
}

interface NewVoicePost {
  id: number;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  author?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
}

interface TopicItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
  description?: string | null;
  emoji?: string | null;
}

function GettingStartedChecklist() {
  const { user } = useAuthStore();
  const t = useT();
  const STORAGE_KEY = `gh_checklist_dismissed_${user?.id}`;
  const [dismissed, setDismissed] = useState(() => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1');

  const items: ChecklistItem[] = [
    { id: 'avatar', label: t('home.checklist.avatar'), done: !!user?.avatarUrl, href: '/settings' },
    { id: 'bio', label: t('home.checklist.bio'), done: !!user?.bio, href: '/settings' },
    { id: 'post', label: t('home.checklist.post'), done: (user?.postsCount ?? 0) > 0, href: '/write' },
    { id: 'follow', label: t('home.checklist.follow'), done: (user?.followingCount ?? 0) >= 3, href: '/explore' },
    { id: 'share', label: t('home.checklist.share'), done: (user?.postsCount ?? 0) > 0, href: `/profile/${user?.username}` },
  ];

  const doneCount = items.filter(i => i.done).length;
  if (dismissed || doneCount === items.length) return null;

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          {t('home.checklist.title')} ({doneCount}/{items.length})
        </h2>
        <button onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); setDismissed(true); }} className="text-xs text-muted-foreground hover:text-foreground">{t('home.checklist.dismiss')}</button>
      </div>
      <div className="w-full bg-border rounded-full h-1.5 mb-3">
        <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id}>
            <Link href={item.href ?? '#'} className={`flex items-center gap-2.5 text-sm ${item.done ? 'line-through text-muted-foreground' : 'text-foreground hover:text-primary'}`}>
              <span className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${item.done ? 'bg-primary border-primary' : 'border-border'}`}>
                {item.done && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestedCreators() {
  const [creators, setCreators] = useState<SuggestedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = getStoredToken();
  const t = useT();

  useEffect(() => {
    fetch('/api/users/recommended?limit=5', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setCreators(Array.isArray(data) ? data : []))
      .catch(() => setCreators([]))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (username: string, idx: number) => {
    try {
      await fetch(`/api/users/${username}/follow`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setCreators(c => c.filter((_, i) => i !== idx));
      toast({ title: t('home.followingUser', 'Following user!') });
    } catch {
      toast({ title: t('home.followFailed', 'Failed to follow'), variant: 'destructive' });
    }
  };

  if (!loading && creators.length === 0) return null;

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          {t('home.suggestedForYou')}
        </h2>
        <Link href="/explore" className="text-xs text-primary hover:underline">{t('home.seeAll')}</Link>
      </div>
      <div className="space-y-3">
        {loading && [1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
        {creators.map((creator, idx) => (
          <div key={creator.id} className="flex items-center gap-3">
            <Link href={`/profile/${creator.username}`}>
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={creator.avatarUrl || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {creator.displayName?.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${creator.username}`}>
                <p className="font-medium text-xs text-foreground hover:text-primary truncate">{creator.displayName}</p>
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                {creator.headline || `@${creator.username}`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs rounded-lg flex-shrink-0"
              onClick={() => handleFollow(creator.username, idx)}
            >
              {t('home.follow')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewVoicesSection() {
  const [posts, setPosts] = useState<NewVoicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();

  useEffect(() => {
    fetch('/api/new-voices?limit=8', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Fresh Voices
          <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20 text-[10px] font-semibold ml-0.5">
            New this month
          </Badge>
        </h2>
        <p className="text-xs text-muted-foreground">Discover creators just getting started</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {loading && [1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-52 bg-card border border-border/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}

        {posts.map(post => {
          const author = post.author ?? {};
          const initials = (author.displayName || author.username || '?').slice(0, 2).toUpperCase();
          const excerpt = post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 80) : '');

          return (
            <Link key={post.id} href={`/post/${post.id}`}>
              <div className="flex-shrink-0 w-52 bg-card border border-border/60 rounded-2xl p-4 space-y-2.5 hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                    <AvatarImage src={author.avatarUrl || ''} />
                    <AvatarFallback className="bg-violet-500/10 text-violet-600 text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground group-hover:text-violet-600 transition-colors truncate">
                      {author.displayName || author.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">@{author.username}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
                  {post.title || 'Untitled'}
                </p>
                {excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>
                )}
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-violet-500/8 text-violet-600 dark:text-violet-400 border-violet-500/15">
                    ✨ New creator
                  </Badge>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TopicsPanel() {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();
  const t = useT();

  useEffect(() => {
    fetch('/api/topics', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          {t('home.browseTopics')}
        </h2>
        <Link href="/explore?tab=topics" className="text-xs text-primary hover:underline">{t('home.seeAll')}</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {topics.slice(0, 8).map((topic) => (
          <Link key={topic.id} href={`/topics/${topic.slug}`}>
            <div className="bg-card border border-border/60 rounded-xl p-3 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group">
              <span className="text-2xl mb-1 block">{topic.emoji || '📝'}</span>
              <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{topic.name}</p>
              {topic.postCount != null && (
                <p className="text-xs text-muted-foreground mt-0.5">{topic.postCount} {t('home.posts')}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DailySparkPrompt({ userId }: { userId: number }) {
  const storageKey = `qh_daily_spark_${userId}`;
  const [completed, setCompleted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === new Date().toISOString().slice(0, 10);
  });

  if (completed) return null;

  return (
    <div className="mb-6">
      <SparkComposer
        prompt="What's one thing you learned today?"
        placeholder="A lesson, a surprise, or a question worth keeping..."
        onPosted={() => {
          localStorage.setItem(storageKey, new Date().toISOString().slice(0, 10));
          setCompleted(true);
        }}
      />
      <p className="text-[11px] text-muted-foreground -mt-4 mb-2 px-4">30 seconds is enough. Your answer becomes part of your permanent body of work.</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <PublicLayout>
        <div className="relative overflow-hidden">
          <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
            <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-14 lg:gap-20 items-center">
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-7">
                  <span className="h-px w-8 bg-primary" /> The creative network with momentum
                </p>
                <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl leading-[0.98] font-serif font-semibold tracking-[-0.04em] text-foreground">
                  Make your work <span className="text-primary italic">impossible</span> to overlook.
                </h1>
                <p className="max-w-xl mt-7 text-lg leading-relaxed text-muted-foreground">
                  Publish the work you care about, build a visible body of proof, and meet the people looking for your exact point of view.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-9">
                  <Link href="/login?mode=register" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
                    Start building <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <Link href="/explore" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-border bg-card/70 font-semibold hover:border-primary/50 transition-colors">
                    Explore the hive
                  </Link>
                </div>
                <div className="flex items-center gap-4 mt-10 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {['/images/logo-icon.png', '/images/default-cover.png', '/images/logo-icon-192.png'].map((src) => (
                      <img key={src} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                    ))}
                  </div>
                  <span><strong className="text-foreground">10,000+</strong> creators are finding their next chapter.</span>
                </div>
              </div>

              <div className="relative min-h-[430px] lg:min-h-[520px]">
                <div className="absolute inset-4 sm:inset-8 rounded-[2rem] overflow-hidden bg-[#25133d] shadow-2xl shadow-primary/20">
                  <img src="/images/auth-bg.png" alt="Warm abstract ink and paint texture" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1028] via-[#33184d]/25 to-transparent" />
                  <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-white/80 text-xs uppercase tracking-[0.14em]">
                    <span>Field notes / 01</span><span>QuillHive</span>
                  </div>
                  <div className="absolute left-7 right-7 bottom-8 text-white">
                    <p className="text-sm text-white/70 mb-3">A place for unfinished ideas, sharp opinions, and the work after the work.</p>
                    <p className="text-3xl sm:text-4xl font-serif leading-tight">Your next opportunity starts with being seen.</p>
                  </div>
                </div>
                <div className="absolute -left-1 sm:-left-5 top-14 bg-card border border-border/70 rounded-2xl p-4 shadow-xl max-w-[190px]">
                  <div className="flex items-center gap-2 text-primary mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-semibold">Your momentum</span></div>
                  <p className="text-2xl font-semibold">+42%</p><p className="text-xs text-muted-foreground mt-1">more profile discovery this month</p>
                </div>
                <div className="absolute -right-1 sm:-right-5 bottom-14 bg-[#fff9ee] text-[#2d2117] border border-[#eadbc2] rounded-2xl p-4 shadow-xl max-w-[205px]">
                  <Quote className="w-5 h-5 text-[#e58a32] mb-2" /><p className="text-sm font-medium leading-relaxed">“This is where my portfolio finally feels like a living thing.”</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-border/70 bg-card/50">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid sm:grid-cols-3 gap-10">
              {[
                { icon: PenTool, title: 'Publish with purpose', text: 'Turn notes, essays, projects, and experiments into a body of work people can follow.' },
                { icon: Users, title: 'Find your people', text: 'Build a thoughtful network around shared interests, not noisy metrics.' },
                { icon: BriefcaseBusiness, title: 'Get the right brief', text: 'Let opportunities find the evidence that makes you the right person for the work.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title}>
                  <Icon className="w-5 h-5 text-primary mb-4" />
                  <h2 className="text-xl font-serif font-semibold mb-2">{title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-20 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">A better home for your signal</p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold max-w-xl">Make the archive. Build the reputation.</h2>
            </div>
            <Link href="/login?mode=register" className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">Create your free profile <ArrowUpRight className="w-4 h-4" /></Link>
          </section>
        </div>
      </PublicLayout>
    );
  }

  return <AuthenticatedHome />;
}

function AuthenticatedHome() {
  const t = useT();
  const { token, user } = useAuthStore();
  const initialSource: FeedSource = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'following' || tab === 'explore') return tab;
    } catch { /* ignore */ }
    return 'explore';
  })();
  const [feedSource, setFeedSource] = useState<FeedSource>(initialSource);
  const feedAlgorithm: FeedAlgorithm = 'algorithmic';
  const [feedPosts, setFeedPosts] = useState<import('@workspace/api-client-react').Post[] | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [latestSeenTimestamp, setLatestSeenTimestamp] = useState<string | null>(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState(0);

  useSocketConnection();

  const { data, isLoading, isError: error, refetch } = useGetPosts({
    feed: feedSource === 'following' ? 'following' : undefined,
    limit: 20,
  });

  const fetchAlgorithmicFeed = async (algo: FeedAlgorithm) => {
    setFeedLoading(true);
    setFeedError(false);
    try {
      const res = await fetch(`/api/feed?type=${algo}&limit=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json() as { posts?: unknown };
      if (!res.ok || !Array.isArray(json.posts)) {
        setFeedPosts([]);
        setFeedError(true);
        return;
      }
      setFeedPosts(json.posts as import('@workspace/api-client-react').Post[]);
    } catch {
      setFeedPosts([]);
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (feedSource === 'explore') fetchAlgorithmicFeed('algorithmic');
  }, [feedSource, token]);

  const apiPosts = Array.isArray(data?.posts) ? data.posts : [];
  const displayPosts =
    feedSource === 'explore' ? (feedPosts ?? apiPosts) : apiPosts;
  const isDisplayLoading =
    feedSource === 'explore' ? (feedLoading || (feedPosts === null && isLoading)) : isLoading;

  useEffect(() => {
    if (isDisplayLoading || latestSeenTimestamp) return;
    const newestPost = displayPosts.reduce<import('@workspace/api-client-react').Post | null>(
      (newest, post) => !newest || new Date(post.createdAt).getTime() > new Date(newest.createdAt).getTime() ? post : newest,
      null,
    );
    setLatestSeenTimestamp(newestPost?.createdAt ?? new Date().toISOString());
  }, [displayPosts, isDisplayLoading, latestSeenTimestamp]);

  useEffect(() => {
    if (!latestSeenTimestamp) return;
    const pollForNewPosts = async () => {
      try {
        const res = await fetch(apiUrl(`/api/feed?since=${encodeURIComponent(latestSeenTimestamp)}&limit=100`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as { posts?: unknown };
        setNewPostsAvailable(Array.isArray(data.posts) ? data.posts.length : 0);
      } catch {
        // Polling is non-critical and should not interrupt the feed.
      }
    };
    const interval = window.setInterval(() => void pollForNewPosts(), 30_000);
    return () => window.clearInterval(interval);
  }, [latestSeenTimestamp, token]);

  const handleSourceChange = (val: FeedSource) => {
    setFeedSource(val);
    setFeedPosts(null);
    setFeedError(false);
    setLatestSeenTimestamp(null);
    setNewPostsAvailable(0);
  };

  const handleRefreshFeed = async () => {
    setNewPostsAvailable(0);
    if (feedSource === 'explore') {
      await fetchAlgorithmicFeed(feedAlgorithm);
    } else {
      await refetch();
    }
    setLatestSeenTimestamp(null);
  };

  return (
    <>
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 max-w-2xl">
        <div className="flex flex-col gap-4 mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-3">
              <StreakChip />
            </h1>
            <Tabs value={feedSource} onValueChange={(v) => handleSourceChange(v as FeedSource)}>
              <TabsList className="flex gap-0.5 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="explore" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs shrink-0 px-2.5" data-testid="tab-explore">{t('home.tabs.explore')}</TabsTrigger>
                <TabsTrigger value="following" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs shrink-0 px-2.5" data-testid="tab-following">{t('home.tabs.following')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

        </div>

        {token && user && <DailySparkPrompt userId={user.id} />}

        {(feedSource === 'explore' || feedSource === 'following') && (
          <StoriesRow onOpenViewer={setActiveStoryGroup} />
        )}

        {/* Topics Grid (Topics mode) */}
        {token && <SparkComposer />}

        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Link href="/write" className="flex items-center gap-4 bg-card border border-border/60 rounded-2xl p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-text">
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <PenTool className="w-5 h-5" />
              </div>
              <p className="text-muted-foreground text-lg flex-1">
                {t('home.writePlaceholder', "Share a thought, story, art, or anything you're working on...")}
              </p>
              <span className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium text-sm">
                {t('home.write', 'Write')}
              </span>
            </Link>
        </motion.div>

        <div className="space-y-6">
          {newPostsAvailable > 0 && (
            <button
              type="button"
              onClick={() => void handleRefreshFeed()}
              className="sticky top-16 z-10 mx-auto block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
            >
              {newPostsAvailable} new post{newPostsAvailable > 1 ? 's' : ''} — tap to view
            </button>
          )}

          {isDisplayLoading && (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))
          )}

          {(error || feedError) && !isDisplayLoading && (
            <div className="text-center py-12 text-destructive bg-destructive/10 rounded-2xl border border-destructive/20">
              <p>{t('home.failedToLoad', 'Failed to load feed. Please try again.')}</p>
            </div>
          )}

          {displayPosts?.length === 0 && !isDisplayLoading && (
            <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border">
              <div className="bg-gradient-to-br from-primary/10 to-violet-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {feedSource === 'following' ? <UserPlus className="w-8 h-8 text-primary" /> : <Rocket className="w-8 h-8 text-primary" />}
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2">
                {feedSource === 'following' ? 'Welcome to QuillHive' : 'Be the first to share'}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm mb-5">
                {feedSource === 'following'
                  ? "Your quill is your voice. Your hive is where it grows. Follow people whose voices you value and start building your hive."
                  : 'The first posts here get the most visibility. Start your growth journey now.'}
              </p>
              <Link href={feedSource === 'following' ? '/explore' : '/write'}>
                <Button className="rounded-xl bg-gradient-to-r from-primary to-violet-500 border-0 text-white gap-2">
                  {feedSource === 'following' ? <><UserPlus className="w-4 h-4" /> Explore the hive</> : <><TrendingUp className="w-4 h-4" /> Post & Grow</>}
                </Button>
              </Link>
            </div>
          )}

          {displayPosts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        </div>

        <aside className="hidden lg:block pt-4">
          <div className="sticky top-24">
            <GettingStartedChecklist />
            <SuggestedCreators />
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-violet-500/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t('home.whyQuillhive', 'Why QuillHive')}</p>
              <h2 className="mt-2 font-serif text-xl font-bold">{t('home.growWithYourVoice', 'Grow with your voice.')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('home.growWithYourVoiceDesc', 'Share meaningful work, meet collaborators, and turn consistent practice into real opportunities.')}</p>
              <Link href="/explore" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">{t('home.discoverCreators', 'Discover creators')} →</Link>
            </div>
          </div>
        </aside>
      </div>
      </div>
    </AppLayout>
    {activeStoryGroup && (
      <StoryViewer group={activeStoryGroup} onClose={() => setActiveStoryGroup(null)} />
    )}
    </>
  );
}
