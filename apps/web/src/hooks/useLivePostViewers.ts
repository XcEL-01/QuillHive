import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

interface PostViewEvent {
  postId: number;
  totalViews: number;
}

export function useLivePostViewers(postId: number | null | undefined): number | null {
  const [totalViews, setTotalViews] = useState<number | null>(null);

  useEffect(() => {
    if (!postId) return;
    const socket = getSocket();
    socket.emit("join:post", postId);

    const onView = (data: PostViewEvent) => {
      if (data.postId === postId) {
        setTotalViews(data.totalViews);
      }
    };
    socket.on("post:view", onView);

    return () => {
      socket.off("post:view", onView);
      socket.emit("leave:post", postId);
    };
  }, [postId]);

  return totalViews;
}
