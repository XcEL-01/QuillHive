import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, BookOpen, Eye, Bookmark, Star, FileText,
  Headphones, Video, FolderOpen, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { getInitials } from "@/lib/utils";
import { getStoredToken } from "@/lib/api";

interface LibraryEntryCard {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  contentType: string;
  thumbnailUrl: string | null;
  tags: string[];
  license: string;
  viewCount: number;
  saveCount: number;
  isFeatured: boolean;
  publishedAt: string;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
}

const CATEGORIES = [
  { key: "all", label: "📖 All" },
  { key: "writing_literature", label: "📝 Writing & Literature" },
  { key: "science_research", label: "🔬 Science & Research" },
  { key: "technology_code", label: "💻 Technology & Code" },
  { key: "business_strategy", label: "📊 Business & Strategy" },
  { key: "art_design", label: "🎨 Art & Design" },
  { key: "music_audio", label: "🎵 Music & Audio" },
  { key: "film_motion", label: "🎬 Film & Motion" },
  { key: "philosophy_ideas", label: "💡 Philosophy & Ideas" },
  { key: "history_culture", label: "🏛️ History & Culture" },
  { key: "education_learning", label: "📚 Education & Learning" },
  { key: "health_wellbeing", label: "🌿 Health & Wellbeing" },
  { key: "environment_nature", label: "🌍 Environment & Nature" },
  { key: "law_society", label: "⚖️ Law & Society" },
  { key: "language_communication", label: "🗣️ Language & Communication" },
  { key: "open_reference", label: "📖 Open Reference" },
];

const CONTENT_TYPES = [
  { key: "all", label: "All" },
  { key: "article", label: "Articles" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "document", label: "Documents" },
  { key: "collection", label: "Collections" },
  { key: "reference", label: "Reference" },
];

function ContentTypeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case "audio": return <Headphones className={cls} />;
    case "video": return <Video className={cls} />;
    case "document": return <FileText className={cls} />;
    case "collection": return <FolderOpen className={cls} />;
    case "reference": return <LinkIcon className={cls} />;
    default: return <BookOpen className={cls} />;
  }
}

function LicenseBadge({ license }: { license: string }) {
  const labels: Record<string, string> = {
    cc_by: "CC BY",
    cc_by_sa: "CC BY-SA",
    cc_by_nc: "CC BY-NC",
    cc0: "CC0",
    all_rights_reserved: "© All Rights Reserved",
  };
  return (
    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
      {labels[license] ?? license}
    </span>
  );
}

export default function Library() {
  const t = useT();
  const [, setLocation] = useLocation();
  const [entries, setEntries] = useState<LibraryEntryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  async function fetchEntries(opts: {
    page?: number;
    category?: string;
    contentType?: string;
    q?: string;
    append?: boolean;
  }) {
    const p = opts.page ?? 1;
    const isAppend = opts.append ?? false;
    if (isAppend) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (opts.category && opts.category !== "all") params.set("category", opts.category);
    if (opts.contentType && opts.contentType !== "all") params.set("contentType", opts.contentType);
    if (opts.q) params.set("q", opts.q);

    const token = getStoredToken();
    const res = await fetch(`/api/library?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);

    if (res?.ok) {
      const data = await res.json();
      setTotal(data.total ?? 0);
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      setEntries(prev => isAppend ? [...prev, ...entries] : entries);
    }
    if (isAppend) setLoadingMore(false);
    else setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    fetchEntries({ page: 1, category, contentType, q });
  }, [category, contentType, q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchEntries({ page: next, category, contentType, q, append: true });
  }

  const hasMore = entries.length < total;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            QuillHive Library
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3">
            Free knowledge, creator-attributed,<br className="hidden sm:block" /> open to the world.
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Permanently indexed. Search-engine accessible. Every entry attributes its creator.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search the library..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            <Button asChild variant="outline">
              <Link href="/library/new">+ Add to Library</Link>
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Type Chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.key}
              onClick={() => setContentType(ct.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                contentType === ct.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              <ContentTypeIcon type={ct.key} />
              {ct.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground mb-4">
            {total === 0 ? "No entries found." : `${total} ${total === 1 ? "entry" : "entries"}`}
            {q && ` for "${q}"`}
          </p>
        )}

        {/* Entry Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium">No entries found.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Be the first to contribute to this category.
            </p>
            <Button asChild className="mt-4">
              <Link href="/library/new">Add to Library</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(entry => (
                <Link
                  key={entry.id}
                  href={`/library/${entry.slug}`}
                  className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
                >
                  {entry.thumbnailUrl ? (
                    <img
                      src={entry.thumbnailUrl}
                      alt={entry.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <ContentTypeIcon type={entry.contentType} />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-4 gap-3">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.isFeatured && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[10px]">
                          ⭐ Featured
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <ContentTypeIcon type={entry.contentType} />
                        {CONTENT_TYPES.find(c => c.key === entry.contentType)?.label ?? entry.contentType}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {entry.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.summary}</p>

                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                      {/* Author */}
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          {entry.authorAvatarUrl && (
                            <AvatarImage src={entry.authorAvatarUrl} alt={entry.authorDisplayName} />
                          )}
                          <AvatarFallback className="text-[8px]">
                            {getInitials(entry.authorDisplayName || entry.authorUsername)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {entry.authorDisplayName || entry.authorUsername}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> {entry.viewCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Bookmark className="w-3 h-3" /> {entry.saveCount}
                        </span>
                      </div>
                    </div>
                    <LicenseBadge license={entry.license} />
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? "Loading..." : (
                    <>Load more <ChevronDown className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
