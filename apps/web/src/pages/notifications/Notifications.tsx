import { useState, useCallback } from 'react';
import { useGetNotifications, useMarkNotificationsRead } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Users, CheckCheck, Trash2, AlertCircle, Info, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { useSocketEvent } from '@/hooks/useSocket';
import { getStoredToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { clsx } from 'clsx';
import { useT } from '@/lib/i18n';

type Priority = 'all' | 'urgent' | 'high' | 'normal' | 'low';

const PRIORITY_TAB_IDS: Priority[] = ['all', 'urgent', 'high', 'normal', 'low'];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-rose-500',
  high: 'text-amber-500',
  normal: 'text-blue-500',
  low: 'text-muted-foreground',
};

function getPriority(type: string): string {
  if (type === 'mention' || type === 'system') return 'high';
  if (type === 'admin_action') return 'urgent';
  if (type === 'group_invite') return 'high';
  if (type === 'like') return 'low';
  return 'normal';
}

export default function Notifications() {
  usePageTitle('Notifications');
  const { data, isLoading } = useGetNotifications();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const token = getStoredToken();
  const [activeTab, setActiveTab] = useState<Priority>('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const { mutate: markRead, isPending } = useMarkNotificationsRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
    }
  });

  useSocketEvent<any>('notification:new', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  }, [queryClient]));

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        toast({ title: t('notifications.markedAllRead') });
      }
    } catch {
      markRead();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds(s => new Set([...s, id]));
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch {
      toast({ title: t('notifications.deleteFailed'), variant: 'destructive' });
    } finally {
      setDeletingIds(s => { const next = new Set(s); next.delete(id); return next; });
    }
  };

  const getIcon = (type: string) => {
    const cls = 'p-1.5 text-white rounded-full absolute -bottom-1 -right-1 ring-2 ring-background';
    switch (type) {
      case 'like': return <div className={`${cls} bg-rose-500`}><Heart className="w-3 h-3 fill-current" /></div>;
      case 'comment': return <div className={`${cls} bg-blue-500`}><MessageCircle className="w-3 h-3 fill-current" /></div>;
      case 'follow': return <div className={`${cls} bg-primary`}><UserPlus className="w-3 h-3" /></div>;
      case 'mention': return <div className={`${cls} bg-amber-500`}><AtSign className="w-3 h-3" /></div>;
      case 'group_invite': return <div className={`${cls} bg-emerald-500`}><Users className="w-3 h-3" /></div>;
      case 'admin_action': return <div className={`${cls} bg-rose-600`}><AlertCircle className="w-3 h-3" /></div>;
      case 'system': return <div className={`${cls} bg-violet-500`}><Info className="w-3 h-3" /></div>;
      default: return <div className={`${cls} bg-muted-foreground`}><Zap className="w-3 h-3" /></div>;
    }
  };

  const getLink = (notif: any) => {
    if (notif.postId) return `/post/${notif.postId}`;
    if (notif.groupId) return `/groups/${notif.groupId}`;
    return `/profile/${notif.actor?.username}`;
  };

  const allNotifs: any[] = Array.isArray(data) ? data : [];
  const filtered = activeTab === 'all' ? allNotifs : allNotifs.filter(n => getPriority(n.type) === activeTab);
  const unreadCount = allNotifs.filter((n: any) => !n.isRead).length;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-0 pt-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-serif font-bold text-foreground">{t('notifications.title')}</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              <CheckCheck className="w-4 h-4 mr-2" /> {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {PRIORITY_TAB_IDS.map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                activeTab === id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {t(`notifications.${id}` as any)}
              {id !== 'all' && allNotifs.filter(n => getPriority(n.type) === id && !n.isRead).length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs h-4 px-1 py-0">
                  {allNotifs.filter(n => getPriority(n.type) === id && !n.isRead).length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/50">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 flex gap-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="space-y-2 w-full"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/4" /></div>
            </div>
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>{activeTab === 'all' ? t('notifications.allCaughtUp', "You're all caught up!") : t('notifications.noPriorityNotifs', `No ${activeTab} priority notifications.`)}</p>
            </div>
          )}

          {filtered.map((notif: any) => {
            const priority = getPriority(notif.type);
            return (
              <div
                key={notif.id}
                className={clsx(
                  'flex items-start gap-4 p-5 hover:bg-muted/50 transition-colors group',
                  !notif.isRead && 'bg-primary/5'
                )}
              >
                <Link href={getLink(notif)} className="flex-1 flex items-start gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12 border border-border">
                      <AvatarImage src={notif.actor?.avatarUrl || ''} />
                      <AvatarFallback>{notif.actor?.displayName?.substring(0, 2) ?? 'S'}</AvatarFallback>
                    </Avatar>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-foreground/90 leading-snug">
                      <span className="font-bold text-foreground">{notif.actor?.displayName ?? 'System'}</span>{' '}
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-muted-foreground font-medium">
                        {formatDistanceToNow(new Date(notif.createdAt))} ago
                      </p>
                      {priority !== 'normal' && priority !== 'low' && (
                        <span className={clsx('text-xs font-semibold capitalize', PRIORITY_COLORS[priority])}>
                          {priority}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1" />}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={deletingIds.has(notif.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={t('notifications.dismiss')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
