import type { DashboardStats, UserProfile } from "@shame-the-web/shared";

type HomeProps = {
  activeUser: UserProfile | null;
  stats: DashboardStats;
};

export function Home({ activeUser, stats }: HomeProps) {
  return (
    <section className="hero">
      <p className="eyebrow">Local dashboard</p>
      <h1>Shame The Web</h1>
      <p>
        {activeUser
          ? `Tracking locally for ${activeUser.name}.`
          : "Open the extension popup and create a local profile to start tracking."}
      </p>
      <div className="stat-grid">
        <StatCard label="Visits" value={stats.totalVisits} />
        <StatCard label="Unique sites" value={stats.uniqueHosts} />
        <StatCard label="Avg speed" value={`${stats.averageSpeedScore100}/100`} />
        <StatCard label="Avg overall" value={`${stats.averageOverallScore100}/100`} />
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
