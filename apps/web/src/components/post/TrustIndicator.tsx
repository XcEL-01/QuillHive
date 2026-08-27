import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type TrustTier = 'high' | 'medium' | 'low';

const TIER_STYLES: Record<TrustTier, { dot: string; label: string }> = {
  high: { dot: 'bg-emerald-500', label: 'High quality & originality' },
  medium: { dot: 'bg-yellow-500', label: 'Average quality & originality' },
  low: { dot: 'bg-rose-500', label: 'Lower quality or originality' },
};

export function TrustIndicator({ tier }: { tier?: TrustTier | null }) {
  if (!tier) return null;
  const s = TIER_STYLES[tier];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={s.label}
          className="inline-flex items-center"
          data-testid={`trust-indicator-${tier}`}
        >
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Content quality &amp; originality score: {s.label}
      </TooltipContent>
    </Tooltip>
  );
}
