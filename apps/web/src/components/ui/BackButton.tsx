import { ArrowLeft } from "lucide-react";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  return (
    <button
      onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = fallback)}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );
}
