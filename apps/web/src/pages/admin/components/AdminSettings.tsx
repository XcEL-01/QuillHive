import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminSettings({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => { void fetchAdmin("/api/admin/settings").then(setSettings).catch((err) => toast({ title: "Could not load settings", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  const save = async () => { try { await fetchAdmin("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) }); toast({ title: "Settings saved" }); } catch (err: any) { toast({ title: "Could not save settings", description: err.message, variant: "destructive" }); } };
  return <section className="rounded-xl border border-white/5 bg-[#111] p-5 space-y-4">{Object.entries(settings).map(([key, value]) => <label key={key} className="block text-sm"><span className="block text-zinc-400 mb-1">{key}</span><Input value={value} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} /></label>)}<Button onClick={save}>Save settings</Button></section>;
}