import { useEffect, useMemo, useState } from 'react';
import { List } from 'lucide-react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
}

/** Parse h1/h2/h3 from raw HTML and assign stable ids. Returns mutated html + headings. */
export function buildToc(html: string): { html: string; headings: Heading[] } {
  if (!html) return { html: '', headings: [] };
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(/<(h[1-3])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_m, tag: string, attrs: string | undefined, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return _m;
    let id = slugify(text);
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count}`;
    seen.set(slugify(text), count + 1);
    headings.push({ id, text, level: Number(tag.charAt(1)) });
    const cleanedAttrs = (attrs || '').replace(/\sid="[^"]*"/i, '');
    return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, headings };
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);

  const ids = useMemo(() => headings.map((h) => h.id), [headings]);

  useEffect(() => {
    if (ids.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: [0, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ids]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="hidden xl:block sticky top-24 self-start max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-3">
        <List className="w-3.5 h-3.5" />
        <span>Chapters</span>
      </div>
      <ul className="space-y-1.5 text-sm border-l border-border pl-4">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 10}px` }}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${h.id}`);
              }}
              className={`block transition-colors hover:text-foreground ${
                active === h.id ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
