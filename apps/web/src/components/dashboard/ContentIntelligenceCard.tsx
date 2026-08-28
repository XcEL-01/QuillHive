import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Flame, Lightbulb, PenLine, TrendingUp, Zap } from "lucide-react";
import { getStoredToken } from "@/lib/api";

interface ContentType {
  type: string;
  count: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngRate: number;
}

interface Intelligence {
  bestPostingTime: { hour: number; day: string; label: string } | null;
  topContentType: ContentType | null;
  contentTypeBreakdown: ContentType[];
  topPostIntelligence: {
    postId: number;
    title: string | null;
    viralScore: number;
    hookStrength: { score: number; label: string; insight: string };
    whyItWorked: string[];
  } | null;
  whatToPostNext: string;
}

function ViralMeter({ score }: { score: number }) {
  const color =
    score >= 70 ? "#ef4444" :
    score >= 50 ? "#f97316" :
    score >= 30 ? "#eab308" :
    "#6b7280";

  const label =
    score >= 70 ? "Viral" :
    score >= 50 ? "Hot" :
    score >= 30 ? "Growing" :
    "Early";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3.5"
            strokeDasharray={`${score} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs text-muted-foreground">Viral Score</p>
      </div>
    </div>
  );
}

function HookBar({ score, label }: { score: number; label: string }) {
  const color =
    label === "Strong" ? "bg-emerald-500" :
    label === "Good" ? "bg-blue-500" :
    label === "Average" ? "bg-amber-500" :
    "bg-rose-500";

  const textColor =
    label === "Strong" ? "text-emerald-600 dark:text-emerald-400" :
    label === "Good" ? "text-blue-600 dark:text-blue-400" :
    label === "Average" ? "text-amber-600 dark:text-amber-400" :
    "text-rose-600 dark:text-rose-400";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Hook Strength</p>
        <Badge variant="outline" className={`text-[10px] ${textColor}`}>{label}</Badge>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const TYPE_EMOJI: Record<string, string> = {
  text: "📝", poetry: "✒️", art: "🎨", story: "📖", essay: "💡",
  tutorial: "🎓", review: "⭐", opinion: "💬", news: "📰", other: "✨",
};

export function ContentIntelligenceCard() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    fetch("/api/analytics/content-intelligence", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded-lg w-1/2" />
            <div className="h-20 bg-muted animate-pulse rounded-xl" />
            <div className="h-16 bg-muted animate-pulse rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { bestPostingTime, topContentType, contentTypeBreakdown, topPostIntelligence, whatToPostNext } = data;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" /> Performance Insights
          <Badge variant="secondary" className="ml-auto text-[10px] font-medium">AI-powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* What to post next */}
        <div className="flex items-start gap-3 rounded-xl bg-violet-500/8 border border-violet-500/20 p-3.5">
          <Lightbulb className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">What to post next</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{whatToPostNext}</p>
          </div>
        </div>

        {/* Best posting time + Top content type */}
        <div className="grid grid-cols-2 gap-3">
          {bestPostingTime && (
            <div className="rounded-xl bg-muted/30 border border-border/60 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Best Time</p>
              </div>
              <p className="text-sm font-bold text-foreground">{bestPostingTime.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">based on your engagement history</p>
            </div>
          )}
          {topContentType && (
            <div className="rounded-xl bg-muted/30 border border-border/60 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top Format</p>
              </div>
              <p className="text-sm font-bold text-foreground capitalize">
                {TYPE_EMOJI[topContentType.type] ?? "✨"} {topContentType.type}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{topContentType.avgEngRate}% avg engagement</p>
            </div>
          )}
        </div>

        {/* Content type breakdown */}
        {contentTypeBreakdown.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Format performance
            </p>
            <div className="space-y-2">
              {contentTypeBreakdown.slice(0, 4).map((ct, i) => {
                const maxEng = contentTypeBreakdown[0].avgEngRate || 1;
                const pct = Math.round((ct.avgEngRate / maxEng) * 100);
                return (
                  <div key={ct.type} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <span className="text-xs font-medium capitalize w-16 truncate">
                      {TYPE_EMOJI[ct.type] ?? "✨"} {ct.type}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">
                      {ct.avgEngRate}% eng
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top post intelligence */}
        {topPostIntelligence && (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" /> Top Post Analysis
                </p>
                <p className="text-sm font-semibold text-foreground line-clamp-2">
                  {topPostIntelligence.title ?? "Untitled"}
                </p>
              </div>
              <ViralMeter score={topPostIntelligence.viralScore} />
            </div>

            <HookBar score={topPostIntelligence.hookStrength.score} label={topPostIntelligence.hookStrength.label} />
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "{topPostIntelligence.hookStrength.insight}"
            </p>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5 text-primary" /> Why it performed well
              </p>
              <ul className="space-y-1">
                {topPostIntelligence.whyItWorked.map((reason, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
