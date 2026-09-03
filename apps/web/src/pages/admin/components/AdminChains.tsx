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
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5">
    <div className="flex items-center justify-between mb-4"><div><h2 className="font-semibold">Chains</h2><p className="text-sm text-zinc-500">Public chains and participation activity.</p></div><button onClick={() => void load()} title="Refresh" className="p-2 rounded-lg hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button></div>
    {loading ? <p className="text-sm text-zinc-500">Loading...</p> : chains.length === 0 ? <p className="text-sm text-zinc-500">No public chains.</p> : <div className="space-y-2">{chains.map((chain) => <div key={chain.id} className="flex items-center justify-between border-b border-white/5 py-3 text-sm"><div><p className="font-medium">{chain.title}</p><p className="text-xs text-zinc-500">{chain.creatorName ?? chain.creatorUsername ?? "Unknown creator"} · {chain.entryCount ?? 0}/{chain.maxEntries ?? "-"} entries</p></div><span className="text-xs text-zinc-400">{chain.isComplete ? "Complete" : "Active"}</span></div>)}</div>}
  </section>;
}