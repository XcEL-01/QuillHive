import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminTrust({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [data, setData] = useState<any>(null);
  useEffect(() => { void fetchAdmin("/api/admin/insights").then(setData).catch((err) => toast({ title: "Could not load trust data", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-4">Trust intelligence</h2><pre className="text-xs text-zinc-400 whitespace-pre-wrap">{data ? JSON.stringify(data, null, 2) : "Loading..."}</pre></section>;
}