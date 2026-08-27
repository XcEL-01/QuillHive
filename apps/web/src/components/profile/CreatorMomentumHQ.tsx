import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getStoredToken } from '@/lib/api';
import {
  Trophy, Zap, Eye, TrendingUp, Star, Award, Target, Flame
} from 'lucide-react';

interface MomentumData {
  uti: number;
  tier: string;
  creatorLevel: string;
  inviteTokens: number;
  portfolioViews30d: number;
  recruiterViews30d: number;
  highKarmaArticles: number;
  streak: number;
}

interface Level {
  value: string;
  label: string;
  subtitle: string;
  minUti: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const LEVELS: Level[] = [
  {
    value: 'new_voice', label: 'Level 1', subtitle: 'Aspiring Creator',
    minUti: 0,   icon: <Zap className="w-4 h-4" />,     color: 'text-slate-500',  bgColor: 'bg-slate-500/15',
  },
  {
    value: 'rising',    label: 'Level 2', subtitle: 'Proven Writer',
    minUti: 35,  icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-500',   bgColor: 'bg-blue-500/15',
  },
  {
    value: 'established', label: 'Level 3', subtitle: 'Certified Operator',
    minUti: 55,  icon: <Target className="w-4 h-4" />,   color: 'text-violet-500', bgColor: 'bg-violet-500/15',
  },
  {
    value: 'featured',  label: 'Level 4', subtitle: 'Featured Voice',
    minUti: 70,  icon: <Star className="w-4 h-4" />,     color: 'text-amber-500',  bgColor: 'bg-amber-500/15',
  },
  {
    value: 'luminary',  label: 'Level 5', subtitle: 'Luminary',
    minUti: 85,  icon: <Trophy className="w-4 h-4" />,   color: 'text-rose-500',   bgColor: 'bg-rose-500/15',
  },
];

function getLevelIdx(creatorLevel: string) {
  return Math.max(0, LEVELS.findIndex(l => l.value === creatorLevel));
}

function getNextLevel(idx: number) {
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

function getLevelProgress(uti: number, currentIdx: number) {
  const cur  = LEVELS[currentIdx];
  const next = getNextLevel(currentIdx);
  if (!next) return 100;
  const range = next.minUti - cur.minUti;
  const done  = uti - cur.minUti;
  return Math.min(100, Math.max(0, Math.round((done / range) * 100)));
}

interface CreatorMomentumHQProps {
  userId: number;
  isMe: boolean;
}

export function CreatorMomentumHQ({ userId, isMe }: CreatorMomentumHQProps) {
  const [data, setData] = useState<MomentumData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = getStoredToken();

  useEffect(() => {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch(`/api/trust/${userId}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/streaks/user/${userId}`, { headers }).then(r => r.ok ? r.json() : null),
      isMe ? fetch(`/api/analytics/portfolio-views`, { headers }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([trust, streak, views]) => {
      setData({
        uti:                trust?.uti ?? 0,
        tier:               trust?.tier ?? 'normal',
        creatorLevel:       trust?.creatorLevel ?? 'new_voice',
        inviteTokens:       Math.floor((trust?.cvs ?? 0) / 20),
        portfolioViews30d:  views?.portfolioViews30d ?? 0,
        recruiterViews30d:  views?.recruiterViews30d ?? 0,
        highKarmaArticles:  trust?.highKarmaArticles ?? 0,
        streak:             streak?.currentStreak ?? 0,
      });
    }).catch(() => {
      setData({ uti: 0, tier: 'normal', creatorLevel: 'new_voice', inviteTokens: 0, portfolioViews30d: 0, recruiterViews30d: 0, highKarmaArticles: 0, streak: 0 });
    }).finally(() => setLoading(false));
  }, [userId, isMe]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const levelIdx   = getLevelIdx(data.creatorLevel);
  const currentLvl = LEVELS[levelIdx];
  const nextLvl    = getNextLevel(levelIdx);
  const progress   = getLevelProgress(data.uti, levelIdx);
  const tokensNeeded = Math.max(0, 3 - (data.highKarmaArticles % 3));
  const tokenProgress = Math.min(100, ((3 - tokensNeeded) / 3) * 100);

  return (
    <div className="space-y-6">
      {/* Level Track */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Creator Momentum
          </h3>
          <Badge className={`${currentLvl.bgColor} ${currentLvl.color} border-transparent text-xs font-semibold`}>
            {currentLvl.label} — {currentLvl.subtitle}
          </Badge>
        </div>

        {/* Level segments */}
        <div className="flex gap-1 mb-3">
          {LEVELS.map((lvl, i) => (
            <div
              key={lvl.value}
              className={`h-2 rounded-full flex-1 transition-all ${
                i < levelIdx
                  ? 'bg-primary'
                  : i === levelIdx
                    ? 'bg-primary/60'
                    : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Level labels */}
        <div className="flex gap-1 mb-4">
          {LEVELS.map((lvl, i) => (
            <div key={lvl.value} className={`flex-1 text-center ${i <= levelIdx ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`text-[9px] font-semibold truncate ${i === levelIdx ? currentLvl.color : 'text-muted-foreground'}`}>
                {lvl.subtitle}
              </div>
            </div>
          ))}
        </div>

        {/* Progress to next level */}
        {nextLvl && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to {nextLvl.subtitle}</span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              UTI score: <span className="font-semibold text-foreground">{data.uti}</span> / {nextLvl.minUti} needed for {nextLvl.subtitle}
            </p>
          </div>
        )}
        {!nextLvl && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-semibold">
            <Star className="w-4 h-4 fill-current" /> You've reached the highest level!
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Strategic Invite Token */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invite Tokens</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.inviteTokens}</p>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${tokenProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {tokensNeeded === 0 ? 'New token unlocked!' : `${tokensNeeded} more high-karma article${tokensNeeded !== 1 ? 's' : ''} to unlock`}
            </p>
          </div>
        </div>

        {/* Writing Streak */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Streak</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.streak}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
          <p className="text-[10px] text-muted-foreground">Consistency drives discovery</p>
        </div>

        {/* Portfolio views */}
        {isMe && (
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Portfolio Views</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.portfolioViews30d}</p>
            <p className="text-[10px] text-muted-foreground">Past 30 days</p>
          </div>
        )}

        {/* Recruiter views */}
        {isMe && (
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recruiter Views</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.recruiterViews30d}</p>
            <p className="text-[10px] text-muted-foreground">Companies scoped you</p>
          </div>
        )}

        {/* High-karma articles */}
        <div className={`rounded-xl border border-border bg-card p-4 flex flex-col gap-2 ${isMe ? '' : 'col-span-2'}`}>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">High-Signal Posts</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{data.highKarmaArticles}</p>
          <p className="text-[10px] text-muted-foreground">Curated by verified experts</p>
        </div>
      </div>
    </div>
  );
}
