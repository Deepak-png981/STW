import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { UserProfile, VisitRecord } from "@shame-the-web/shared";
import { designTokensAsCssVariables } from "@shame-the-web/shared";
import brandLogoUrl from "url:../dashboard/public/Tlogo.png";

import { chromeStorageDriver, createUser, getActiveUser, getState, loginUser } from "./src/lib/storage";
import { getSiteDisplayName } from "./src/lib/site-display-name";

const dashboardBaseUrl = process.env.PLASMO_PUBLIC_DASHBOARD_URL ?? "https://shametheweb.com";

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const recentVisits = useMemo(() => visits.slice(-3).reverse(), [visits]);

  useEffect(() => {
    void refreshState();
  }, []);

  async function refreshState() {
    setLoading(true);
    const [nextActiveUser, state] = await Promise.all([
      getActiveUser(chromeStorageDriver),
      getState(chromeStorageDriver)
    ]);
    setActiveUser(nextActiveUser);
    setVisits(
      nextActiveUser ? state.visits.filter((visit) => visit.userId === nextActiveUser.id) : []
    );
    setLoading(false);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Name and email are required.");
      return;
    }

    const existingUser = await loginUser(chromeStorageDriver, trimmedEmail);
    if (!existingUser) {
      await createUser(chromeStorageDriver, { name: trimmedName, email: trimmedEmail });
    }

    setName("");
    setEmail("");
    await refreshState();
  }

  function openDashboard() {
    void chrome.tabs.create({ url: `${dashboardBaseUrl}/dashboard` });
  }

  if (loading) {
    return (
      <main className="stw-popup stw-loading">
        <style>{styles}</style>
        <div className="stw-skeleton stw-skeleton-brand" aria-hidden />
        <div className="stw-skeleton stw-skeleton-line stw-skeleton-line--short" />
        <div className="stw-skeleton stw-skeleton-line" />
        <div className="stw-skeleton stw-skeleton-card" />
      </main>
    );
  }

  const latest = recentVisits[0];

  return (
    <main className="stw-popup">
      <style>{styles}</style>
      <header className="stw-brand-row">
        <img className="stw-brand-logo" src={brandLogoUrl} alt="Shame The Web" />
      </header>
      {activeUser ? (
        <>
          <div className="stw-user-block">
            <p className="stw-eyebrow">Signed in locally</p>
            <h1 className="stw-greeting">Hi, {activeUser.name}</h1>
            <p className="stw-muted stw-email">{activeUser.email}</p>
          </div>
          {latest ? (
            <article className="stw-hero-card" aria-label="Latest site score">
              <div className="stw-hero-top">
                <div className="stw-site-block">
                  <span className="stw-site-label">Last roast</span>
                  <h2 className="stw-site-name">{getSiteDisplayName(latest)}</h2>
                  <p className="stw-site-host">{latest.hostname}</p>
                </div>
                <div className="stw-score-ring" aria-hidden>
                  <span className="stw-score-ring__value">{latest.speedScore100}</span>
                </div>
              </div>
              <p className="stw-score-caption">
                Speed score <strong>{latest.speedScore100}</strong>
                <span className="stw-score-caption__denom">/100</span>
              </p>
              <blockquote className="stw-roast-comment">{latest.roast.message}</blockquote>
              {latest.roast.subline ? <p className="stw-roast-subline">{latest.roast.subline}</p> : null}
            </article>
          ) : (
            <p className="stw-muted stw-empty-hint">Visit a site to collect your first roast.</p>
          )}
          {recentVisits.length > 1 ? (
            <section className="stw-recent-section" aria-label="Recent visits">
              <h3 className="stw-recent-heading">Recent</h3>
              <ul className="stw-recent-list">
                {recentVisits.slice(1).map((visit) => (
                  <li key={visit.id} className="stw-recent-row">
                    <div className="stw-recent-row__text">
                      <span className="stw-recent-row__name">{getSiteDisplayName(visit)}</span>
                      <span className="stw-recent-row__host">{visit.hostname}</span>
                    </div>
                    <span className="stw-score-chip">{visit.speedScore100}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <button className="stw-button stw-button-primary" type="button" onClick={openDashboard}>
            Open dashboard
          </button>
        </>
      ) : (
        <>
          <p className="stw-eyebrow">Local profile</p>
          <h1>Shame The Web</h1>
          <form className="stw-form" onSubmit={handleAuthSubmit}>
            <label className="stw-form">
              Name
              <input
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <label className="stw-form">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </label>
            <button className="stw-button stw-button-dark" type="submit">
              Sign up / log in
            </button>
          </form>
          <p className="stw-error">{error}</p>
        </>
      )}
    </main>
  );
}

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Kablammo&display=swap");

${designTokensAsCssVariables()}

body {
  margin: 0;
  background: var(--stw-app-background);
}

.stw-popup {
  border: 3px solid var(--stw-shell-outline);
  border-radius: var(--stw-radius-xl);
  box-sizing: border-box;
  min-width: 340px;
  max-width: 380px;
  padding: var(--stw-space-card) var(--stw-space-compact) var(--stw-space-section);
  display: grid;
  gap: var(--stw-space-compact);
  color: var(--stw-text-primary-light);
  background: var(--stw-main-surface);
  font-family: var(--stw-font-family);
}

.stw-loading {
  min-height: 200px;
  place-content: start;
  gap: var(--stw-space-tight);
}

.stw-skeleton {
  border-radius: var(--stw-radius-medium);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--stw-border-subtle) 65%, var(--stw-main-surface)) 0%,
    var(--stw-card-surface-light) 50%,
    color-mix(in srgb, var(--stw-border-subtle) 65%, var(--stw-main-surface)) 100%
  );
  background-size: 200% 100%;
  animation: stw-shimmer 1.1s ease-in-out infinite;
}

.stw-skeleton-brand {
  height: 48px;
  border-radius: var(--stw-radius-pill);
}

.stw-skeleton-line {
  height: 14px;
}

.stw-skeleton-line--short {
  width: 42%;
}

.stw-skeleton-card {
  height: 140px;
  border-radius: var(--stw-radius-card);
}

@keyframes stw-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.stw-brand-row {
  align-items: center;
  background: var(--stw-accent-lime);
  border-radius: var(--stw-radius-pill);
  display: flex;
  justify-content: center;
  padding: var(--stw-space-tight) var(--stw-space-card);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 35%, transparent);
}

.stw-brand-logo {
  height: 26px;
  object-fit: contain;
  width: 162px;
}

.stw-user-block {
  display: grid;
  gap: 2px;
  padding-top: 2px;
}

.stw-greeting {
  font-family: var(--stw-font-display);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0;
}

.stw-email {
  font-size: 0.82rem;
}

.stw-eyebrow {
  color: var(--stw-accent-muted-olive);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  margin: 0;
  text-transform: uppercase;
}

.stw-muted {
  color: var(--stw-text-secondary-light);
  margin: 0;
}

.stw-empty-hint {
  padding: var(--stw-space-tight) 0;
  text-align: center;
  font-size: 0.88rem;
}

.stw-hero-card {
  background: var(--stw-card-surface-light);
  border: 1px solid var(--stw-border-subtle);
  border-radius: var(--stw-radius-card);
  box-shadow:
    0 1px 0 color-mix(in srgb, white 70%, transparent) inset,
    0 12px 28px color-mix(in srgb, var(--stw-shell-outline) 12%, transparent);
  display: grid;
  gap: var(--stw-space-tight);
  padding: var(--stw-space-card);
}

.stw-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--stw-space-compact);
}

.stw-site-block {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.stw-site-label {
  color: var(--stw-accent-muted-olive);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.stw-site-name {
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stw-site-host {
  color: var(--stw-text-secondary-light);
  font-size: 0.72rem;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stw-score-ring {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--stw-accent-lime);
  border: 2px solid var(--stw-shell-outline);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 0 color-mix(in srgb, var(--stw-shell-outline) 22%, transparent);
}

.stw-score-ring__value {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.stw-score-caption {
  font-size: 0.8rem;
  color: var(--stw-text-secondary-light);
  margin: 0;
}

.stw-score-caption strong {
  color: var(--stw-text-primary-light);
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.stw-score-caption__denom {
  font-weight: 600;
  opacity: 0.85;
}

.stw-roast-comment {
  background: color-mix(in srgb, var(--stw-accent-lime) 38%, white);
  border: 1px solid color-mix(in srgb, var(--stw-accent-muted-olive) 45%, var(--stw-border-subtle));
  border-radius: var(--stw-radius-medium);
  color: var(--stw-text-primary-light);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  margin: 0;
  padding: var(--stw-space-compact) var(--stw-space-card);
  quotes: none;
}

.stw-roast-subline {
  color: var(--stw-accent-muted-olive);
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
}

.stw-recent-section {
  display: grid;
  gap: var(--stw-space-tight);
}

.stw-recent-heading {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
  color: var(--stw-text-secondary-light);
}

.stw-recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--stw-space-micro);
}

.stw-recent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--stw-space-compact);
  padding: var(--stw-space-tight) var(--stw-space-compact);
  background: color-mix(in srgb, var(--stw-card-surface-light) 88%, var(--stw-main-surface));
  border: 1px solid var(--stw-border-subtle);
  border-radius: var(--stw-radius-medium);
}

.stw-recent-row__text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.stw-recent-row__name {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stw-recent-row__host {
  font-size: 0.68rem;
  color: var(--stw-text-secondary-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stw-score-chip {
  flex-shrink: 0;
  min-width: 38px;
  text-align: center;
  padding: 0.2rem 0.45rem;
  border-radius: var(--stw-radius-pill);
  background: var(--stw-accent-soft-purple);
  color: var(--stw-text-primary-light);
  font-size: 0.78rem;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--stw-shell-outline) 18%, transparent);
}

.stw-form {
  display: grid;
  gap: 0.45rem;
}

.stw-popup input {
  border: 1px solid var(--stw-border-subtle);
  border-radius: var(--stw-radius-medium);
  font: inherit;
  padding: 0.55rem 0.7rem;
}

.stw-popup h1:not(.stw-greeting) {
  font-size: 1.3rem;
  letter-spacing: -0.02em;
  margin: 0;
  font-family: var(--stw-font-display);
  font-weight: 400;
}

.stw-button {
  border: 0;
  border-radius: var(--stw-radius-pill);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 44px;
  padding: 0.65rem 0.9rem;
  transition:
    background var(--stw-motion-standard-ms) var(--stw-motion-easing),
    transform var(--stw-motion-standard-ms) var(--stw-motion-easing),
    box-shadow var(--stw-motion-standard-ms) var(--stw-motion-easing);
}

.stw-button:active {
  transform: translateY(1px);
}

.stw-button-primary {
  background: var(--stw-accent-lime);
  color: var(--stw-text-primary-light);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--stw-shell-outline) 25%, transparent);
  border: 2px solid var(--stw-shell-outline);
}

.stw-button-primary:hover {
  filter: brightness(1.03);
}

.stw-button-dark {
  background: var(--stw-card-surface-dark);
  color: var(--stw-text-primary-dark);
  box-shadow: 0 3px 0 color-mix(in srgb, var(--stw-shell-outline) 35%, transparent);
}

.stw-button-dark:hover {
  filter: brightness(1.08);
}

.stw-error {
  color: #b91c1c;
  margin: 0;
  min-height: 18px;
}
`;
