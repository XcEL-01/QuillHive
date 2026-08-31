import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useAuthStore } from '@/store/auth';
import { getStoredToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  PenTool, Zap, Users, TrendingUp, MessageCircle, Briefcase,
  Flame, Trophy, Target, Eye, Star, ChevronDown, ChevronUp,
  Film, BarChart3, Hash, Rocket, Sparkles, Crown, Shield,
  UserPlus, Clock
} from 'lucide-react';

interface GrowthData {
  score: number;
  tier: string;
  tierLabel: string;
  weeklyDelta: number;
  nextTierScore: number | null;
  nextTierLabel: string | null;
  tips: string[];
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

interface WeeklyStats {
  totalViews: number;
  followers: number;
  engagementRate: number;
  followerGrowth?: { last30Days?: number; percentage?: number };
}

const TIER_COLORS: Record<string, string> = {
  getting_started: '#94a3b8',
  building_momentum: '#10b981',
  growing_creator: '#3b82f6',
  accelerating: '#8b5cf6',
  creator_elite: '#f59e0b',
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  getting_started: <Star className="w-4 h-4" />,
  building_momentum: <Zap className="w-4 h-4" />,
  growing_creator: <TrendingUp className="w-4 h-4" />,
  accelerating: <Rocket className="w-4 h-4" />,
  creator_elite: <Crown className="w-4 h-4" />,
};

const LEVEL_GRADIENT: Record<string, string> = {
  getting_started: 'from-slate-500/15 to-slate-400/5',
  building_momentum: 'from-emerald-500/15 to-teal-500/5',
  growing_creator: 'from-blue-500/15 to-indigo-500/5',
  accelerating: 'from-violet-500/15 to-purple-500/5',
  creator_elite: 'from-amber-500/20 to-yellow-500/5',
};

const QUICK_ACTIONS = [
  { href: '/write', icon: PenTool, label: 'Write', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25', desc: 'Article' },
  { href: '/motion', icon: Film, label: 'Motion', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 hover:bg-pink-500/25', desc: 'Studio' },
  { href: '/write?type=poll', icon: BarChart3, label: 'Poll', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25', desc: 'Audience' },
  { href: '/write?type=spark', icon: Zap, label: 'Spark', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25', desc: 'Quick' },
  { href: '/explore', icon: UserPlus, label: 'Collaborate', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25', desc: 'Find' },
  { href: '/opportunities', icon: Briefcase, label: 'Opportunities', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25', desc: 'Earn' },
  { href: '/messages', icon: MessageCircle, label: 'Messages', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25', desc: 'Inbox' },
  { href: '/dashboard', icon: TrendingUp, label: 'Dashboard', color: 'bg-primary/15 text-primary hover:bg-primary/25', desc: 'Grow' },
];

export function CreatorGrowthHQ() {
  const { user } = useAuthStore();
  const token = getStoredToken();
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('qh_hq_collapsed') === '1');
  const [opportunity, setOpportunity] = useState<{ score: number; label: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    fetch('/api/analytics/growth-score', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGrowth(d); })
      .catch(() => {});

    fetch('/api/streaks/me', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStreak({ currentStreak: d.currentStreak ?? 0, longestStreak: d.longestStreak ?? 0 }); })
      .catch(() => {});

    fetch('/api/analytics/dashboard', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWeeklyStats(d); })
      .catch(() => {});

    fetch('/api/analytics/opportunity-readiness', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setOpportunity({ score: d.score ?? d.opportunityScore ?? 0, label: d.label ?? d.tier ?? 'Building' });
      })
      .catch(() => {});
  }, [token]);

  if (!user) return null;

  const tierColor = TIER_COLORS[growth?.tier ?? 'getting_started'];
  const tierIcon = TIER_ICONS[growth?.tier ?? 'getting_started'];
  const gradient = LEVEL_GRADIENT[growth?.tier ?? 'getting_started'];
  const score = growth?.score ?? 0;
  const nextScore = growth?.nextTierScore ?? 100;
  const progress = Math.min(Math.round((score / nextScore) * 100), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${gradient} border border-border/60 rounded-2xl overflow-hidden mb-5`}
    >
      {/* Header row - always visible */}
      <button
        onClick={() => {
          setExpanded(v => {
            const next = !v;
            return next;
          });
        }}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${tierColor}25`, color: tierColor }}>
            {tierIcon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {user.displayName || user.username}
              </span>
              {growth && (
                <Badge className="text-[10px] px-2 py-0.5 rounded-full font-semibold border-0"
                  style={{ backgroundColor: `${tierColor}20`, color: tierColor }}>
                  {growth.tierLabel}
                </Badge>
              )}
              {streak && streak.currentStreak > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-orange-500">
                  <Flame className="w-3 h-3" /> {streak.currentStreak}d
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {growth && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-24 bg-border/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, backgroundColor: tierColor }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{score}/100</span>
                </div>
              )}
              {growth?.weeklyDelta !== undefined && growth.weeklyDelta !== 0 && (
                <span className={`text-[10px] font-semibold ${growth.weeklyDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {growth.weeklyDelta > 0 ? '+' : ''}{growth.weeklyDelta} this week
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground">
              Full Dashboard
            </Button>
          </Link>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Views',
                    value: weeklyStats?.totalViews != null ? weeklyStats.totalViews.toLocaleString() : '-',
                    icon: Eye, color: 'text-blue-500'
                  },
                  {
                    label: 'Followers',
                    value: weeklyStats?.followers != null ? weeklyStats.followers.toLocaleString() : '-',
                    icon: Users, color: 'text-emerald-500'
                  },
                  {
                    label: 'Engagement',
                    value: weeklyStats?.engagementRate != null ? `${weeklyStats.engagementRate}%` : '-',
                    icon: Zap, color: 'text-amber-500'
                  },
                ].map(s => (
                  <div key={s.label} className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
                    <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                    <div className="text-base font-bold">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Opportunity + streak bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Opportunity Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{opportunity?.score ?? '-'}</span>
                    {opportunity?.label && (
                      <Badge className="text-[9px] rounded-full border-0 bg-violet-500/15 text-violet-600 dark:text-violet-400">
                        {opportunity.label}
                      </Badge>
                    )}
                  </div>
                  <Progress value={opportunity?.score ?? 0} className="h-1 mt-2" />
                </div>
                <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Creator Streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold">{streak?.currentStreak ?? 0}</span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Best: {streak?.longestStreak ?? 0}d
                  </div>
                </div>
              </div>

              {/* Growth tip */}
              {growth?.tips?.[0] && (
                <div className="flex items-start gap-2 bg-primary/5 rounded-xl p-3 border border-primary/15">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80">{growth.tips[0]}</p>
                </div>
              )}

              {/* Quick Actions grid */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_ACTIONS.map(action => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.href} href={action.href}>
                        <button className={`w-full flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${action.color}`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] font-semibold leading-none">{action.label}</span>
                          <span className="text-[9px] opacity-60 leading-none">{action.desc}</span>
                        </button>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Next tier nudge */}
              {growth?.nextTierLabel && growth.nextTierScore && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    <span className="font-semibold" style={{ color: tierColor }}>{growth.nextTierScore - score} pts</span> to {growth.nextTierLabel}
                  </span>
                  <Link href="/dashboard">
                    <span className="text-primary hover:underline text-[11px]">How to level up →</span>
                  </Link>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
