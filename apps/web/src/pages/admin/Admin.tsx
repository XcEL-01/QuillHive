import { useState, type ReactElement } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Activity, ArrowUpRight, BarChart3, BookOpen, Briefcase, ChevronRight, Flag,
  Gauge, Languages, LayoutDashboard, ListTodo, LogOut, Settings, Shield,
  ToggleRight, Users,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { getStoredToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import AdminDashboard from "./components/AdminDashboard";
import AdminUsers from "./components/AdminUsers";
import AdminContent from "./components/AdminContent";
import AdminRevenue from "./components/AdminRevenue";
import AdminTrust from "./components/AdminTrust";
import AdminChains from "./components/AdminChains";
import AdminScheduled from "./components/AdminScheduled";
import AdminFeatureFlags from "./components/AdminFeatureFlags";
import AdminSettings from "./components/AdminSettings";
import AdminMonitoring from "./components/AdminMonitoring";
import AdminLanguages from "./components/AdminLanguages";
import type { AdminProps } from "./components/types";

const TABS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["users", "Users", Users],
  ["content", "Content & Moderation", Flag],
  ["revenue", "Revenue", Briefcase],
  ["trust", "Trust", Shield],
  ["chains", "Chains", ListTodo],
  ["scheduled", "Scheduled Posts", Gauge],
  ["features", "Feature Flags", ToggleRight],
  ["settings", "Settings", Settings],
  ["monitoring", "Monitoring", Activity],
  ["languages", "Languages", Languages],
] as const;

export default function Admin() {
  const { user, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number][0]>("dashboard");
  const role = (user as { role?: string } | null)?.role;
  if (!user || !["admin", "super_admin"].includes(role ?? "")) {
    return <Redirect to="/" />;
  }

  const currentUser = {
    id: Number((user as { id?: number }).id),
    role,
    displayName: (user as { displayName?: string }).displayName,
  };
  const props: AdminProps = { token: getStoredToken(), toast, currentUser };
  const panels: Record<string, ReactElement> = {
    dashboard: <AdminDashboard {...props} />,
    users: <AdminUsers {...props} />,
    content: <AdminContent {...props} />,
    revenue: <AdminRevenue {...props} />,
    trust: <AdminTrust {...props} />,
    chains: <AdminChains {...props} />,
    scheduled: <AdminScheduled {...props} />,
    features: <AdminFeatureFlags {...props} />,
    settings: <AdminSettings {...props} />,
    monitoring: <AdminMonitoring {...props} />,
    languages: <AdminLanguages {...props} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0d12] text-slate-100 selection:bg-cyan-400/30">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-800/80 bg-[#0d1118] md:flex">
        <div className="border-b border-slate-800/80 px-6 py-5">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
              <BookOpen className="h-5 w-5" />
            </span>
            <span><span className="block text-sm font-semibold tracking-wide">QUILLHIVE</span><span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Operations</span></span>
          </button>
        </div>
        <div className="px-4 pt-6">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Control center</p>
          <nav className="space-y-1">
            {TABS.map(([key, label, Icon]) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${activeTab === key ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300" : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"}`}>
                <Icon className="h-4 w-4" /> <span className="flex-1">{label}</span><ChevronRight className={`h-3.5 w-3.5 transition-opacity ${activeTab === key ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-800/80 p-4">
          <div className="mb-3 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400" />All systems operational</div>
            <p className="mt-1 text-[10px] text-slate-500">Live platform status</p>
          </div>
          <button onClick={() => { logout(); setLocation("/"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-500 transition-colors hover:text-slate-100"><LogOut className="h-4 w-4" /> Back to app</button>
        </div>
      </aside>
      <main className="md:ml-72">
        <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-[#0a0d12]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
            <div><div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400"><span>Admin</span><ChevronRight className="h-3 w-3" /><span className="text-slate-500">{TABS.find(([key]) => key === activeTab)?.[1]}</span></div><h1 className="text-2xl font-semibold tracking-tight text-white">{TABS.find(([key]) => key === activeTab)?.[1]}</h1></div>
            <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium text-slate-200">{currentUser.displayName || "Administrator"}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{role?.replace("_", " ")}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-semibold text-cyan-300">{(currentUser.displayName || "A").slice(0, 1).toUpperCase()}</div></div>
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-[#101620] px-4 py-3 text-xs text-slate-400"><span>Platform command center</span><span className="flex items-center gap-1.5 text-slate-500"><Activity className="h-3.5 w-3.5 text-cyan-400" /> Live data <ArrowUpRight className="h-3.5 w-3.5" /></span></div>
          <div className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-1">{TABS.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium ${activeTab === key ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" : "border-slate-800 bg-slate-900 text-slate-400"}`}>{label}</button>)}</div>
          {panels[activeTab]}
        </div>
      </main>
    </div>
  );
}