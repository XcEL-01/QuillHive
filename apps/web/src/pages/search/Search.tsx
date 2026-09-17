import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useGetPosts, useGetGroups } from '@workspace/api-client-react';
import { PostCard } from '@/components/post/PostCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, Users, FileText, Hash, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'wouter';
import { getStoredToken } from '@/lib/api';
import { useT } from '@/lib/i18n';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Brazil', 'Japan', 'Nigeria'];
const CATEGORIES = ['developer', 'designer', 'writer', 'photographer', 'artist', 'musician', 'marketer', 'filmmaker'];

export default function Search() {
  usePageTitle('Search');
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [tab, setTab] = useState('posts');
  const [showFilters, setShowFilters] = useState(false);
  const [skillFilter, setSkillFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [serverPosts, setServerPosts] = useState<any[] | null>(null);
  const [serverPostsLoading, setServerPostsLoading] = useState(false);
  const token = getStoredToken();
  const t = useT();

  const { data: postsData, isLoading: postsLoading } = useGetPosts({ limit: 30 });
  const { data: groupsData, isLoading: groupsLoading } = useGetGroups({ search: query || undefined });

  useEffect(() => {
    if (!query.trim()) {
      setServerPosts(null);
      return;
    }
    setServerPostsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=post&limit=30`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setServerPosts(Array.isArray(data.posts) ? data.posts.map((h: any) => h.post ?? h) : []);
      } catch {
        setServerPosts([]);
      } finally {
        setServerPostsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, token]);

  const filteredPosts = query
    ? (Array.isArray(serverPosts) ? serverPosts : [])
    : (Array.isArray(postsData?.posts) ? postsData.posts : []);

  const searchPeople = useCallback(async () => {
    if (!query && !skillFilter && !countryFilter && !categoryFilter) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (skillFilter) params.set('skills', skillFilter);
      if (countryFilter) params.set('country', countryFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/users/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, skillFilter, countryFilter, categoryFilter, token]);

  useEffect(() => {
    if (tab === 'people') {
      const timeout = setTimeout(searchPeople, 300);
      return () => clearTimeout(timeout);
    }
  }, [query, skillFilter, countryFilter, categoryFilter, tab, searchPeople]);

  const hasFilters = skillFilter || countryFilter || categoryFilter;

  const clearFilters = () => {
    setSkillFilter('');
    setCountryFilter('');
    setCategoryFilter('');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-0 py-4">
        <h1 className="text-3xl font-serif font-bold mb-6">{t('search.title')}</h1>

        <div className="relative mb-4">
          <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-12 pr-12 rounded-2xl h-12 text-base bg-card border-border/60 focus:border-primary/50"
            autoFocus
          />
          {tab === 'people' && (
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                showFilters || hasFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {tab === 'people' && showFilters && (
          <div className="bg-card border border-border/60 rounded-2xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t('search.filterCreators')}</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" /> {t('search.clearFilters')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('search.skillsLabel')}</label>
                <Input
                  value={skillFilter}
                  onChange={e => setSkillFilter(e.target.value)}
                  placeholder={t('search.skillsPlaceholder')}
                  className="rounded-xl h-9 text-sm bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('search.countryLabel')}</label>
                <select
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('search.anyCountry')}</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('search.categoryLabel')}</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('search.anyCategory')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
            </div>

            {hasFilters && (
              <div className="flex flex-wrap gap-2">
                {skillFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {t('search.skillsLabel')}: {skillFilter}
                    <button onClick={() => setSkillFilter('')} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {countryFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {t('search.countryLabel')}: {countryFilter}
                    <button onClick={() => setCountryFilter('')} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {categoryFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1 capitalize">
                    {t('search.categoryLabel')}: {categoryFilter}
                    <button onClick={() => setCategoryFilter('')} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 mb-6 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="posts" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4" /> {t('search.tabPosts')}
            </TabsTrigger>
            <TabsTrigger value="people" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" /> {t('search.tabPeople')}
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Hash className="w-4 h-4" /> {t('search.tabGroups')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-5">
            {(query ? serverPostsLoading : postsLoading) && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div>
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
            {!(query ? serverPostsLoading : postsLoading) && filteredPosts?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{t('search.noPostsFound')}</p>
                <p className="text-sm mt-1">{t('search.tryDifferentTerm')}</p>
              </div>
            )}
            {filteredPosts?.map(post => <PostCard key={post.id} post={post} />)}
          </TabsContent>

          <TabsContent value="people" className="space-y-3">
            {searching && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
              </div>
            ))}
            {!searching && !query && !hasFilters && (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{t('search.searchForCreators')}</p>
                <p className="text-sm mt-1">{t('search.useSearchOrFilters')}</p>
              </div>
            )}
            {!searching && (query || hasFilters) && searchResults.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{t('search.noPeopleFound')}</p>
                <p className="text-sm mt-1">{t('search.tryAdjustFilters')}</p>
              </div>
            )}
            {searchResults.map(u => (
              <Link key={u.id} href={`/profile/${u.username}`}>
                <div className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                  <Avatar className="w-12 h-12 border border-border/50">
                    <AvatarImage src={u.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{u.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                    {(u as any).headline && <p className="text-xs text-primary/80 truncate mt-0.5">{(u as any).headline}</p>}
                    {u.country && <p className="text-xs text-muted-foreground mt-0.5">📍 {u.country}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{u.followersCount}</p>
                    <p className="text-xs text-muted-foreground">{t('search.followers')}</p>
                  </div>
                </div>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="groups" className="space-y-3">
            {groupsLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div></div>
              </div>
            ))}
            {!groupsLoading && groupsData?.groups.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{t('search.noGroupsFound')}</p>
              </div>
            )}
            {groupsData?.groups.map(g => (
              <Link key={g.id} href={`/groups/${g.id}`}>
                <div className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                    {g.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-2 py-0">{g.category}</Badge>
                      <span className="text-xs text-muted-foreground">{g.membersCount} {t('search.members')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
