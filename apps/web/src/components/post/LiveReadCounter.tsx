import React from "react";
import { Eye } from "lucide-react";
import { useLivePostViewers } from "@/hooks/useLivePostViewers";

interface LiveReadCounterProps {
  postId: number;
  initialViews?: number;
}

export function LiveReadCounter({ postId, initialViews }: LiveReadCounterProps): React.ReactElement | null {
  const live = useLivePostViewers(postId);
  const value = live ?? initialViews ?? null;
  if (value === null) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      title="Live view count"
      data-testid="live-read-counter"
    >
      <Eye className="w-3 h-3" /> {value.toLocaleString()}
    </span>
  );
}
