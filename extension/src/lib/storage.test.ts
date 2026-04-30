import { describe, expect, it } from "vitest";

import {
  appendVisit,
  createUser,
  getActiveUser,
  getInitialState,
  getRecentRoastTemplateIds,
  loginUser,
  rememberRoastTemplate
} from "./storage";

function createMemoryDriver(initial = getInitialState()) {
  let state = initial;

  return {
    async read() {
      return state;
    },
    async write(nextState: typeof state) {
      state = nextState;
    }
  };
}

describe("local auth storage", () => {
  it("creates a local user and makes them active", async () => {
    const driver = createMemoryDriver();

    const user = await createUser(driver, {
      name: "Deepak",
      email: "deepak@example.com"
    });

    const activeUser = await getActiveUser(driver);

    expect(user.email).toBe("deepak@example.com");
    expect(activeUser).toEqual(user);
  });

  it("logs in an existing user by normalized email", async () => {
    const driver = createMemoryDriver();
    const user = await createUser(driver, {
      name: "Deepak",
      email: "deepak@example.com"
    });

    const activeUser = await loginUser(driver, "  DEEPAK@example.com ");

    expect(activeUser).toEqual(user);
  });

  it("does not create duplicate local users for the same email", async () => {
    const driver = createMemoryDriver();

    const first = await createUser(driver, {
      name: "Deepak",
      email: "deepak@example.com"
    });
    const second = await createUser(driver, {
      name: "Deepak Again",
      email: "DEEPAK@example.com"
    });

    const state = await driver.read();

    expect(second).toEqual(first);
    expect(state.users).toHaveLength(1);
  });

  it("appends visit records to local state", async () => {
    const driver = createMemoryDriver();
    await appendVisit(driver, {
      id: "visit-1",
      userId: "user-1",
      url: "https://example.com",
      hostname: "example.com",
      title: "Example",
      timestamp: "2026-04-29T00:00:00.000Z",
      metrics: {
        loadMs: 1200,
        fcpMs: 600,
        lcpMs: 1000,
        domInteractiveMs: 450
      },
      speedScore100: 95,
      categoryScores: [],
      overallScore100: 95,
      roast: {
        category: "lightning",
        templateId: "lightning-1",
        message: "Fast enough to dodge the roast.",
        subline: "Speed score: 95/100"
      }
    });

    const state = await driver.read();

    expect(state.visits).toHaveLength(1);
    expect(state.visits[0]?.hostname).toBe("example.com");
  });

  it("keeps a bounded recent roast template list per user and category", async () => {
    const driver = createMemoryDriver();

    for (let index = 1; index <= 12; index += 1) {
      await rememberRoastTemplate(driver, {
        userId: "user-1",
        category: "slow",
        templateId: `slow-${index}`
      });
    }

    const recentIds = await getRecentRoastTemplateIds(driver, "user-1", "slow");

    expect(recentIds).toHaveLength(10);
    expect(recentIds[0]).toBe("slow-3");
    expect(recentIds.at(-1)).toBe("slow-12");
  });
});
