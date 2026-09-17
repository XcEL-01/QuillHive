import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChainCard, type ChainSummary } from '@/components/chains/ChainCard';
import { apiRequest } from '@/lib/api';
import { Link2, Plus, Globe } from 'lucide-react';

interface MineChainsResponse {
  created: ChainSummary[];
  participated: ChainSummary[];
}

export default function ChainMine() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/chains/mine'],
    queryFn: () => (apiRequest('GET', '/api/chains/mine') as unknown) as Promise<MineChainsResponse>,
  });

  const created = Array.isArray(data?.created) ? data.created : [];
  const participated = Array.isArray(data?.participated) ? data.participated : [];
  const hasAny = created.length > 0 || participated.length > 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Link2 className="w-6 h-6 text-primary" /> My Chains
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Chains you started or contributed to.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/chains">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                <Globe className="w-3 h-3" /> Discover
              </Button>
            </Link>
            <Link href="/chains/new">
              <Button size="sm" className="rounded-xl gap-1.5 text-xs">
                <Plus className="w-3 h-3" /> New
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : !hasAny ? (
          <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border">
            <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No chains yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Start a chain or add your link to an existing one.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/chains">
                <Button variant="outline" className="rounded-xl">Discover Chains</Button>
              </Link>
              <Link href="/chains/new">
                <Button className="rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> New Chain
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {created.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  Started by me ({created.length})
                </h2>
                <div className="space-y-3">
                  {created.map((chain) => <ChainCard key={chain.id} chain={chain} />)}
                </div>
              </section>
            )}

            {participated.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-violet-500 rounded-full" />
                  Contributed to ({participated.length})
                </h2>
                <div className="space-y-3">
                  {participated.map((chain) => <ChainCard key={chain.id} chain={chain} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
