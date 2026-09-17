import { useStreak } from '@/hooks/useReadingStreak';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { useMemo } from 'react';

const DAYS = 84;

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function StreakChip() {
  const { data } = useStreak();
  const streak = data?.currentStreak ?? 0;
  if (streak === 0) return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 text-xs font-semibold text-orange-500"
      title={`${streak}-day reading streak`}
      data-testid="streak-chip"
    >
      <Flame className="w-3.5 h-3.5" />
      {streak}
    </div>
  );
}

export function StreakWidget() {
  const { data, isLoading } = useStreak();

  const cells = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(data?.activity) ? data.activity : []).forEach((a) => {
      // readDate is YYYY-MM-DD; normalize
      map.set(a.readDate.slice(0, 10), a.count);
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Array<{ date: Date; count: number }> = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push({ date: d, count: map.get(dateKey(d)) ?? 0 });
    }
    return out;
  }, [data]);

  // Group by week (columns of 7), starting from earliest
  const weeks: Array<Array<{ date: Date; count: number }>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const intensity = (n: number) => {
    if (n <= 0) return 'bg-muted/40';
    if (n === 1) return 'bg-orange-500/30';
    if (n === 2) return 'bg-orange-500/55';
    if (n <= 4) return 'bg-orange-500/80';
    return 'bg-orange-500';
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 animate-pulse h-[180px]" />
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5" data-testid="streak-widget">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Reading activity
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-orange-500 font-semibold">
            <Flame className="w-3.5 h-3.5" /> {data.currentStreak}d
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Trophy className="w-3.5 h-3.5" /> best {data.longestStreak}d
          </span>
          <span className="text-muted-foreground">{data.totalDaysRead} total</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${intensity(cell.count)} hover:ring-1 hover:ring-primary/40 transition`}
                title={`${cell.date.toDateString()} - ${cell.count} read${cell.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted-foreground">
        <span>less</span>
        {[0, 1, 2, 3, 5].map((n) => (
          <div key={n} className={`w-2.5 h-2.5 rounded-sm ${intensity(n)}`} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
