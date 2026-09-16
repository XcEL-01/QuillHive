import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminLanguages({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [languages, setLanguages] = useState<any[]>([]);
  useEffect(() => { void fetchAdmin("/api/languages").then((d) => setLanguages(d.languages ?? d)).catch((err) => toast({ title: "Could not load languages", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"><h2 className="text-sm font-semibold">Languages</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{languages.map((language) => <div key={language.code ?? language.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">{language.name ?? language.code}</div>)}</div></section>;
}