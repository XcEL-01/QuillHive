import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "qh_cookie_consent_v1";

type ConsentState = "accepted" | "essential" | null;

export function CookieConsent() {
  const [state, setState] = useState<ConsentState>(null);
  const [mounted, setMounted] = useState(false);
  const t = useT();

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted" || stored === "essential") {
        setState(stored);
      }
    } catch {
      /* localStorage may be blocked */
    }
  }, []);

  const persist = (value: Exclude<ConsentState, null>) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(`${STORAGE_KEY}_at`, new Date().toISOString());
    } catch {
      /* ignore storage failure */
    }
    setState(value);
  };

  if (!mounted || state !== null) return null;

  return (
    <div
      role="region"
      aria-label={t("cookie.ariaLabel", "Cookie consent")}
      className="fixed bottom-4 left-1/2 z-[60] w-full max-w-[720px] -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur"
      data-testid="cookie-consent"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-medium text-foreground">{t("cookie.title", "We respect your privacy")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("cookie.body1", "We use essential cookies to keep you signed in and remember your preferences.")}
            {" "}
            {t("cookie.body2", "We don't use cookies for advertising or sell your data.")}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("cookie.privacyPolicy", "Read our Privacy Policy")}
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => persist("accepted")}
              data-testid="cookie-accept"
            >
              {t("cookie.acceptAll", "Accept all")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => persist("essential")}
              data-testid="cookie-essential-only"
            >
              {t("cookie.essentialOnly", "Essential only")}
            </Button>
            <Link
              href="/privacy"
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {t("cookie.managePreferences", "Manage preferences")}
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("cookie.dismiss", "Dismiss")}
          className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-muted"
          onClick={() => persist("essential")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
