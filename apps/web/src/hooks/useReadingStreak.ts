import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  lastReadDate: string | null;
  activity?: Array<{ readDate: string; count: number }>;
}

export function useStreak(enabled = true) {
  return useQuery<StreakData>({
    queryKey: ['/api/streaks/me'],
    queryFn: async () => (await apiRequest('GET', '/api/streaks/me')).json(),
    enabled,
    staleTime: 60_000,
  });
}

/** Records a read after the user has lingered on the post for at least 8s. */
export function useRecordRead(postId: number | null, enabled = true) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', '/api/streaks/record', { postId: id });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/streaks/me'] }),
  });

  useEffect(() => {
    if (!enabled || !postId) return;
    const timer = setTimeout(() => mutation.mutate(postId), 8000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, enabled]);
}
