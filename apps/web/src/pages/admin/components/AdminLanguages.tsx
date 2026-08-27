import { useEffect, useState } from "react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminLanguages({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [languages, setLanguages] = useState<any[]>([]);
  useEffect(() => { void fetchAdmin("/api/languages").then((d) => setLanguages(d.languages ?? d)).catch((err) => toast({ title: "Could not load languages", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5"><h2 className="font-semibold mb-4">Languages</h2><div className="grid sm:grid-cols-2 gap-3">{languages.map((language) => <div key={language.code ?? language.id} className="p-3 rounded-lg bg-white/5">{language.name ?? language.code}</div>)}</div></section>;
}