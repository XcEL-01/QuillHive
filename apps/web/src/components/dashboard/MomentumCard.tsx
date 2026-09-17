import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, Eye, Users, PenLine, Trophy, Heart } from "lucide-react";
import { Link } from "wouter";
import { useT } from "@/lib/i18n";

interface WeeklyReport {
  newFollowers?: number;
  totalViews?: number;
  postsPublished?: number;
  topPost?: { id: number; title: string; views?: number; likes?: number } | null;
  engagementRate?: number;
  prevWeekViews?: number;
  totalLikes?: number;
  totalComments?: number;
  recommendations?: string[];
}

type MomentumStatus = "viral" | "rising" | "consistent" | "cooling" | "dormant";

function getMomentumStatus(report: WeeklyReport): { status: MomentumStatus; label: string; desc: string } {
  const views = report.totalViews ?? 0;
  const prevViews = report.prevWeekViews ?? 0;
  const followers = report.newFollowers ?? 0;
  const posts = report.postsPublished ?? 0;

  if (views > prevViews * 2 && views > 50) return { status: "viral", label: "Viral Momentum 🚀", desc: "Your content is spreading fast - capitalize on this!" };
  if (followers >= 5 || (views > prevViews * 1.15 && posts >= 2)) return { status: "rising", label: "Rising Fast ⚡", desc: "Strong upward trend - keep the momentum going." };
  if (posts >= 2 && followers >= 1) return { status: "consistent", label: "Consistent Growth 📈", desc: "Steady and reliable - the foundation of creator success." };
  if (posts >= 1 && views < prevViews * 0.8 && prevViews > 0) return { status: "cooling", label: "Audience Cooling ❄️", desc: "Engagement dipped - try a new format or topic this week." };
  if (posts === 0) return { status: "dormant", label: "Not Active 💤", desc: "Your audience misses you - even one post can reignite growth." };
  return { status: "consistent", label: "Steady Creator 🙂", desc: "You're showing up - keep building your audience." };
}

const STATUS_STYLES: Record<MomentumStatus, { card: string; badge: string }> = {
  viral:      { card: "from-rose-500/15 to-orange-500/5", badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-400/30" },
  rising:     { card: "from-emerald-500/15 to-teal-500/5", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-400/30" },
  consistent: { card: "from-blue-500/10 to-indigo-500/5", badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-400/30" },
  cooling:    { card: "from-amber-500/10 to-yellow-500/5", badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-400/30" },
  dormant:    { card: "from-slate-500/10 to-gray-500/5", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300/50" },
};

interface Props {
  report: WeeklyReport;
}

export function MomentumCard({ report }: Props) {
  const t = useT();
  const momentum = getMomentumStatus(report);
  const styles = STATUS_STYLES[momentum.status];
  const views = report.totalViews ?? 0;
  const prevViews = report.prevWeekViews ?? 0;
  const viewsDelta = prevViews > 0 ? ((views - prevViews) / prevViews * 100).toFixed(0) : null;

  return (
    <Card className={`rounded-2xl border-border/60 bg-gradient-to-br ${styles.card} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            {t("dashboard.weeklyMomentum", "Weekly Momentum")}
          </CardTitle>
          <Badge variant="outline" className={`text-[10px] font-semibold border rounded-full ${styles.badge}`}>
            {momentum.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{momentum.desc}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-background/60 border border-border/40 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">{views.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> {t("dashboard.views", "Views")}
            </p>
            {viewsDelta && (
              <p className={`text-[10px] font-semibold mt-0.5 flex items-center justify-center gap-0.5 ${Number(viewsDelta) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {Number(viewsDelta) >= 0
                  ? <TrendingUp className="w-2.5 h-2.5" />
                  : <TrendingDown className="w-2.5 h-2.5" />
                }
                {Number(viewsDelta) >= 0 ? "+" : ""}{viewsDelta}%
              </p>
            )}
          </div>
          <div className="rounded-xl bg-background/60 border border-border/40 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">{report.newFollowers ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> {t("dashboard.newFollowers", "New Followers")}
            </p>
            {(report.newFollowers ?? 0) > 0 && (
              <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5 inline" /> growing
              </p>
            )}
          </div>
          <div className="rounded-xl bg-background/60 border border-border/40 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">{report.postsPublished ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <PenLine className="w-3 h-3" /> {t("dashboard.posts", "Posts")}
            </p>
          </div>
        </div>

        {report.topPost && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-background/50">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                {t("dashboard.topPost", "Top Post This Week")}
              </p>
              <Link href={`/post/${report.topPost.id}`}>
                <p className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer">
                  {report.topPost.title || t("dashboard.untitled", "Untitled")}
                </p>
              </Link>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {report.topPost.views ?? 0}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3 h-3" /> {report.topPost.likes ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {(Array.isArray(report.recommendations) ? report.recommendations : []).length > 0 && (
          <div className="rounded-xl bg-background/50 border border-border/40 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {t("dashboard.insights", "Insights")}
            </p>
            <ul className="space-y-1.5">
              {(Array.isArray(report.recommendations) ? report.recommendations : []).slice(0, 2).map((rec, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
