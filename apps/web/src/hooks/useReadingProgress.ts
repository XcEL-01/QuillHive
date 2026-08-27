import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

export function useReadingProgress(postId: number | null, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const [percent, setPercent] = useState(0);
  const lastSentRef = useRef(0);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !postId) return;
    let cancelled = false;
    apiRequest('GET', `/api/reading-progress/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.percent === 'number') setPercent(data.percent);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, enabled]);

  useEffect(() => {
    if (!enabled || !postId) return;

    const compute = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max <= 0 ? 100 : Math.min(100, Math.max(0, (scrollTop / max) * 100));
      setPercent(p);

      const now = Date.now();
      if (Math.abs(p - lastSentRef.current) >= 5 || now - lastSentAtRef.current > 15_000) {
        lastSentRef.current = p;
        lastSentAtRef.current = now;
        apiRequest('PUT', `/api/reading-progress/${postId}`, { percent: p }).catch(() => {});
      }
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    compute();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      apiRequest('PUT', `/api/reading-progress/${postId}`, { percent: lastSentRef.current }).catch(() => {});
    };
  }, [postId, enabled]);

  return percent;
}
