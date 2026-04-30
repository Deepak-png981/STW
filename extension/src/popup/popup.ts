import { chromeStorageDriver, createUser, getActiveUser, getState, loginUser } from "../lib/storage";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Popup root was not found.");
}

void renderPopup();

async function renderPopup() {
  const [activeUser, state] = await Promise.all([
    getActiveUser(chromeStorageDriver),
    getState(chromeStorageDriver)
  ]);

  if (activeUser) {
    const visits = state.visits
      .filter((visit) => visit.userId === activeUser.id)
      .slice(-3)
      .reverse();
    const latestVisit = visits[0];

    app.innerHTML = `
      <style>${styles}</style>
      <section class="panel">
        <p class="eyebrow">Signed in locally</p>
        <h1>Hi, ${escapeHtml(activeUser.name)}</h1>
        <p class="muted">${escapeHtml(activeUser.email)}</p>
        ${
          latestVisit
            ? `<article class="score-card">
                <span>${escapeHtml(latestVisit.hostname)}</span>
                <strong>${latestVisit.speedScore100}/100</strong>
                <small>${escapeHtml(latestVisit.roast.message)}</small>
              </article>`
            : `<p class="muted">Visit a site to collect your first roast.</p>`
        }
        <div class="recent">
          ${visits.map((visit) => `<span>${escapeHtml(visit.hostname)}: ${visit.speedScore100}/100</span>`).join("")}
        </div>
        <button id="open-dashboard" type="button">Open dashboard</button>
      </section>
    `;

    document.querySelector("#open-dashboard")?.addEventListener("click", () => {
      void chrome.tabs.create({ url: "http://localhost:5173/" });
    });
    return;
  }

  app.innerHTML = `
    <style>${styles}</style>
    <section class="panel">
      <p class="eyebrow">Local profile</p>
      <h1>Shame The Web</h1>
      <form id="signup-form">
        <label>
          Name
          <input name="name" autocomplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autocomplete="email" required />
        </label>
        <button type="submit">Sign up / log in</button>
      </form>
      <p id="error" class="error" role="alert"></p>
    </section>
  `;

  document.querySelector<HTMLFormElement>("#signup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }

    const existingUser = await loginUser(chromeStorageDriver, email);
    if (!existingUser) {
      await createUser(chromeStorageDriver, { name, email });
    }

    await renderPopup();
  });
}

function setError(message: string) {
  const error = document.querySelector<HTMLParagraphElement>("#error");
  if (error) {
    error.textContent = message;
  }
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
    min-width: 280px;
    color: #1f160f;
    background: #fff8ef;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .panel {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .eyebrow {
    color: #b45309;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    margin: 0;
    text-transform: uppercase;
  }

  h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  .muted {
    color: #735f50;
    margin: 0;
  }

  .score-card {
    background: white;
    border: 1px solid #ead8c2;
    border-radius: 0.9rem;
    display: grid;
    gap: 0.25rem;
    padding: 0.75rem;
  }

  .score-card strong {
    font-size: 1.35rem;
  }

  .score-card small,
  .recent {
    color: #735f50;
  }

  .recent {
    display: grid;
    gap: 0.25rem;
    font-size: 0.78rem;
  }

  form,
  label {
    display: grid;
    gap: 0.4rem;
  }

  input {
    border: 1px solid #ead8c2;
    border-radius: 0.6rem;
    font: inherit;
    padding: 0.55rem 0.65rem;
  }

  button {
    border: 0;
    border-radius: 0.7rem;
    background: #1f160f;
    color: #fff8ef;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.65rem 0.8rem;
  }

  .error {
    color: #b91c1c;
    min-height: 1rem;
    margin: 0;
  }
`;
