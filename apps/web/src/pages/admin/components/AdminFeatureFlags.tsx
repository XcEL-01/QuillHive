import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

const FLAG_METADATA: Record<string, { label: string; description: string; category: "Core" | "Future" }> = {
  referral_rewards_enabled: {
    label: "Referral Rewards",
    description: "Award trust score bonuses to users based on how many valid people they've referred and those referrals' own trust scores. Off by default - enable when ready.",
    category: "Future",
  },
};

export default function AdminFeatureFlags({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  useEffect(() => { void fetchAdmin("/api/admin/settings/features").then(setFeatures).catch((err) => toast({ title: "Could not load feature flags", description: err.message, variant: "destructive" })); }, [fetchAdmin, toast]);
  const toggle = async (key: string, value: boolean) => { try { await fetchAdmin("/api/admin/settings/features", { method: "PATCH", body: JSON.stringify({ [key]: value }) }); setFeatures((f) => ({ ...f, [key]: value })); } catch (err: any) { toast({ title: "Could not update flag", description: err.message, variant: "destructive" }); } };
  return <section className="rounded-xl border border-white/5 bg-[#111] divide-y divide-white/5">{Object.entries(features).map(([key, value]) => { const metadata = FLAG_METADATA[key]; return <div key={key} className="p-4 flex justify-between items-center gap-4"><div><span className="font-mono text-sm block">{metadata?.label ?? key}</span>{metadata && <><span className="text-xs text-white/50 block mt-1">{metadata.description}</span><span className="text-[10px] uppercase tracking-wider text-white/30 block mt-2">{metadata.category}</span></>}</div><Switch checked={value} onCheckedChange={(v) => toggle(key, v)} /></div>; })}</section>;
}