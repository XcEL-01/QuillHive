import { Badge } from '@/components/ui/badge';

const LEVEL_CONFIG: Record<string, { label: string; className: string }> = {
  new_voice:   { label: 'New Voice',   className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600' },
  rising:      { label: 'Rising',      className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' },
  established: { label: 'Established', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' },
  featured:    { label: 'Featured',    className: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-700' },
  luminary:    { label: 'Luminary',    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' },
};

interface Props {
  level: string | null | undefined;
  size?: 'xs' | 'sm';
}

export function CreatorLevelBadge({ level, size = 'xs' }: Props) {
  if (!level || level === 'new_voice') return null;
  const cfg = LEVEL_CONFIG[level];
  if (!cfg) return null;
  return (
    <Badge
      variant="outline"
      className={`rounded-full font-medium border ${cfg.className} ${size === 'xs' ? 'text-[10px] px-2 py-0' : 'text-xs px-2.5 py-0.5'}`}
    >
      {cfg.label}
    </Badge>
  );
}

export function CreatorLevelProgressPanel({ level, uti }: { level: string | null | undefined; uti: number }) {
  const levels = ['new_voice', 'rising', 'established', 'featured', 'luminary'] as const;
  const thresholds: Record<string, number> = { new_voice: 0, rising: 35, established: 55, featured: 70, luminary: 85 };
  const labels: Record<string, string> = { new_voice: 'New Voice', rising: 'Rising', established: 'Established', featured: 'Featured', luminary: 'Luminary' };
  const currentIndex = levels.indexOf((level ?? 'new_voice') as typeof levels[number]);
  const nextLevel = levels[currentIndex + 1] ?? null;
  const nextThreshold = nextLevel ? thresholds[nextLevel] : null;
  const currentThreshold = thresholds[level ?? 'new_voice'] ?? 0;
  const progress = nextThreshold
    ? Math.min(100, Math.round(((uti - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
    : 100;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Creator Progress</span>
        {level && <CreatorLevelBadge level={level} size="sm" />}
      </div>
      <div className="flex items-center gap-1.5">
        {levels.map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-full h-1.5 rounded-full transition-all ${
                i <= currentIndex
                  ? 'bg-primary'
                  : 'bg-muted-foreground/20'
              }`}
            />
            <span className={`text-[9px] font-medium ${i === currentIndex ? 'text-primary' : 'text-muted-foreground/60'}`}>
              {labels[l]}
            </span>
          </div>
        ))}
      </div>
      {nextLevel && nextThreshold && (
        <p className="text-xs text-muted-foreground">
          {progress}% toward <strong>{labels[nextLevel]}</strong> — keep creating and engaging!
        </p>
      )}
      {!nextLevel && (
        <p className="text-xs text-muted-foreground">You've reached the highest creator level!</p>
      )}
    </div>
  );
}
