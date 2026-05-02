import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { designTokensAsCssVariables } from "@shame-the-web/shared";
import iconDataUrl from "data-base64:../../dashboard/public/favicon/web-app-manifest-192x192.png";
import brandLogoUrl from "url:../../dashboard/public/Tlogo.png";

import { createUser, loginUser, chromeStorageDriver } from "../src/lib/storage";

const dashboardBaseUrl = process.env.PLASMO_PUBLIC_DASHBOARD_URL ?? "https://shametheweb.com";

export default function WelcomeTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Create your local profile to start tracking.");

  useEffect(() => {
    document.title = "Welcome | Shame The Web";

    let iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "icon";
      document.head.appendChild(iconLink);
    }

    iconLink.href = iconDataUrl;
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setStatus("Name and email are required.");
      return;
    }

    const existingUser = await loginUser(chromeStorageDriver, trimmedEmail);
    if (!existingUser) {
      await createUser(chromeStorageDriver, { name: trimmedName, email: trimmedEmail });
      setStatus("Local profile created. Open the dashboard to view your stats.");
    } else {
      setStatus(`Welcome back, ${existingUser.name}. Your local profile is active.`);
    }
  }

  return (
    <main className="stw-welcome-page">
      <style>{styles}</style>
      <section className="stw-welcome-card">
        <header className="stw-welcome-brand">
          <img src={brandLogoUrl} alt="Shame The Web" className="stw-welcome-logo" />
        </header>
        <h1>Welcome to Shame The Web</h1>
        <p className="stw-muted">A playful performance coach for your browser.</p>
        <form className="stw-form" onSubmit={handleSubmit}>
          <label className="stw-form">
            Name
            <input
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <label className="stw-form">
            Email
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </label>
          <button className="stw-button stw-button-dark" type="submit">
            Save local profile
          </button>
        </form>
        <p className="stw-muted">{status}</p>
        <button
          className="stw-button stw-button-primary"
          type="button"
          onClick={() => void chrome.tabs.create({ url: `${dashboardBaseUrl}/dashboard` })}
        >
          Open dashboard
        </button>
      </section>
    </main>
  );
}

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Kablammo&display=swap");

${designTokensAsCssVariables()}

body {
  margin: 0;
}

.stw-welcome-page {
  background: var(--stw-app-background);
  color: var(--stw-text-primary-light);
  display: grid;
  font-family: var(--stw-font-family);
  margin: 0;
  min-height: 100vh;
  padding: 24px;
  place-items: center;
}

.stw-welcome-card {
  background: var(--stw-main-surface);
  border: 4px solid var(--stw-shell-outline);
  border-radius: var(--stw-radius-shell);
  display: grid;
  gap: 12px;
  padding: 24px;
  width: min(560px, 100%);
}

.stw-welcome-brand {
  align-items: center;
  background: var(--stw-accent-lime);
  border-radius: var(--stw-radius-pill);
  display: inline-flex;
  justify-content: center;
  min-height: 48px;
  padding: 8px 18px;
  width: fit-content;
}

.stw-welcome-logo {
  height: 26px;
  width: 166px;
  object-fit: contain;
}

.stw-welcome-card h1 {
  font-family: var(--stw-font-display);
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1;
  margin: 0;
}

.stw-muted {
  color: var(--stw-text-secondary-light);
  margin: 0;
  min-height: 20px;
}

.stw-form {
  display: grid;
  gap: 8px;
}

.stw-welcome-card input {
  border: 1px solid var(--stw-border-subtle);
  border-radius: var(--stw-radius-medium);
  font: inherit;
  padding: 0.6rem 0.75rem;
}

.stw-button {
  border: 0;
  border-radius: var(--stw-radius-pill);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 42px;
  padding: 0.75rem 1rem;
}

.stw-button-dark {
  background: var(--stw-card-surface-dark);
  color: var(--stw-text-primary-dark);
}

.stw-button-primary {
  background: var(--stw-accent-lime);
  color: var(--stw-text-primary-light);
}
`;
