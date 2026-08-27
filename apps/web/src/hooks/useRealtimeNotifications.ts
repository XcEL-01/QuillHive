import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { useSocketEvent } from '@/hooks/useSocket';

interface RealtimeNotification {
  id: number;
  type: string;
  title: string;
  message?: string;
  url?: string;
  actorName?: string;
  actorAvatar?: string;
  postId?: number;
  read: boolean;
  createdAt: string;
}

interface UnreadCountEvent {
  count: number;
}

export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useSocketEvent<RealtimeNotification>('notification', (data) => {
    queryClient.setQueryData<{ notifications?: RealtimeNotification[] }>(
      ['notifications'],
      (old) => {
        if (!old) return { notifications: [data] };
        const existing = old.notifications ?? [];
        if (existing.some(n => n.id === data.id)) return old;
        return { ...old, notifications: [data, ...existing] };
      }
    );

    const { dismiss } = toast({
      title: data.title,
      description: data.message,
      duration: 5000,
    });

    if (data.url) {
      const clickHandler = () => {
        dismiss();
        window.location.href = data.url!;
      };
      void clickHandler;
    }
  });

  useSocketEvent<UnreadCountEvent>('unread_count', (data) => {
    queryClient.setQueryData(['notifications', 'unread_count'], data.count);
  });

  useEffect(() => {
    return () => {};
  }, [user?.id]);
}
