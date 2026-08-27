import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminScheduled({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const load = () => void fetchAdmin("/api/admin/scheduled-posts").then((d) => setScheduled(d.scheduled ?? [])).catch((err) => toast({ title: "Could not load scheduled posts", description: err.message, variant: "destructive" }));
  useEffect(load, [fetchAdmin]);
  const publish = async (id: number) => { try { await fetchAdmin(`/api/admin/scheduled-posts/${id}/publish`, { method: "PATCH" }); toast({ title: "Post published" }); load(); } catch (err: any) { toast({ title: "Could not publish post", description: err.message, variant: "destructive" }); } };
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-4">Scheduled posts</h2><div className="space-y-2">{scheduled.map((p) => <div key={p.id} className="flex items-center gap-3 py-3 border-b border-white/5"><div className="flex-1"><p className="font-medium">{p.title || "(untitled)"}</p><p className="text-xs text-zinc-500">{p.authorDisplayName} · {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : ""}</p></div><Button size="sm" onClick={() => publish(p.id)}>Publish</Button></div>)}</div></section>;
}