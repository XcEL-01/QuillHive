import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminMonitoring({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [health, setHealth] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { void Promise.all([fetchAdmin("/api/admin/monitoring/health"), fetchAdmin("/api/admin/monitoring/events")]).then(([h, e]) => { setHealth(h); setEvents(Array.isArray(e?.events) ? e.events : Array.isArray(e) ? e : []); }).catch((err) => toast({ title: "Could not load monitoring", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"><h2 className="text-sm font-semibold">Health</h2><pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">{health ? JSON.stringify(health, null, 2) : "Loading..."}</pre></section><section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"><h2 className="text-sm font-semibold">Recent events</h2><pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">{JSON.stringify(events, null, 2)}</pre></section></div>;
}