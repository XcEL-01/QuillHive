import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminTrust({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [data, setData] = useState<any>(null);
  useEffect(() => { void fetchAdmin("/api/admin/insights").then(setData).catch((err) => toast({ title: "Could not load trust data", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"><h2 className="text-sm font-semibold">Trust intelligence</h2><pre className="mt-4 max-h-[32rem] overflow-auto rounded-lg bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">{data ? JSON.stringify(data, null, 2) : "Loading..."}</pre></section>;
}