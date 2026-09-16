import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AdminContent({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { void Promise.all([fetchAdmin("/api/admin/posts?limit=100"), fetchAdmin("/api/admin/reports?limit=100")]).then(([p, r]) => { setPosts(p.posts ?? p); setReports(r.reports ?? r); }).catch((err) => toast({ title: "Could not load content", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  const needle = search.toLowerCase();
  return <div className="space-y-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter posts and reports" className="pl-9" /></div><div className="grid gap-6 lg:grid-cols-2"><List title={`Posts (${posts.length})`} rows={posts.filter((p) => `${p.title} ${p.authorDisplayName}`.toLowerCase().includes(needle))} label={(p) => p.title || "(untitled)"} /><List title={`Reports (${reports.length})`} rows={reports.filter((r) => `${r.reason} ${r.status}`.toLowerCase().includes(needle))} label={(r) => r.reason || r.category || "Reported item"} /></div></div>;
}
function List({ title, rows, label }: { title: string; rows: any[]; label: (row: any) => string }) {
  return <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"><div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold">{title}</h2></div><div className="divide-y divide-border/60">{rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nothing needs attention here.</p> : rows.slice(0, 8).map((row) => <div key={row.id} className="flex items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{label(row)}</p><p className="truncate text-xs text-muted-foreground">{row.authorDisplayName || row.category || "Awaiting review"}</p></div><Badge variant={row.status === "pending" ? "secondary" : "outline"} className="text-[10px] capitalize">{row.status || "published"}</Badge></div>)}</div></section>;
}