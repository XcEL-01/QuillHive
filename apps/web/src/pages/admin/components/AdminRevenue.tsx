import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminRevenue({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const data = await fetchAdmin("/api/boost/admin"); setBoosts(data.requests ?? []); }
    catch (err) { toast({ title: "Could not load boost requests", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [fetchAdmin]);
  const act = async (id: number, action: "approve" | "reject" | "revoke") => {
    try { await fetchAdmin(`/api/boost/${id}/${action}`, { method: "POST", body: JSON.stringify({}) }); await load(); }
    catch (err) { toast({ title: `Could not ${action} boost`, description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5">
    <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Boost requests</h2><button onClick={() => void load()} title="Refresh" className="p-2 rounded-lg hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button></div>
    {loading ? <p className="text-sm text-zinc-500">Loading...</p> : boosts.length === 0 ? <p className="text-sm text-zinc-500">No boost requests.</p> : <div className="space-y-3">{boosts.map((b) => <div key={b.id} className="border-b border-white/5 pb-3 text-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="font-medium">#{b.id} · {b.plan}</p><p className="text-zinc-400">{b.postTitle ?? "Post unavailable"} · {b.authorDisplayName ?? b.authorUsername ?? "Creator unavailable"}</p><p className="text-xs text-zinc-500">{b.status} · {b.isActive ? "Active" : b.boostEndsAt && new Date(b.boostEndsAt) <= new Date() ? "Expired" : "Inactive"} · {b.paidAmountCents != null ? `$${(b.paidAmountCents / 100).toFixed(2)} paid` : "Payment pending"} · {new Date(b.createdAt).toLocaleDateString()}</p></div>
      {b.status === "pending" && <div className="flex gap-1"><button onClick={() => void act(b.id, "approve")} title="Approve" className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-400/10"><Check className="w-4 h-4" /></button><button onClick={() => void act(b.id, "reject")} title="Reject" className="p-2 rounded-lg text-red-400 hover:bg-red-400/10"><X className="w-4 h-4" /></button></div>}
      {b.status === "approved" && <button onClick={() => void act(b.id, "revoke")} className="text-xs text-red-400 hover:underline">Revoke</button>}</div>
    </div>)}</div>}
  </section>;
}