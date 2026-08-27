import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.requestFailed", "Request failed"));
      setSent(true);
      toast.success(t("auth.resetEmailSent", "If that email exists, a reset link has been sent."));
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
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-6">
            <ArrowLeft className="w-4 h-4" /> {t("auth.backToSignIn", "Back to sign in")}
          </Link>
          <h1 className="text-2xl font-serif font-bold mb-2">{t("auth.forgotTitle", "Forgot password?")}</h1>
          <p className="text-muted-foreground mb-6">{t("auth.forgotSubtitle", "Enter your email and we'll send a reset link.")}</p>
          {sent ? (
            <p className="p-4 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm">
              {t("auth.resetEmailSentDetail", "If an account with that email exists, a reset link has been sent. Please check your inbox.")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t("auth.email", "Email")}</Label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="pl-10 rounded-xl" placeholder="you@example.com" data-testid="input-email" />
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !email} className="w-full rounded-xl" data-testid="button-submit">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth.sendResetLink", "Send reset link")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
