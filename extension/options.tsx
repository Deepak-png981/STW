import { useEffect, useState } from "react";

import type { UserProfile } from "@shame-the-web/shared";
import { designTokensAsCssVariables } from "@shame-the-web/shared";
import brandLogoUrl from "url:../dashboard/public/Tlogo.png";

import { chromeStorageDriver, getActiveUser, getState } from "./src/lib/storage";

type Totals = {
  users: number;
  visits: number;
};

export default function OptionsPage() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [totals, setTotals] = useState<Totals>({ users: 0, visits: 0 });

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    const [nextActiveUser, state] = await Promise.all([
      getActiveUser(chromeStorageDriver),
      getState(chromeStorageDriver)
    ]);
    setActiveUser(nextActiveUser);
    setTotals({ users: state.users.length, visits: state.visits.length });
  }

  return (
    <main className="stw-options-shell">
      <style>{styles}</style>
      <header className="stw-options-header">
        <img src={brandLogoUrl} alt="Shame The Web" className="stw-options-logo" />
      </header>
      <p className="stw-eyebrow">Shame The Web</p>
      <h1>Local extension data</h1>
      <section className="stw-options-card">
        <h2>Active user</h2>
        <p>
          {activeUser ? `${activeUser.name} (${activeUser.email})` : "No active user yet."}
        </p>
      </section>
      <section className="stw-options-card">
        <h2>Local totals</h2>
        <p>{totals.users} user profile(s)</p>
        <p>{totals.visits} visit record(s)</p>
      </section>
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

.stw-options-shell {
  color: var(--stw-text-primary-light);
  display: grid;
  gap: 1rem;
  margin: 0 auto;
  max-width: 760px;
  padding: 2rem;
  font-family: var(--stw-font-family);
}

.stw-options-header {
  align-items: center;
  background: var(--stw-accent-lime);
  border-radius: var(--stw-radius-card);
  display: inline-flex;
  justify-content: center;
  min-height: 56px;
  padding: 10px 16px;
  width: max-content;
}

.stw-options-logo {
  height: 26px;
  object-fit: contain;
  width: 166px;
}

.stw-eyebrow {
  color: var(--stw-accent-muted-olive);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
}

.stw-options-shell h1,
.stw-options-shell h2,
.stw-options-shell p {
  margin: 0;
}

.stw-options-shell h1 {
  font-family: var(--stw-font-display);
  font-weight: 400;
  letter-spacing: -0.03em;
}

.stw-options-shell p {
  color: var(--stw-text-secondary-light);
}

.stw-options-card {
  background: var(--stw-card-surface-light);
  border: 1px solid var(--stw-border-subtle);
  border-radius: var(--stw-radius-card);
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
}
`;
