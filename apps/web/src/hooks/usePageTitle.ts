import { useEffect } from "react";

const SITE = "QuillHive";
const DEFAULT_TITLE = "QuillHive — Grow, Get Discovered, Find Opportunities";

export function usePageTitle(title?: string, unread?: number) {
  useEffect(() => {
    const base = title ? `${title} — ${SITE}` : DEFAULT_TITLE;
    document.title = unread && unread > 0 ? `(${unread}) ${base}` : base;
    return () => {
      document.title = SITE;
    };
  }, [title, unread]);
}
