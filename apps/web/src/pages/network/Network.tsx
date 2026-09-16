import { useEffect, useState } from "react";
import { Link } from "wouter";
import { UserPlus, Users, UserRoundCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, mediaUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { usePageTitle } from "@/hooks/usePageTitle";

type NetworkUser = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  score?: number;
  mutualConnection?: boolean;
  sharesTopic?: boolean;
};

function PersonRow({ user, action }: { user: NetworkUser; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Link href={`/profile/${user.username}`} className="shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={mediaUrl(user.avatarUrl)} alt={user.displayName} />
          <AvatarFallback>{user.displayName?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${user.username}`} className="block truncate text-sm font-semibold hover:text-primary">
          {user.displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{user.headline || `@${user.username}`}</p>
      </div>
      {action}
    </div>
  );
}

export default function Network() {
  usePageTitle("My Network");
  const { user } = useAuthStore();
  const [following, setFollowing] = useState<NetworkUser[]>([]);
  const [followers, setFollowers] = useState<NetworkUser[]>([]);
  const [suggested, setSuggested] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingId, setFollowingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.username) return;
    let active = true;
    Promise.all([
      apiFetch(`/api/users/${encodeURIComponent(user.username)}/following`),
      apiFetch(`/api/users/${encodeURIComponent(user.username)}/followers`),
      apiFetch("/api/users/suggested"),
    ])
      .then(async ([followingResponse, followersResponse, suggestedResponse]) => {
        if (!followingResponse.ok || !followersResponse.ok || !suggestedResponse.ok) throw new Error("Unable to load network");
        const [followingData, followersData, suggestedData] = await Promise.all([
          followingResponse.json(), followersResponse.json(), suggestedResponse.json(),
        ]);
        if (!active) return;
        setFollowing(Array.isArray(followingData) ? followingData : []);
        setFollowers(Array.isArray(followersData) ? followersData : []);
        setSuggested(Array.isArray(suggestedData) ? suggestedData : []);
      })
      .catch(() => {
        if (!active) return;
        setFollowing([]);
        setFollowers([]);
        setSuggested([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.username]);

  const handleFollow = async (person: NetworkUser) => {
    setFollowingId(person.id);
    try {
      const response = await apiFetch(`/api/users/${encodeURIComponent(person.username)}/follow`, { method: "POST" });
      if (response.ok) setSuggested(current => current.filter(candidate => candidate.id !== person.id));
    } finally {
      setFollowingId(null);
    }
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-0">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-serif font-bold">
            <Users className="h-6 w-6 text-primary" /> My Network
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep up with the people and ideas shaping your hive.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-lg">People you follow</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : following.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">You are not following anyone yet.</p>
              ) : <div className="divide-y divide-border/60">{following.map(person => <PersonRow key={person.id} user={person} />)}</div>}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-lg">People who follow you</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : followers.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No one follows you yet.</p>
              ) : <div className="divide-y divide-border/60">{followers.map(person => <PersonRow key={person.id} user={person} />)}</div>}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5 text-primary" /> Suggested for you</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="space-y-3">{[1, 2, 3].map(row => <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div> : suggested.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No new suggestions right now.</p>
            ) : <div className="divide-y divide-border/60">{suggested.map(person => (
              <PersonRow
                key={person.id}
                user={person}
                action={<Button size="sm" variant="outline" className="shrink-0 rounded-lg" disabled={followingId === person.id} onClick={() => handleFollow(person)}><UserRoundCheck className="mr-1.5 h-4 w-4" />Follow</Button>}
              />
            ))}</div>}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
