import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ChainCard, type ChainSummary } from '@/components/chains/ChainCard';
import { apiRequest } from '@/lib/api';
import { Link2, Plus, Sparkles, BookOpen, Feather, Mic2, Laugh } from 'lucide-react';

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Fiction', value: 'fiction', icon: BookOpen },
  { label: 'Poetry', value: 'poetry', icon: Feather },
  { label: 'Essay', value: 'essay', icon: Sparkles },
  { label: 'Art', value: 'art', icon: Mic2 },
  { label: 'Humor', value: 'humor', icon: Laugh },
];

export default function ChainDiscover() {
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState('recent');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/chains', { category, tab }],
    queryFn: async () => {
      const params = new URLSearchParams({ tab, limit: '30' });
      if (category) params.set('category', category);
      return (apiRequest('GET', `/api/chains?${params}`) as unknown) as Promise<{ chains: ChainSummary[] }>;
    },
  });

  const chains = data?.chains ?? [];
  const active = chains.filter((c) => !c.isComplete);
  const complete = chains.filter((c) => c.isComplete);
  const displayed = tab === 'active' ? active : tab === 'complete' ? complete : chains;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Link2 className="w-6 h-6 text-primary" /> Chains
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Collaborative creative threads. Add your link. Build something together.
            </p>
          </div>
          <Link href="/chains/new">
            <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Chain
            </Button>
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                category === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {cat.icon && <cat.icon className="w-3 h-3" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tab selector */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50 rounded-xl">
            <TabsTrigger value="recent" className="rounded-lg text-xs">Recent</TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-xs">Active</TabsTrigger>
            <TabsTrigger value="complete" className="rounded-lg text-xs">Complete</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* My Chains shortcut */}
        <div className="flex gap-2">
          <Link href="/chains/mine">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <Link2 className="w-3 h-3" /> My Chains
            </Button>
          </Link>
        </div>

        {/* Chain list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border">
            <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No chains yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Be the first to start a collaborative chain!
            </p>
            <Link href="/chains/new">
              <Button className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Start a Chain
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((chain) => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
