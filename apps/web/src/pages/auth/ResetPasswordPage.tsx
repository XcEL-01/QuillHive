import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ResetPasswordPage() {
  const t = useT();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error(t("auth.passwordMin", "Password must be at least 8 characters")); return; }
    if (password !== confirm) { toast.error(t("auth.passwordsNoMatch", "Passwords don't match")); return; }
    if (!token) { toast.error(t("auth.missingToken", "Missing reset token")); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.resetFailed", "Reset failed"));
      setDone(true);
      setTimeout(() => setLocation("/login"), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.somethingWrong", "Something went wrong");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Toaster position="top-center" />
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <h1 className="text-2xl font-serif font-bold mb-2">{t("auth.resetTitle", "Reset your password")}</h1>
          {done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <p className="text-foreground">{t("auth.passwordUpdated", "Password updated. Redirecting to sign in...")}</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">{t("auth.resetSubtitle", "Choose a new password for your account.")}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pw">{t("auth.newPassword", "New password")}</Label>
                  <div className="relative mt-1.5">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="pw" type="password" required value={password}
                      onChange={e => setPassword(e.target.value)} minLength={8}
                      className="pl-10 rounded-xl" data-testid="input-password" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cf">{t("auth.confirmPassword", "Confirm password")}</Label>
                  <Input id="cf" type="password" required value={confirm}
                    onChange={e => setConfirm(e.target.value)} minLength={8}
                    className="mt-1.5 rounded-xl" data-testid="input-confirm" />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full rounded-xl" data-testid="button-submit">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth.updatePassword", "Update password")}
                </Button>
                <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-primary">
                  {t("auth.backToSignIn", "Back to sign in")}
                </Link>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
