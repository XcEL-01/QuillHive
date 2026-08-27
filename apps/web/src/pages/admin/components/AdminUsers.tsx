import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminUsers({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { void fetchAdmin("/api/admin/users?limit=100").then((d) => setUsers(d.users ?? d)).catch((err) => toast({ title: "Could not load users", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  const filtered = users.filter((u) => `${u.displayName} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-4"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="max-w-sm" /><div className="rounded-xl border border-white/5 bg-[#111] divide-y divide-white/5">{filtered.map((u) => <div key={u.id} className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">{u.displayName?.[0]}</div><div className="flex-1"><p className="font-medium">{u.displayName}</p><p className="text-xs text-zinc-500">@{u.username} · {u.email}</p></div><span className="text-xs text-zinc-400">{u.role}</span></div>)}</div></section>;
}