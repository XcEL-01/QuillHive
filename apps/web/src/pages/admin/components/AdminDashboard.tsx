import { useEffect, useState } from "react";
import { FileText, Flag, ShieldCheck, Users } from "lucide-react";
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
    ["Total Users", stats.totalUsers, Users],
    ["Total Posts", stats.totalPosts, FileText],
    ["Pending Reports", stats.pendingReports, Flag],
    ["Banned Users", stats.bannedUsers, ShieldCheck],
  ] as const;
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-white/5 bg-[#111] p-5">
      <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider"><span>{label}</span><Icon className="w-4 h-4" /></div>
      <p className="text-3xl font-bold mt-3">{loading ? "-" : (value ?? 0).toLocaleString()}</p>
    </div>)}
  </div>;
}