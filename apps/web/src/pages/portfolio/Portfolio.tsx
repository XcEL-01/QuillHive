import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { BackButton } from "@/components/ui/BackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Twitter, Linkedin, Instagram, Facebook, MapPin, Mail, Briefcase, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const IDENTITY_LABELS: Record<string, string> = {
  everyone: "Member",
  reader: "Reader",
  writer: "Writer",
  artist: "Artist",
  professional: "Professional",
  student: "Student",
  builder: "Builder",
  community: "Community",
};

interface FeaturedPost {
  id: number;
  title: string | null;
  type: string;
  excerpt: string | null;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
}

interface PortfolioPayload {
  user: {
    id: number;
    displayName: string;
    username: string;
    bio: string | null;
    headline: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    website: string | null;
    twitter: string | null;
    linkedin: string | null;
    instagram: string | null;
    facebook: string | null;
    location: string | null;
    country: string | null;
    hireMeEnabled: boolean;
    showEmail: boolean;
    identityType: string | null;
    isPremium: boolean;
    isCreatorMode: boolean;
    email?: string;
  };
  featuredPosts: FeaturedPost[];
  stats: { postCount: number; followerCount: number };
}

const TYPE_BG: Record<string, string> = {
  text: "from-violet-500/30 to-purple-500/30",
  poetry: "from-pink-500/30 to-rose-500/30",
  art: "from-amber-500/30 to-orange-500/30",
  story: "from-emerald-500/30 to-teal-500/30",
  essay: "from-blue-500/30 to-indigo-500/30",
};

export default function Portfolio() {
  const params = useParams<{ username?: string }>();
  const [, setLocation] = useLocation();
  const { user: viewer } = useAuthStore();
  const username = params?.username ?? viewer?.username;
  const [data, setData] = useState<PortfolioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(`/api/users/${encodeURIComponent(username)}/portfolio`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((payload: PortfolioPayload | null) => {
        if (payload) setData(payload);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !data) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-12 text-center">
          <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h1 className="text-2xl font-serif font-semibold mb-2">Portfolio not found</h1>
          <p className="text-muted-foreground mb-6">We couldn&apos;t find a portfolio for that username.</p>
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { user, featuredPosts, stats } = data;
  const isMe = viewer?.username === user.username;
  const identityLabel = user.identityType && IDENTITY_LABELS[user.identityType] ? IDENTITY_LABELS[user.identityType] : "Member";

  return (
    <AppLayout>
      <div className="bg-background" data-testid="portfolio-page">
        <div className="max-w-5xl mx-auto px-6 pt-4">
          <BackButton />
        </div>
        {user.coverUrl && (
          <div
            className="h-48 md:h-64 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background bg-cover bg-center"
            style={{ backgroundImage: `url(${user.coverUrl})` }}
            data-testid="portfolio-cover"
          />
        )}

        <div className="max-w-5xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row md:items-end gap-6 ${user.coverUrl ? "-mt-12" : "pt-12"}`}>
            <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-primary/10">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
              <AvatarFallback className="text-2xl">{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-serif font-bold" data-testid="portfolio-name">
                  {user.displayName}
                </h1>
                {user.isPremium && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Premium</Badge>}
                <Badge variant="outline">{identityLabel}</Badge>
              </div>
              {user.headline && <p className="text-base text-muted-foreground mb-2">{user.headline}</p>}
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user.hireMeEnabled && (
                <Button
                  className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (user.showEmail && user.email) window.location.href = `mailto:${user.email}`;
                    else setLocation(`/profile/${user.username}`);
                  }}
                  data-testid="button-hire"
                >
                  <Mail className="w-4 h-4" /> Work Together
                </Button>
              )}
              <Link href={`/profile/${user.username}`}>
                <Button variant="outline" className="rounded-xl gap-2" data-testid="button-back-to-profile">
                  View full profile
                </Button>
              </Link>
            </div>
          </div>

          {user.bio && (
            <p className="text-base leading-relaxed mt-6 max-w-3xl text-foreground/90" data-testid="portfolio-bio">
              {user.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-muted-foreground">
            {user.location && (
              <span className="flex items-center gap-1.5" data-testid="portfolio-location">
                <MapPin className="w-4 h-4" /> {user.location}
                {user.country ? `, ${user.country}` : ""}
              </span>
            )}
            <span className="font-medium text-foreground">
              {stats.postCount} <span className="text-muted-foreground font-normal">Posts</span>
            </span>
            <span className="font-medium text-foreground">
              {stats.followerCount} <span className="text-muted-foreground font-normal">Followers</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-full" data-testid="link-website">
                  <Globe className="w-4 h-4" />
                </Button>
              </a>
            )}
            {user.twitter && (
              <a href={user.twitter.startsWith("http") ? user.twitter : `https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-full">
                  <Twitter className="w-4 h-4" />
                </Button>
              </a>
            )}
            {user.linkedin && (
              <a href={user.linkedin.startsWith("http") ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-full">
                  <Linkedin className="w-4 h-4" />
                </Button>
              </a>
            )}
            {user.instagram && (
              <a href={user.instagram.startsWith("http") ? user.instagram : `https://instagram.com/${user.instagram}`} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-full">
                  <Instagram className="w-4 h-4" />
                </Button>
              </a>
            )}
            {user.facebook && (
              <a href={user.facebook.startsWith("http") ? user.facebook : `https://facebook.com/${user.facebook}`} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-full">
                  <Facebook className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>

          <section className="mt-12 mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-semibold">Featured Works</h2>
              <Link href={`/profile/${user.username}`}>
                <Button variant="ghost" size="sm" className="gap-1">
                  See all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {featuredPosts.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">
                  No published work yet.{" "}
                  {isMe && (
                    <Link href="/write" className="text-primary hover:underline">
                      Share your first post →
                    </Link>
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredPosts.map((p) => (
                  <Link key={p.id} href={`/post/${p.id}`}>
                    <article
                      className="group cursor-pointer rounded-2xl border border-border overflow-hidden bg-card hover:shadow-lg transition-all hover:-translate-y-0.5"
                      data-testid={`featured-post-${p.id}`}
                    >
                      <div
                        className={`aspect-video bg-gradient-to-br ${TYPE_BG[p.type] ?? "from-muted to-muted/50"} flex items-center justify-center`}
                        style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                      >
                        {!p.imageUrl && <span className="text-4xl opacity-50">{p.type === "art" ? "🎨" : p.type === "poetry" ? "✒️" : "📖"}</span>}
                      </div>
                      <div className="p-4">
                        <Badge variant="outline" className="text-[10px] mb-2 capitalize">
                          {p.type}
                        </Badge>
                        <h3 className="font-serif font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {p.title ?? "Untitled"}
                        </h3>
                        {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
