import { Link } from "wouter";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/store/auth";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">
              QuillHive
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/" className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Go to QuillHive
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/login?mode=register" className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
