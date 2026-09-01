import { useEffect, useState } from 'react';
import { getStoredToken } from '@/lib/api';
import { CheckCircle2, Circle, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'wouter';

type Factor = {
  label: string;
  done: boolean;
  impact: 'high' | 'medium' | 'low';
};

type ReadinessData = {
  score: number;
  label: string;
  factors: Factor[];
  tips: string[];
};

const IMPACT_CONFIG = {
  high: { color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'High impact' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Medium impact' },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Low impact' },
};

function ScoreArc({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="5" stroke="currentColor"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className={`${color} transition-all duration-700`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}

export function OpportunitySignals() {
  const [data, setData] = useState<ReadinessData | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    fetch('/api/analytics/opportunity-readiness', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const factors = Array.isArray(data.factors) ? data.factors : [];
  const tips = Array.isArray(data.tips) ? data.tips : [];
  const done = factors.filter(f => f.done);
  const todo = factors.filter(f => !f.done);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreArc score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-foreground">Opportunity Readiness</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{data.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {done.length}/{factors.length} signals active
          </p>
        </div>
      </div>

      {todo.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unlock these signals</p>
          {todo.slice(0, 4).map((factor, i) => {
            const cfg = IMPACT_CONFIG[factor.impact];
            return (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl">
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-foreground flex-1">{factor.label}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active signals</p>
          {done.map((factor, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-muted-foreground">{factor.label}</span>
            </div>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="border-t border-border/40 pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Growth tips
          </p>
          {tips.slice(0, 2).map((tip, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-snug pl-1 border-l-2 border-primary/30">
              {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
