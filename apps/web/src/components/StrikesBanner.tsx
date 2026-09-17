import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/lib/i18n";

interface Strike {
  id: number;
  reason: string;
  severity: number;
  createdAt: string;
  acknowledgedAt: string | null;
}

export function StrikesBanner() {
  const t = useT();
  const { token } = useAuthStore();
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/strikes/me/unacknowledged", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { strikes: Strike[] };
      setStrikes(Array.isArray(data?.strikes) ? data.strikes : []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const acknowledge = useCallback(async (id: number) => {
    if (!token) return;
    setLoading(true);
    try {
      await fetch(`/api/strikes/${id}/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setStrikes((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (strikes.length === 0) return null;
  const top = strikes[0];

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-300 dark:border-amber-800/60" data-testid="banner-strikes">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {strikes.length > 1
              ? t("strikes.bannerMultiple", `You have ${strikes.length} active strikes`)
              : t("strikes.bannerSingle")}
          </p>
          <p className="text-amber-800 dark:text-amber-300/90 mt-0.5 line-clamp-2">{top.reason}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void acknowledge(top.id)}
          disabled={loading}
          className="shrink-0"
          data-testid="button-acknowledge-strike"
        >
          <X className="w-3.5 h-3.5 mr-1" /> {t("strikes.acknowledge")}
        </Button>
      </div>
    </div>
  );
}
