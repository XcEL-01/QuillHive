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
  return <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"><div className="space-y-4">{Object.entries(settings).map(([key, value]) => <label key={key} className="block text-sm"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{key}</span><Input value={value} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} /></label>)}</div><Button className="mt-6" onClick={save}>Save settings</Button></section>;
}