import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, FileText, Flag, Rocket, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

type Stats = Record<string, number>;

export default function AdminDashboard({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetchAdmin("/api/admin/stats").then(setStats).catch((err) => toast({ title: "Could not load dashboard", description: err.message, variant: "destructive" })).finally(() => setLoading(false));
  }, [fetchAdmin, toast]);
  const cards = [
    ["Total users", stats.totalUsers, Users, "Platform reach"],
    ["Total posts", stats.totalPosts, FileText, "Published content"],
    ["Pending reports", stats.pendingReports, Flag, "Needs review"],
    ["Active boosts", stats.activeBoosts, Rocket, "Currently running"],
  ] as const;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, hint]) => <Card key={label} className="border-border/70 shadow-sm">
        <CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-muted" /> : (value ?? 0).toLocaleString()}</p></div><span className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-xs text-muted-foreground">{hint}</p></CardContent>
      </Card>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-border/70 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Platform pulse</CardTitle><p className="mt-1 text-xs text-muted-foreground">Current workload across the console</p></div><Badge variant="outline" className="gap-1 font-normal"><Activity className="h-3 w-3 text-emerald-500" />Live</Badge></CardHeader><CardContent><div className="flex h-36 items-end gap-3 border-b border-border/70 pb-3">{[stats.totalUsers, stats.totalPosts, stats.pendingReports, stats.activeBoosts].map((value, index) => { const height = loading ? 30 + index * 12 : Math.max(12, Math.min(100, Number(value ?? 0) / Math.max(Number(stats.totalUsers ?? 1), 1) * 100)); return <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-16 rounded-t-md bg-primary/70 transition-all" style={{ height: `${height}%` }} /><span className="text-[10px] text-muted-foreground">{["Users", "Posts", "Reports", "Boosts"][index]}</span></div>; })}</div></CardContent></Card>
      <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader><CardContent className="space-y-4">{[["Reports awaiting review", stats.pendingReports, "Moderation queue"], ["Boosts currently active", stats.activeBoosts, "Growth programs"], ["Accounts suspended", stats.bannedUsers, "Trust & safety"]].map(([label, value, detail]) => <div key={label} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div><span className="text-sm font-semibold">{loading ? "--" : Number(value ?? 0).toLocaleString()}</span><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /></div>)}</CardContent></Card>
    </div>
  </div>;
}