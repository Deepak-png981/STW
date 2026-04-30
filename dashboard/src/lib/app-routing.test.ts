import { describe, expect, it } from "vitest";

import { resolveAppRoute } from "./app-routing";

describe("resolveAppRoute", () => {
  it("maps dashboard path variants to dashboard route", () => {
    expect(resolveAppRoute("/dashboard")).toBe("dashboard");
    expect(resolveAppRoute("/dashboard/")).toBe("dashboard");
  });

  it("maps all other paths to landing route", () => {
    expect(resolveAppRoute("/")).toBe("landing");
    expect(resolveAppRoute("/about")).toBe("landing");
    expect(resolveAppRoute("")).toBe("landing");
  });
});
