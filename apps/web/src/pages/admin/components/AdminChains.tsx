import type { AdminProps } from "./types";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminChains({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [chains, setChains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const data = await fetchAdmin("/api/chains?limit=50"); setChains(data.chains ?? []); }
    catch (err) { toast({ title: "Could not load chains", description: err instanceof Error ? err.message : "Request failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [fetchAdmin]);
  return <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><h2 className="text-sm font-semibold">Chains</h2><p className="mt-1 text-xs text-muted-foreground">Public chains and participation activity.</p></div><button onClick={() => void load()} title="Refresh" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></div>
    {loading ? <p className="p-8 text-sm text-muted-foreground">Loading chains...</p> : chains.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No public chains.</p> : <div className="divide-y divide-border/60">{chains.map((chain) => <div key={chain.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm"><div className="min-w-0"><p className="truncate font-medium">{chain.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{chain.creatorName ?? chain.creatorUsername ?? "Unknown creator"} · {chain.entryCount ?? 0}/{chain.maxEntries ?? "-"} entries</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">{chain.isComplete ? "Complete" : "Active"}</span></div>)}</div>}
  </section>;
}