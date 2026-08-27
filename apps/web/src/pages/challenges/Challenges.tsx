import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Clock, Star, PenTool, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

interface Challenge {
  id: number;
  title: string;
  prompt: string;
  description: string | null;
  type: string;
  wordLimit: number | null;
  startsAt: string;
  endsAt: string;
  isFeatured: boolean;
  submissionCount: number;
  creatorName: string | null;
  creatorUsername: string | null;
}

function ChallengeCountdown({ endsAt }: { endsAt: string }) {
  const { days, hours, minutes, expired } = useCountdown(endsAt);
  const isUrgent = !expired && days === 0;

  if (expired) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <CheckCircle className="w-3 h-3" /> Closed
      </span>
    );
  }
  return (
    <span className={cn(
      "flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-xs",
      isUrgent
        ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400"
        : "text-muted-foreground"
    )}>
      <Clock className="w-3 h-3" />
      {days > 0
        ? `${days}d ${hours}h left`
        : hours > 0
          ? `${hours}h ${minutes}m left`
          : `${minutes}m left`}
    </span>
  );
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest('GET', '/api/challenges');
        const json = await res.json();
        if (active) setChallenges(json.challenges || []);
      } catch {
        if (active) toast({ title: 'Failed to load challenges', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleEnter = (challenge: Challenge) => {
    navigate(`/write?challenge=${challenge.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wide font-semibold">Challenges</span>
          </div>
          <h1 className="text-3xl font-serif font-bold">Writing Challenges</h1>
          <p className="text-muted-foreground mt-1">
            Take on a prompt, submit your post, and showcase your craft.
          </p>
        </header>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No active challenges right now.</p>
              <p className="text-sm mt-2">Check back soon for new prompts!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {challenges.map((c) => (
              <Card key={c.id} className="overflow-hidden hover:shadow-md transition-all" data-testid={`challenge-${c.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif font-bold text-lg leading-tight">{c.title}</h2>
                    {c.isFeatured && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0">
                        <Star className="w-3 h-3 mr-1" /> Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <ChallengeCountdown endsAt={c.endsAt} />
                    <span className="mx-1">•</span>
                    {c.submissionCount} {c.submissionCount === 1 ? 'entry' : 'entries'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{c.prompt}</p>
                  {c.wordLimit && (
                    <p className="text-xs text-muted-foreground">
                      Word limit: <span className="font-medium text-foreground">{c.wordLimit}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    {c.creatorUsername ? (
                      <Link
                        href={`/profile/${c.creatorUsername}`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        by {c.creatorName || c.creatorUsername}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <Button size="sm" onClick={() => handleEnter(c)} data-testid={`button-enter-${c.id}`}>
                      <PenTool className="w-4 h-4 mr-1" /> Enter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
