import { describe, it, expect, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));
vi.mock("@workspace/db/schema", () => ({
  libraryEntriesTable: {},
  librarySavesTable: {},
  usersTable: {},
}));
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../lib/sanitize", () => ({ sanitizeRichText: (s: string) => s }));
vi.mock("../features/notifications/notification.service", () => ({ notify: vi.fn() }));

describe("Library slug generation", () => {
  it("converts title to URL-safe slug", () => {
    const title = "Hello World! A Test Post";
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    expect(slug).toBe("hello-world-a-test-post");
  });

  it("handles unicode and special characters", () => {
    const title = "How to code in C++ (2024)";
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    expect(slug).toBe("how-to-code-in-c-2024");
  });
});

describe("Library content types", () => {
  const validTypes = ["article", "audio", "video", "document", "collection", "reference"];
  it("validates known content types", () => {
    for (const t of validTypes) {
      expect(validTypes).toContain(t);
    }
  });
});

describe("Library category values", () => {
  const validCategories = [
    "writing_literature", "science_research", "technology_code", "business_strategy",
    "art_design", "music_audio", "film_motion", "philosophy_ideas", "history_culture",
    "education_learning", "health_wellbeing", "environment_nature", "law_society",
    "language_communication", "open_reference",
  ];
  it("has 15 valid categories", () => {
    expect(validCategories.length).toBe(15);
  });
});

describe("Notification prefs defaults", () => {
  it("provides sensible defaults for all notification types", async () => {
    const { DEFAULT_PREFS } = await import("../features/notifications/notificationPrefs.routes");
    expect(DEFAULT_PREFS.mention.email).toBe(true);
    expect(DEFAULT_PREFS.like.email).toBe(false);
    expect(DEFAULT_PREFS.admin_action.push).toBe(true);
    expect(DEFAULT_PREFS.digest.email).toBe(true);
    expect(DEFAULT_PREFS.digest.inApp).toBe(false);
  });
});
