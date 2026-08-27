import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminRevenue({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [boosts, setBoosts] = useState<any[]>([]);
  useEffect(() => { void fetchAdmin("/api/admin/boosts").then((d) => setBoosts(d.boosts ?? d)).catch((err) => toast({ title: "Could not load boost requests", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-4">Boost requests</h2><div className="space-y-2">{boosts.map((b) => <div key={b.id} className="flex justify-between py-2 border-b border-white/5 text-sm"><span>#{b.id} · {b.status}</span><span>{b.amount ?? b.paidAmountCents ?? 0}</span></div>)}</div></section>;
}