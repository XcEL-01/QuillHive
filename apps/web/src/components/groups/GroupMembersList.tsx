import { useEffect, useState } from "react";
import { Loader2, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";

type GroupRole = "admin" | "moderator" | "member";

interface Member {
  id: number;
  userId: number;
  role: GroupRole;
  joinedAt: string;
}

interface GroupMembersListProps {
  groupId: number;
}

const ROLES: GroupRole[] = ["admin", "moderator", "member"];

export function GroupMembersList({ groupId }: GroupMembersListProps) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [membersRes, roleRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/members`),
          token
            ? fetch(`/api/groups/${groupId}/my-role`, { headers: { Authorization: `Bearer ${token}` } })
            : Promise.resolve(null),
        ]);
        if (membersRes.ok) {
          const data = await membersRes.json() as { members: Member[] };
          setMembers(data.members ?? []);
        }
        if (roleRes && roleRes.ok) {
          const data = await roleRes.json() as { role: GroupRole | null };
          setMyRole(data.role);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, token]);

  const updateRole = async (userId: number, role: GroupRole) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Could not update role", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  const canManage = myRole === "admin";

  return (
    <div className="bg-card border border-border/60 rounded-2xl divide-y divide-border" data-testid="group-members-list">
      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-6 text-sm">No members yet.</p>
      ) : members.map(m => (
        <div key={m.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            {m.role === "admin" ? <ShieldCheck className="w-4 h-4 text-primary" />
              : m.role === "moderator" ? <Shield className="w-4 h-4 text-amber-500" />
              : <UserIcon className="w-4 h-4 text-muted-foreground" />}
            <div className="min-w-0">
              <p className="font-medium text-sm">User #{m.userId}</p>
              <p className="text-xs text-muted-foreground">{m.role} · joined {new Date(m.joinedAt).toLocaleDateString()}</p>
            </div>
          </div>
          {canManage && (
            <Select value={m.role} onValueChange={(v) => updateRole(m.userId, v as GroupRole)}>
              <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${m.userId}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
