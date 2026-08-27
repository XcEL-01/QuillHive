import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Zap, Star, Flame, Rocket, Crown, ArrowUpRight, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { getStoredToken } from "@/lib/api";
import { useT } from "@/lib/i18n";

type GrowthTier = "getting_started" | "building_momentum" | "growing_creator" | "accelerating" | "creator_elite";

interface Components {
  trustQuality: number;
  followerGrowth: number;
  consistency: number;
  profileCompletion: number;
  endorsements: number;
  services: number;
}

interface GrowthScoreData {
  score: number;
  tier: GrowthTier;
  tierLabel: string;
  weeklyDelta: number;
  components: Components;
  nextTierScore: number | null;
  nextTierLabel: string | null;
  tips: string[];
}

const TIER_CONFIG: Record<GrowthTier, { gradient: string; ringColor: string; icon: React.ReactNode; badgeClass: string }> = {
  getting_started:    { gradient: "from-gray-500/20 to-slate-500/10",   ringColor: "#94a3b8", icon: <Star className="w-5 h-5" />,   badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300/50" },
  building_momentum:  { gradient: "from-emerald-500/20 to-teal-500/10", ringColor: "#10b981", icon: <Zap className="w-5 h-5" />,    badgeClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300/50" },
  growing_creator:    { gradient: "from-blue-500/20 to-indigo-500/10",  ringColor: "#3b82f6", icon: <TrendingUp className="w-5 h-5" />, badgeClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300/50" },
  accelerating:       { gradient: "from-violet-500/20 to-purple-500/10",ringColor: "#8b5cf6", icon: <Rocket className="w-5 h-5" />, badgeClass: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-300/50" },
  creator_elite:      { gradient: "from-amber-500/20 to-yellow-500/10", ringColor: "#f59e0b", icon: <Crown className="w-5 h-5" />,  badgeClass: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300/50" },
};

const COMPONENT_LABELS: Record<keyof Components, string> = {
  trustQuality:      "Content Quality",
  followerGrowth:    "Follower Growth",
  consistency:       "Posting Consistency",
  profileCompletion: "Profile Completion",
  endorsements:      "Skill Endorsements",
  services:          "Services Active",
};

const COMPONENT_WEIGHTS: Record<keyof Components, number> = {
  trustQuality: 30,
  followerGrowth: 20,
  consistency: 20,
  profileCompletion: 15,
  endorsements: 10,
  services: 5,
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: "stroke-dasharray 0.8s ease-out" }}
      />
      <text x="60" y="56" textAnchor="middle" fill="currentColor" fontSize="26" fontWeight="700" className="fill-foreground">{score}</text>
      <text x="60" y="72" textAnchor="middle" fill="currentColor" fontSize="11" className="fill-muted-foreground">/100</text>
    </svg>
  );
}

export function GrowthScoreCard() {
  const [data, setData] = useState<GrowthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const t = useT();
  const token = getStoredToken();

  useEffect(() => {
    fetch("/api/analytics/growth-score", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-5">
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const cfg = TIER_CONFIG[data.tier];
  const nextProgress = data.nextTierScore
    ? Math.round(((data.score - (data.score < 21 ? 0 : data.score < 41 ? 21 : data.score < 61 ? 41 : 61)) /
       (data.nextTierScore - (data.score < 21 ? 0 : data.score < 41 ? 21 : data.score < 61 ? 41 : 61))) * 100)
    : 100;

  const components = Object.entries(data.components) as [keyof Components, number][];

  return (
    <Card className={`rounded-2xl border-border/60 bg-gradient-to-br ${cfg.gradient} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {cfg.icon}
            {t("dashboard.growthScore", "Creator Growth Score")}
          </CardTitle>
          <Badge variant="outline" className={`text-[10px] font-semibold border rounded-full ${cfg.badgeClass}`}>
            {data.tierLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-5">
          <ScoreRing score={data.score} color={cfg.ringColor} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {data.weeklyDelta > 0 ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" /> +{data.weeklyDelta} {t("dashboard.thisWeek", "this week")}
                </span>
              ) : data.weeklyDelta < 0 ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500">
                  <TrendingDown className="w-4 h-4" /> {data.weeklyDelta} {t("dashboard.thisWeek", "this week")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Minus className="w-4 h-4" /> {t("dashboard.noChange", "No change this week")}
                </span>
              )}
            </div>

            {data.nextTierScore && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("dashboard.nextTier", "Next:")} <strong>{data.nextTierLabel}</strong></span>
                  <span className="text-xs font-semibold" style={{ color: cfg.ringColor }}>{data.nextTierScore - data.score} pts away</span>
                </div>
                <Progress value={nextProgress} className="h-1.5" />
              </div>
            )}

            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {expanded ? "Hide breakdown" : "See breakdown"}
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-2 pt-1 border-t border-border/30">
            {components.map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 shrink-0">{COMPONENT_LABELS[key]}</span>
                <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${val}%`, backgroundColor: cfg.ringColor, opacity: 0.85 }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right tabular-nums" style={{ color: cfg.ringColor }}>{Math.round(val)}</span>
                <span className="text-[10px] text-muted-foreground w-6 text-right">×{COMPONENT_WEIGHTS[key] / 100}</span>
              </div>
            ))}
          </div>
        )}

        {data.tips.length > 0 && (
          <div className="rounded-xl bg-background/60 border border-border/40 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("dashboard.growthTips", "Growth Tips")}
            </p>
            {data.tips.slice(0, 2).map((tip, i) => (
              <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                <Flame className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" /> {tip}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={async () => {
            const text = `My Creator Growth Score on QuillHive: ${data.score}/100 — ${data.tierLabel} tier 🚀`;
            const url = window.location.origin + "/dashboard";
            try {
              if (navigator.share) {
                await navigator.share({ title: "My QuillHive Growth Score", text, url });
              } else {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                toast.success(t("common.copied", "Copied!"));
              }
            } catch { /* user cancelled or clipboard denied */ }
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
            border border-border/50 bg-background/40 hover:bg-muted/50 transition-colors
            text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Share2 className="w-3.5 h-3.5" />
          {t("dashboard.shareScore", "Share my creator score")}
        </button>
      </CardContent>
    </Card>
  );
}
