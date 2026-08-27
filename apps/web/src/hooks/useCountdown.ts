import { useState, useEffect } from "react";

export function useCountdown(endsAt: string | Date | null) {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, expired: false });

  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();

    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }
      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        expired: false,
      });
    }

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}
