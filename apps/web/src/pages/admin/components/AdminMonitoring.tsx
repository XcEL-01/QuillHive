import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminMonitoring({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [health, setHealth] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { void Promise.all([fetchAdmin("/api/admin/monitoring/health"), fetchAdmin("/api/admin/monitoring/events")]).then(([h, e]) => { setHealth(h); setEvents(e.events ?? e ?? []); }).catch((err) => toast({ title: "Could not load monitoring", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <div className="space-y-6"><section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-3">Health</h2><pre className="text-xs text-zinc-400 whitespace-pre-wrap">{health ? JSON.stringify(health, null, 2) : "Loading..."}</pre></section><section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-3">Recent events</h2><pre className="text-xs text-zinc-400 whitespace-pre-wrap">{JSON.stringify(events, null, 2)}</pre></section></div>;
}