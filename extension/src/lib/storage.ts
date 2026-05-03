import type { ScoreBand, StoredState, UserProfile, VisitRecord } from "@shame-the-web/shared";

const STORAGE_KEY = "shameTheWebState";

export type StorageDriver = {
  read(): Promise<StoredState>;
  write(nextState: StoredState): Promise<void>;
};

export function getInitialState(): StoredState {
  return {
    users: [],
    activeUserId: null,
    visits: [],
    recentRoastTemplateIds: {},
    toastEnabled: true
  };
}

export const chromeStorageDriver: StorageDriver = {
  async read() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return parseState(result[STORAGE_KEY]);
  },
  async write(nextState) {
    await chrome.storage.local.set({ [STORAGE_KEY]: nextState });
  }
};

export async function createUser(
  driver: StorageDriver,
  input: { name: string; email: string }
): Promise<UserProfile> {
  const state = await driver.read();
  const email = normalizeEmail(input.email);
  const existingUser = state.users.find((user) => normalizeEmail(user.email) === email);

  if (existingUser) {
    await driver.write({ ...state, activeUserId: existingUser.id });
    return existingUser;
  }

  const user: UserProfile = {
    id: createId(),
    name: input.name.trim(),
    email,
    createdAt: new Date().toISOString()
  };

  await driver.write({
    ...state,
    users: [...state.users, user],
    activeUserId: user.id
  });

  return user;
}

export async function loginUser(driver: StorageDriver, emailInput: string): Promise<UserProfile | null> {
  const state = await driver.read();
  const email = normalizeEmail(emailInput);
  const user = state.users.find((candidate) => normalizeEmail(candidate.email) === email) ?? null;

  if (!user) {
    return null;
  }

  await driver.write({ ...state, activeUserId: user.id });
  return user;
}

export async function getActiveUser(driver: StorageDriver): Promise<UserProfile | null> {
  const state = await driver.read();
  return state.users.find((user) => user.id === state.activeUserId) ?? null;
}

export async function getState(driver: StorageDriver): Promise<StoredState> {
  return driver.read();
}

export async function setState(driver: StorageDriver, nextState: StoredState): Promise<void> {
  await driver.write(nextState);
}

export async function setToastEnabled(driver: StorageDriver, enabled: boolean): Promise<void> {
  const state = await driver.read();
  await driver.write({ ...state, toastEnabled: enabled });
}

export async function appendVisit(driver: StorageDriver, visit: VisitRecord): Promise<void> {
  const state = await driver.read();
  await driver.write({
    ...state,
    visits: [...state.visits, visit].slice(-500)
  });
}

export async function getRecentRoastTemplateIds(
  driver: StorageDriver,
  userId: string,
  category: ScoreBand
): Promise<string[]> {
  const state = await driver.read();
  return state.recentRoastTemplateIds[getRecentRoastKey(userId, category)] ?? [];
}

export async function rememberRoastTemplate(
  driver: StorageDriver,
  input: { userId: string; category: ScoreBand; templateId: string }
): Promise<void> {
  const state = await driver.read();
  const key = getRecentRoastKey(input.userId, input.category);
  const current = state.recentRoastTemplateIds[key] ?? [];

  await driver.write({
    ...state,
    recentRoastTemplateIds: {
      ...state.recentRoastTemplateIds,
      [key]: [...current.filter((templateId) => templateId !== input.templateId), input.templateId].slice(-10)
    }
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getRecentRoastKey(userId: string, category: ScoreBand): string {
  return `${userId}:${category}`;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseState(value: unknown): StoredState {
  if (!value || typeof value !== "object") {
    return getInitialState();
  }

  const state = value as Partial<StoredState>;

  return {
    users: Array.isArray(state.users) ? state.users : [],
    activeUserId: typeof state.activeUserId === "string" ? state.activeUserId : null,
    visits: Array.isArray(state.visits) ? state.visits : [],
    recentRoastTemplateIds:
      state.recentRoastTemplateIds && typeof state.recentRoastTemplateIds === "object"
        ? state.recentRoastTemplateIds
        : {},
    toastEnabled: typeof state.toastEnabled === "boolean" ? state.toastEnabled : true
  };
}
