const WORDS_PER_MINUTE = 220;

export function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html.replace(/<[^>]*>/g, " ");
}

export function readingTimeMinutes(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function readingTimeLabel(html: string): string {
  const m = readingTimeMinutes(html);
  if (!m) return "";
  return `${m} min read`;
}
