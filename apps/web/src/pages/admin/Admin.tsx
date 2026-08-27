import { useState, type ReactElement } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Activity, BarChart3, BookOpen, Briefcase, Flag, Gauge, Languages,
  LayoutDashboard, ListTodo, LogOut, Settings, Shield, ToggleRight, Users,
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
  if (!user || !["moderator", "admin", "super_admin"].includes(role ?? "")) {
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
    <div className="min-h-screen bg-[#090909] text-white">
      <aside className="fixed inset-y-0 left-0 z-20 w-64 border-r border-white/5 bg-[#0d0d0d] p-4 hidden md:flex md:flex-col">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 px-3 py-4 text-lg font-bold">
          <BookOpen className="w-5 h-5 text-violet-400" /> QuillHive Admin
        </button>
        <nav className="space-y-1 mt-4 flex-1">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${activeTab === key ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
        <button onClick={() => { logout(); setLocation("/"); }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-white">
          <LogOut className="w-4 h-4" /> Back to app
        </button>
      </aside>
      <main className="md:ml-64 p-4 sm:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">{TABS.find(([key]) => key === activeTab)?.[1]}</h1>
          <p className="text-sm text-zinc-500 mt-1">{currentUser.displayName} · {role}</p>
        </header>
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4">
          {TABS.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${activeTab === key ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-zinc-400"}`}>{label}</button>)}
        </div>
        {panels[activeTab]}
      </main>
    </div>
  );
}