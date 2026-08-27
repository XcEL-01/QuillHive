import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1, type: "like", message: "test", priority: "low", category: "social" }]),
  },
}));
vi.mock("@workspace/db/schema", () => ({
  notificationsTable: {},
  usersTable: {},
}));
vi.mock("../lib/socket", () => ({
  emitToUser: vi.fn(),
}));
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../features/notifications/push.service", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

describe("notify() — service is importable", () => {
  it("exports notify function", async () => {
    const mod = await import("../features/notifications/notification.service");
    expect(typeof mod.notify).toBe("function");
  });
});

describe("notify() — self-notification guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips notification when userId === actorId", async () => {
    const { notify } = await import("../features/notifications/notification.service");
    const { emitToUser } = await import("../lib/socket");
    const { sendPushToUser } = await import("../features/notifications/push.service");

    await notify({ userId: 42, actorId: 42, type: "like", message: "liked your post" });
    expect(emitToUser).not.toHaveBeenCalled();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});

describe("notify() — deduplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not insert when userId === actorId", async () => {
    const { notify } = await import("../features/notifications/notification.service");
    const dbMod = await import("@workspace/db");
    const mockDb = dbMod.db as unknown as { insert: ReturnType<typeof vi.fn> };

    await notify({ userId: 5, actorId: 5, type: "like", message: "liked", postId: 10 });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
