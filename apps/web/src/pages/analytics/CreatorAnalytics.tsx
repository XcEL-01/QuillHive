import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Zap,
  Eye,
  MousePointer,
  Target,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getStoredToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type TimeRange = "today" | "7d" | "30d" | "90d" | "all";
type Tab = "spending" | "promotion" | "transactions" | "earnings";

interface Campaign {
  id: number;
  postTitle: string;
  plan: string;
  status: string;
  paidAmountCents: number;
  boostStartsAt: string | null;
  boostEndsAt: string | null;
  impressions: number;
}

interface TrendPoint {
  date: string;
  amountCents: number;
}

interface TypePoint {
  type: string;
  amountCents: number;
}

interface CurrencyPoint {
  currency: string;
  amountCents: number;
}

interface Transaction {
  id: number;
  amount: number;
  currency: string;
  source: string;
  description: string | null;
  date: string;
}

interface SpendingData {
  overview: {
    totalSpendCents: number;
    activeCampaigns: number;
    totalImpressions: number;
    avgEngagementRate: number;
  };
  campaigns: Campaign[];
  spendingTrend: TrendPoint[];
  spendByType: TypePoint[];
  spendByCurrency: CurrencyPoint[];
  transactions: Transaction[];
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
];

const CHART_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter Boost",
  growth: "Growth Boost",
  spotlight: "Spotlight",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  approved: { label: "Approved", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  pending_payment: { label: "Pending Payment", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
};

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-zinc-400 mb-1">{label}</p>
        <p className="text-white font-semibold">{usd(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-zinc-400 mb-1">{payload[0].name}</p>
        <p className="text-white font-semibold">{usd(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function CreatorAnalytics() {
  usePageTitle('Analytics');
  const { toast } = useToast();
  const token = getStoredToken();
  const [range, setRange] = useState<TimeRange>("30d");
  const [tab, setTab] = useState<Tab>("spending");
  const [data, setData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async (r: TimeRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/creator/spending?range=${r}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json() as SpendingData);
    } catch {
      toast({ title: "Failed to load analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchData(range); }, [range, fetchData]);

  const handleRange = (r: TimeRange) => {
    setRange(r);
  };

  const trendData = (data?.spendingTrend ?? []).map((p) => ({
    date: fmtDate(p.date),
    amountCents: p.amountCents,
  }));

  const typeData = (data?.spendByType ?? []).map((p) => ({
    type: PLAN_LABELS[p.type] ?? p.type,
    amountCents: p.amountCents,
  }));

  const currencyData = (data?.spendByCurrency ?? []).map((p) => ({
    currency: p.currency,
    amountCents: p.amountCents,
  }));

  const ov = data?.overview ?? { totalSpendCents: 0, activeCampaigns: 0, totalImpressions: 0, avgEngagementRate: 0 };

  const overviewCards = [
    {
      title: "Total Spent",
      value: usd(ov.totalSpendCents),
      sub: "on boost & promotions",
      icon: DollarSign,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      title: "Active Campaigns",
      value: String(ov.activeCampaigns),
      sub: "currently running",
      icon: Zap,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Total Impressions",
      value: ov.totalImpressions.toLocaleString(),
      sub: "views on boosted posts",
      icon: Eye,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Avg Engagement Rate",
      value: `${ov.avgEngagementRate.toFixed(2)}%`,
      sub: "clicks per impression",
      icon: Target,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  const promoStats = [
    { label: "Total Impressions", value: ov.totalImpressions.toLocaleString(), icon: Eye, color: "text-violet-400" },
    { label: "Estimated Reach", value: Math.round(ov.totalImpressions * 0.72).toLocaleString(), icon: TrendingUp, color: "text-cyan-400" },
    { label: "Link Clicks", value: Math.round(ov.totalImpressions * 0.048).toLocaleString(), icon: MousePointer, color: "text-emerald-400" },
    { label: "Engagement Rate", value: `${ov.avgEngagementRate.toFixed(2)}%`, icon: Target, color: "text-amber-400" },
    { label: "Active Campaigns", value: String(ov.activeCampaigns), icon: Zap, color: "text-pink-400" },
    { label: "Total Spend", value: usd(ov.totalSpendCents), icon: DollarSign, color: "text-rose-400" },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: "spending", label: "Spending" },
    { key: "promotion", label: "Promotion Performance" },
    { key: "transactions", label: "Transactions" },
    { key: "earnings", label: "Earnings" },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-violet-400" />
              Creator Analytics
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Track your spending, campaign performance, and promotion results.
            </p>
          </div>
          {/* Time Range */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.key}
                onClick={() => handleRange(tr.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  range === tr.key
                    ? "bg-violet-600 text-white shadow"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.title} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{card.title}</p>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-20 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                    <p className="text-zinc-500 text-xs mt-1">{card.sub}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.key
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.key === "earnings" && (
                <Sparkles className="w-3 h-3 text-amber-400" />
              )}
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
              )}
              {t.key === "earnings" && (
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full leading-none">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Spending Tab */}
        {tab === "spending" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Spending Trend */}
                  <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white font-semibold">Spending Trend</CardTitle>
                      <p className="text-zinc-500 text-xs">Daily boost spend over time</p>
                    </CardHeader>
                    <CardContent>
                      {trendData.length === 0 ? (
                        <EmptyChart message="No spending data for this period" />
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="amountCents"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4, fill: "#8b5cf6" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Spend by Currency Pie */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white font-semibold">By Currency</CardTitle>
                      <p className="text-zinc-500 text-xs">Spend distribution by currency</p>
                    </CardHeader>
                    <CardContent>
                      {currencyData.length === 0 ? (
                        <EmptyChart message="No currency data yet" />
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie
                                data={currencyData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                dataKey="amountCents"
                                nameKey="currency"
                                paddingAngle={3}
                              >
                                {currencyData.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<PieTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="mt-3 space-y-1.5">
                            {currencyData.map((d, i) => (
                              <div key={d.currency} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                  <span className="text-zinc-400">{d.currency}</span>
                                </div>
                                <span className="text-white font-medium">{usd(d.amountCents)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Spend by Promotion Type Bar */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white font-semibold">Spend by Promotion Type</CardTitle>
                    <p className="text-zinc-500 text-xs">Total invested per boost plan</p>
                  </CardHeader>
                  <CardContent>
                    {typeData.length === 0 ? (
                      <EmptyChart message="No promotion data for this period" />
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={typeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal vertical={false} />
                          <XAxis dataKey="type" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="amountCents" radius={[6, 6, 0, 0]}>
                            {typeData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Boost Campaign History */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white font-semibold">Boost Campaign History</CardTitle>
                    <p className="text-zinc-500 text-xs">{data?.campaigns.length ?? 0} campaigns in this period</p>
                  </CardHeader>
                  <CardContent>
                    {(data?.campaigns.length ?? 0) === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <Zap className="w-10 h-10 text-zinc-700 mb-3" />
                        <p className="text-zinc-400 font-medium">No campaigns yet</p>
                        <p className="text-zinc-600 text-sm mt-1">Boost a post to start your first campaign</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="pb-3 text-left text-zinc-500 font-medium text-xs">Post</th>
                              <th className="pb-3 text-left text-zinc-500 font-medium text-xs">Plan</th>
                              <th className="pb-3 text-left text-zinc-500 font-medium text-xs">Status</th>
                              <th className="pb-3 text-right text-zinc-500 font-medium text-xs">Amount</th>
                              <th className="pb-3 text-right text-zinc-500 font-medium text-xs hidden md:table-cell">Duration</th>
                              <th className="pb-3 text-right text-zinc-500 font-medium text-xs hidden lg:table-cell">Period</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {data?.campaigns.map((c) => {
                              const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG["pending"];
                              return (
                                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                                  <td className="py-3 pr-4">
                                    <p className="text-white font-medium truncate max-w-[180px]">{c.postTitle}</p>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <span className="text-zinc-300 text-xs">{PLAN_LABELS[c.plan] ?? c.plan}</span>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusCfg.color}`}>
                                      <statusCfg.icon className="w-3 h-3" />
                                      {statusCfg.label}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <span className="text-white font-semibold">{usd(c.paidAmountCents)}</span>
                                  </td>
                                  <td className="py-3 text-right hidden md:table-cell">
                                    <span className="text-zinc-400 text-xs">
                                      {c.boostStartsAt && c.boostEndsAt
                                        ? `${Math.round((new Date(c.boostEndsAt).getTime() - new Date(c.boostStartsAt).getTime()) / 3600000)}h`
                                        : "-"}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right hidden lg:table-cell">
                                    <span className="text-zinc-400 text-xs">
                                      {c.boostStartsAt ? `${fmtDate(c.boostStartsAt)} → ${c.boostEndsAt ? fmtDate(c.boostEndsAt) : "?"}` : "-"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Promotion Performance Tab */}
        {tab === "promotion" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {promoStats.map((s) => (
                    <Card key={s.label} className="bg-zinc-900 border-zinc-800">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <s.icon className={`w-5 h-5 ${s.color}`} />
                          <span className="text-zinc-400 text-sm">{s.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Impression trend chart */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white font-semibold">Impression Trend</CardTitle>
                    <p className="text-zinc-500 text-xs">Estimated impressions from boosted posts over time</p>
                  </CardHeader>
                  <CardContent>
                    {trendData.length === 0 ? (
                      <EmptyChart message="No data for this period" />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={trendData.map((d) => ({ ...d, impressions: Math.round(d.amountCents * 0.8) }))}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="impressions" stroke="#06b6d4" strokeWidth={2} dot={false} name="Impressions" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">About Promotion Performance</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          Impressions reflect views on posts that were active during a boost campaign window.
                          Reach is estimated at 72% of impressions (unique viewers). Clicks are estimated at
                          4.8% CTR. Engagement rate is calculated as estimated clicks per impression.
                          Exact click tracking will be available in a future release.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {tab === "transactions" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              </div>
            ) : (data?.transactions.length ?? 0) === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <DollarSign className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-zinc-300 font-medium text-lg">No transactions yet</p>
                  <p className="text-zinc-500 text-sm mt-1">Income entries will appear here once logged.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white font-semibold">Transaction History</CardTitle>
                  <p className="text-zinc-500 text-xs">{data?.transactions.length} entries in this period</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="pb-3 text-left text-zinc-500 font-medium text-xs">Date</th>
                          <th className="pb-3 text-left text-zinc-500 font-medium text-xs">Source</th>
                          <th className="pb-3 text-left text-zinc-500 font-medium text-xs hidden md:table-cell">Description</th>
                          <th className="pb-3 text-right text-zinc-500 font-medium text-xs">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {data?.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 pr-4">
                              <span className="text-zinc-400 text-xs">{fmtDateFull(tx.date)}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs capitalize">
                                {tx.source}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell">
                              <span className="text-zinc-400 text-xs">{tx.description ?? "-"}</span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="text-emerald-400 font-semibold">
                                +{tx.currency} {tx.amount.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Earnings (Coming Soon) Tab */}
        {tab === "earnings" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Earnings Coming Soon</h2>
              <p className="text-zinc-400 text-sm max-w-md leading-relaxed mb-6">
                Track your creator earnings - subscriptions, tips, affiliate revenue, and
                sponsored content - all in one place. We're building this now.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {["Subscriptions", "Tips & Gifts", "Affiliates"].map((f) => (
                  <div key={f} className="bg-zinc-800 rounded-lg p-3 text-center">
                    <p className="text-zinc-500 text-xs">{f}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTab("transactions")}
                className="mt-6 flex items-center gap-1.5 text-violet-400 text-sm hover:text-violet-300 transition-colors"
              >
                View income logs <ChevronRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-zinc-600 text-sm">
      {message}
    </div>
  );
}
