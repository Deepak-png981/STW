import { describe, expect, it } from "vitest";

import { getRoastCategory, pickRoast, roastTemplates } from "./roast-templates";

describe("roast engine", () => {
  it("maps score bands to playful roast categories", () => {
    expect(getRoastCategory(96)).toBe("lightning");
    expect(getRoastCategory(78)).toBe("good");
    expect(getRoastCategory(55)).toBe("okay");
    expect(getRoastCategory(33)).toBe("slow");
    expect(getRoastCategory(10)).toBe("fossil");
  });

  it("has a large template pool for every category", () => {
    const counts = Object.values(roastTemplates).map((templates) => templates.length);

    expect(counts.every((count) => count >= 20)).toBe(true);
  });

  it("avoids recently used templates when alternatives exist", () => {
    const recentTemplateIds = roastTemplates.slow.slice(0, 19).map((template) => template.id);

    const selection = pickRoast({
      score: 32,
      hostname: "example.com",
      recentTemplateIds
    });

    expect(recentTemplateIds).not.toContain(selection.templateId);
    expect(selection.category).toBe("slow");
    expect(selection.subline).toContain("32/100");
  });
});
