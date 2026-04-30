// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { renderRoastToast, shouldShowToast } from "./toast";

describe("roast toast", () => {
  it("renders a top-right toast with message and score context", () => {
    renderRoastToast({
      message: "example.com is loading with dramatic flair.",
      subline: "Speed score: 42/100",
      durationMs: 1000
    });

    const toast = document.querySelector("[data-shame-toast]");

    expect(toast?.textContent).toContain("example.com is loading with dramatic flair.");
    expect(toast?.textContent).toContain("Speed score: 42/100");
  });

  it("allows one toast per page cooldown window", () => {
    const now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(5000);

    expect(shouldShowToast("https://example.com", now, 2500)).toBe(true);
    expect(shouldShowToast("https://example.com", now, 2500)).toBe(false);
    expect(shouldShowToast("https://example.com", now, 2500)).toBe(true);
  });
});
