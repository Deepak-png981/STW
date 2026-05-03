import { describe, expect, it, vi } from "vitest";

import { config, runPageRoast } from "./page-roast";

describe("page-roast content script", () => {
  it("registers on normal web pages and excludes dashboard origins", () => {
    expect(config.matches).toEqual(["http://*/*", "https://*/*"]);
    expect(config.exclude_matches).toEqual([
      "http://localhost:5173/*",
      "https://shametheweb.com/*",
      "https://www.shametheweb.com/*"
    ]);
    expect(config.run_at).toBe("document_idle");
  });

  it("returns early when there is no active user", async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://example.com", hostname: "example.com" }
    });
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ shameTheWebState: { users: [], activeUserId: null, visits: [] } }),
          set: vi.fn().mockResolvedValue(undefined)
        }
      },
      runtime: { sendMessage }
    });

    await runPageRoast();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

