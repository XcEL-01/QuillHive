import { useCallback, useEffect } from "react";
import { useSocketEvent } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { useLocation } from "wouter";
import {
  Heart, MessageCircle, UserPlus, AtSign, Users, AlertCircle,
  Info, Zap, Trophy, TrendingUp, Bookmark, Star, BookOpen,
} from "lucide-react";

interface NotificationPayload {
  id: number;
  type: string;
  message: string;
  category: string;
  postId?: number | null;
  groupId?: number | null;
  actor?: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

function getNotifIcon(type: string): React.ReactNode {
  const cls = "w-4 h-4";
  switch (type) {
    case "like": return <Heart className={`${cls} text-rose-500 fill-current`} />;
    case "comment":
    case "reply": return <MessageCircle className={`${cls} text-blue-500`} />;
    case "follow": return <UserPlus className={`${cls} text-primary`} />;
    case "mention": return <AtSign className={`${cls} text-amber-500`} />;
    case "group_invite": return <Users className={`${cls} text-emerald-500`} />;
    case "admin_action": return <AlertCircle className={`${cls} text-rose-600`} />;
    case "system": return <Info className={`${cls} text-violet-500`} />;
    case "achievement":
    case "milestone":
    case "streak_milestone": return <Trophy className={`${cls} text-amber-500`} />;
    case "trending":
    case "trending_notif": return <TrendingUp className={`${cls} text-emerald-500`} />;
    case "library_save": return <Bookmark className={`${cls} text-violet-500`} />;
    case "library_feature": return <Star className={`${cls} text-amber-400`} />;
    case "library_entry": return <BookOpen className={`${cls} text-indigo-500`} />;
    default: return <Zap className={`${cls} text-muted-foreground`} />;
  }
}

function getNotifLink(notif: NotificationPayload): string {
  if (notif.postId) return `/post/${notif.postId}`;
  if (notif.groupId) return `/groups/${notif.groupId}`;
  if (notif.type === "follow" && notif.actor?.username) {
    return `/profile/${notif.actor.username}`;
  }
  if (notif.type.startsWith("library_")) return "/library";
  return "/notifications";
}

export function NotificationToast() {
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [location] = useLocation();

  const shouldSkip = location.startsWith("/notifications");

  const handleNotif = useCallback(
    (data: NotificationPayload) => {
      if (shouldSkip) return;
      if (!data || !data.type) return;

      const link = getNotifLink(data);
      const actorName = data.actor?.displayName || data.actor?.username || "";
      const title = actorName ? `${actorName}` : "QuillHive";

      toast({
        title,
        description: data.message,
        duration: 4000,
        action: link
          ? {
              altText: "View",
              onClick: () => {
                window.location.href = link;
              },
            } as any
          : undefined,
      });
    },
    [shouldSkip, toast],
  );

  useSocketEvent<NotificationPayload>("notification:new", handleNotif);

  useEffect(() => {
    if (!isAuthenticated) return;
  }, [isAuthenticated]);

  return null;
}
