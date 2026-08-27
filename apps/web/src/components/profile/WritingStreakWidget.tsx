import { useEffect, useState } from "react";
import { PenLine, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getStoredToken } from "@/lib/api";

interface WritingStreak {
  currentStreak: number;
  longestStreak: number;
  totalDaysWritten: number;
  lastWriteDate: string | null;
}

interface ActivityRow {
  writeDate: string;
  count: number;
}

interface Props {
  username?: string;
  compact?: boolean;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function WritingStreakWidget({ username, compact }: Props) {
  const [streak, setStreak] = useState<WritingStreak | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    const url = username
      ? `/api/writing-streaks/user/${encodeURIComponent(username)}`
      : "/api/writing-streaks/me";
    const headers: Record<string, string> = {};
    if (token && !username) headers.Authorization = `Bearer ${token}`;
    fetch(url, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { streak: WritingStreak; activity: ActivityRow[] } | null) => {
        if (cancelled || !data) return;
        setStreak(data.streak);
        setActivity(data.activity ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!streak) return null;
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="writing-streak-compact">
        <PenLine className="w-3.5 h-3.5 text-primary" />
        <span>
          <span className="font-semibold text-foreground">{streak.currentStreak}</span> day writing streak
        </span>
      </div>
    );
  }

  const activityMap = new Map(activity.map((a) => [a.writeDate, a.count]));
  const days: { date: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = ymd(d);
    days.push({ date, count: activityMap.get(date) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <Card className="p-4" data-testid="writing-streak-widget">
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Writing streak</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div>
          <div className="text-lg font-bold flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {streak.currentStreak}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</div>
        </div>
        <div>
          <div className="text-lg font-bold">{streak.longestStreak}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Longest</div>
        </div>
        <div>
          <div className="text-lg font-bold">{streak.totalDaysWritten}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-0.5">
        {days.map((d) => {
          const intensity = d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4));
          const bg =
            intensity === 0
              ? "bg-muted"
              : intensity === 1
                ? "bg-primary/30"
                : intensity === 2
                  ? "bg-primary/55"
                  : intensity === 3
                    ? "bg-primary/80"
                    : "bg-primary";
          return (
            <div
              key={d.date}
              className={`aspect-square rounded-sm ${bg}`}
              title={`${d.date}: ${d.count} post${d.count === 1 ? "" : "s"}`}
            />
          );
        })}
      </div>
    </Card>
  );
}
