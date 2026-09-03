import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { logger } from "./logger";
import { getSessionUserId, isTokenBlacklisted } from "./auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let io: SocketServer | null = null;

export function setupSocket(httpServer: HttpServer): SocketServer {
  const appUrl = process.env.APP_URL ?? "";
  
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) { callback(null, true); return; }
        const allowed =
          (appUrl && origin === appUrl) ||
          /^https:\/\/[^/]*\.quillhive\.pages\.dev$/.test(origin ?? "") ||
          (process.env.NODE_ENV !== "production" && (
            /^https?:\/\/[^/]*\.replit\.dev$/.test(origin ?? "") ||
            /^https?:\/\/[^/]*\.repl\.co$/.test(origin ?? "") ||
            /^https?:\/\/localhost(:\d+)?$/.test(origin ?? "")
          ));
        if (allowed) callback(null, true);
        else callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.use(async (socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token = typeof authToken === "string"
      ? authToken
      : header?.startsWith("Bearer ")
        ? header.slice(7)
        : null;
    const userId = token ? getSessionUserId(token) : null;
    if (!userId || (await isTokenBlacklisted(token!))) {
      next(new Error("Unauthorized"));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Client connected");

    socket.on("join:user", (userId: number) => {
      if (userId !== socket.data.userId) return;
      socket.join(`user:${userId}`);
      logger.info({ socketId: socket.id, userId }, "User joined their room");
    });

    socket.on("join:conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("message:send", (data: { conversationId: number; message: any }) => {
      io?.to(`conversation:${data.conversationId}`).emit("message:receive", data.message);
    });

    socket.on("typing:start", (data: { conversationId: number; userId: number }) => {
      socket.to(`conversation:${data.conversationId}`).emit("typing:start", data);
    });

    socket.on("typing:stop", (data: { conversationId: number; userId: number }) => {
      socket.to(`conversation:${data.conversationId}`).emit("typing:stop", data);
    });

    socket.on("join:support", (ticketId: number) => {
      socket.join(`support:${ticketId}`);
    });

    socket.on("join:post", async (postId: number) => {
      socket.join(`post:${postId}`);
      // Count simultaneous readers in this post room
      try {
        const room = io?.sockets.adapter.rooms.get(`post:${postId}`);
        const liveCount = room ? room.size : 0;
        io?.to(`post:${postId}`).emit("view_update", { postId, liveCount });

        if (liveCount >= 3) {
          const { getRedis } = await import("./redis");
          const redis = getRedis();
          const notifKey = `live-notif:${postId}`;
          const alreadySent = redis ? await redis.get(notifKey) : null;
          if (!alreadySent) {
            const { db } = await import("@workspace/db");
            const { postsTable } = await import("@workspace/db/schema");
            const { eq } = await import("drizzle-orm");
            const [post] = await db
              .select({ authorId: postsTable.authorId, title: postsTable.title })
              .from(postsTable)
              .where(eq(postsTable.id, postId));
            if (post?.authorId) {
              const { notify } = await import("../features/notifications/notification.service");
              await notify({
                userId: post.authorId,
                type: "system",
                title: `🔥 ${liveCount} people reading your post right now`,
                message: `"${(post.title ?? "Your post").slice(0, 50)}" has ${liveCount} simultaneous readers.`,
                url: `/post/${postId}`,
                postId,
              });
              if (redis) await redis.set(notifKey, "1", { ex: 3600 });
            }
          }
        }
      } catch (error) {
        logger.warn({ error, postId }, "Failed to update live view count");
      }
    });

    socket.on("leave:post", (postId: number) => {
      socket.leave(`post:${postId}`);
    });

    socket.on("join:admin", () => {
      void db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, socket.data.userId)).limit(1)
        .then(([user]) => {
          if (user?.role === "admin" || user?.role === "super_admin") socket.join("admin:monitoring");
        })
        .catch((error) => logger.warn({ error, userId: socket.data.userId }, "Failed to authorize admin socket room"));
    });
    socket.on("leave:admin", () => {
      socket.leave("admin:monitoring");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");
    });
  });

  return io;
}

export function emitToUser(userId: number, event: string, data: any) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(conversationId: number, event: string, data: any) {
  io?.to(`conversation:${conversationId}`).emit(event, data);
}

export function emitToSupportTicket(ticketId: number, event: string, data: any) {
  io?.to(`support:${ticketId}`).emit(event, data);
}

export function emitToPost(postId: number, event: string, data: unknown): void {
  io?.to(`post:${postId}`).emit(event, data);
}

export function emitToAdmins(event: string, data: unknown): void {
  io?.to("admin:monitoring").emit(event, data);
}

export function getIO(): SocketServer | null {
  return io;
}
