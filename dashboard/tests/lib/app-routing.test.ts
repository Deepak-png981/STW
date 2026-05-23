import { describe, expect, it } from "vitest";

import { resolveAppRoute } from "../../src/lib/app-routing";

describe("resolveAppRoute", () => {
  it("maps dashboard path variants to dashboard route", () => {
    expect(resolveAppRoute("/dashboard")).toBe("dashboard");
    expect(resolveAppRoute("/dashboard/")).toBe("dashboard");
  });

  it("maps unknown paths to 404 route", () => {
    expect(resolveAppRoute("/about")).toBe("404");
    expect(resolveAppRoute("/missing-page")).toBe("404");
  });

  it("maps root paths to landing route", () => {
    expect(resolveAppRoute("/")).toBe("landing");
    expect(resolveAppRoute("")).toBe("landing");
  });
});
