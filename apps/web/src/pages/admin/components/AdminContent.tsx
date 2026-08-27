import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminContent({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => { void Promise.all([fetchAdmin("/api/admin/posts?limit=100"), fetchAdmin("/api/admin/reports?limit=100")]).then(([p, r]) => { setPosts(p.posts ?? p); setReports(r.reports ?? r); }).catch((err) => toast({ title: "Could not load content", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <div className="grid lg:grid-cols-2 gap-6"><List title={`Posts (${posts.length})`} rows={posts} label={(p) => p.title || "(untitled)"} /><List title={`Reports (${reports.length})`} rows={reports} label={(r) => r.reason || r.category || "Reported item"} /></div>;
}
function List({ title, rows, label }: { title: string; rows: any[]; label: (row: any) => string }) {
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-4">{title}</h2><div className="space-y-2">{rows.map((row) => <div key={row.id} className="py-2 border-b border-white/5 text-sm"><p className="font-medium truncate">{label(row)}</p><p className="text-xs text-zinc-500">{row.status || row.authorDisplayName || ""}</p></div>)}</div></section>;
}