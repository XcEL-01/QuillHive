import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";
import { Link } from "wouter";

export default function AdminRevenue({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const data = await fetchAdmin("/api/boost/admin"); setBoosts(Array.isArray(data?.requests) ? data.requests : []); }
    catch (err) { toast({ title: "Could not load boost requests", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [fetchAdmin]);
  const act = async (id: number, action: "approve" | "reject" | "revoke") => {
    try { await fetchAdmin(`/api/boost/${id}/${action}`, { method: "POST", body: JSON.stringify({}) }); await load(); }
    catch (err) { toast({ title: `Could not ${action} boost`, description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
  };
  return <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold">Boost requests</h2><button onClick={() => void load()} title="Refresh" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></div>
    {loading ? <p className="p-8 text-sm text-muted-foreground">Loading requests...</p> : boosts.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No boost requests.</p> : <div className="divide-y divide-border/60">{boosts.map((b) => <div key={b.id} className="px-5 py-4 text-sm">
      <div className="flex items-start justify-between gap-3"><Link href={b.postId ? `/post/${b.postId}` : b.authorUsername ? `/profile/${b.authorUsername}` : "/admin"} className="min-w-0 hover:underline"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">#{b.id} · {b.plan}</p><Badge variant={b.status === "pending" ? "secondary" : "outline"} className="text-[10px] capitalize">{b.status}</Badge></div><p className="mt-1 truncate text-muted-foreground">{b.postTitle ?? "Post unavailable"} · {b.authorDisplayName ?? b.authorUsername ?? "Creator unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{b.paidAmountCents != null ? `$${(b.paidAmountCents / 100).toFixed(2)} paid` : "Payment pending"} · {new Date(b.createdAt).toLocaleDateString()}</p></Link>
      {b.status === "pending" && <div className="flex gap-1"><button onClick={() => void act(b.id, "approve")} title="Approve" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"><Check className="h-4 w-4" /></button><button onClick={() => void act(b.id, "reject")} title="Reject" className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></button></div>}
      {b.status === "approved" && <button onClick={() => void act(b.id, "revoke")} className="text-xs text-destructive hover:underline">Revoke</button>}</div>
    </div>)}</div>}
  </section>;
}