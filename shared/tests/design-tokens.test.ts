import { describe, expect, it } from "vitest";

import { designTokens, designTokensAsCssVariables, SHAME_THE_WEB_DASHBOARD_ORIGINS } from "../src/design-tokens";

describe("design tokens", () => {
  it("keeps core colors aligned with design profile", () => {
    expect(designTokens.color.appBackground).toBe("#C9D67A");
    expect(designTokens.color.sidebarBackground).toBe("#19191D");
    expect(designTokens.color.mainSurface).toBe("#E7E7E7");
    expect(designTokens.color.accentLime).toBe("#D7EB59");
    expect(designTokens.color.accentLavender).toBe("#BEB2F6");
  });

  it("emits CSS variables for shared UI styling", () => {
    const css = designTokensAsCssVariables();
    expect(css).toContain("--stw-app-background: #C9D67A;");
    expect(css).toContain("--stw-radius-card: 24px;");
    expect(css).toContain("--stw-font-family:");
  });

  it("includes localhost and production dashboard origins", () => {
    expect(SHAME_THE_WEB_DASHBOARD_ORIGINS).toContain("http://localhost:5173");
    expect(SHAME_THE_WEB_DASHBOARD_ORIGINS).toContain("https://shametheweb.com");
    expect(SHAME_THE_WEB_DASHBOARD_ORIGINS).toContain("https://www.shametheweb.com");
  });
});
