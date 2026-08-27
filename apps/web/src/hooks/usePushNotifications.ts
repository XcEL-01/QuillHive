import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications(): void {
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined" || Notification.permission === "denied") return;

    let cancelled = false;
    (async () => {
      try {
        const keyRes = await fetch("/api/push/vapid-public-key");
        if (!keyRes.ok) return;
        const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
        if (!publicKey || cancelled) return;

        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted" || cancelled) return;
        }

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
          }));
        if (cancelled) return;

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        /* push is optional, never block the app */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user]);
}
