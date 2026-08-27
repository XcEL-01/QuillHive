export function linkifyHashtags(html: string): string {
  return html.replace(
    /(?<![&\w/])#([a-zA-Z0-9_]{2,50})/g,
    '<a href="/topics/$1" class="text-primary hover:underline font-medium" data-hashtag="$1" onclick="event.stopPropagation()">#$1</a>',
  );
}

export function extractHashtags(text: string): string[] {
  const clean = text.replace(/<[^>]+>/g, ' ');
  const matches = clean.match(/#([a-zA-Z0-9_]{2,50})/g) ?? [];
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))];
}
