import { chromeStorageDriver, getActiveUser, getState } from "../lib/storage";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Options root was not found.");
}

void renderOptions();

async function renderOptions() {
  const [activeUser, state] = await Promise.all([
    getActiveUser(chromeStorageDriver),
    getState(chromeStorageDriver)
  ]);

  app.innerHTML = `
    <style>${styles}</style>
    <main class="shell">
      <p class="eyebrow">Shame The Web</p>
      <h1>Local extension data</h1>
      <section class="card">
        <h2>Active user</h2>
        <p>${activeUser ? `${escapeHtml(activeUser.name)} (${escapeHtml(activeUser.email)})` : "No active user yet."}</p>
      </section>
      <section class="card">
        <h2>Local totals</h2>
        <p>${state.users.length} user profile(s)</p>
        <p>${state.visits.length} visit record(s)</p>
      </section>
    </main>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character] ?? character;
  });
}

const styles = `
  body {
    margin: 0;
    color: #1f160f;
    background: #fff8ef;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .shell {
    display: grid;
    gap: 1rem;
    margin: 0 auto;
    max-width: 760px;
    padding: 2rem;
  }

  .eyebrow {
    color: #b45309;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    margin: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  .card {
    background: white;
    border: 1px solid #ead8c2;
    border-radius: 1rem;
    display: grid;
    gap: 0.5rem;
    padding: 1rem;
  }
`;
