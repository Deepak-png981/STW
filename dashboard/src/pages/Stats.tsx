import type { DashboardStats, VisitRecord } from "@shame-the-web/shared";

type StatsProps = {
  stats: DashboardStats;
  visits: VisitRecord[];
};

export function Stats({ stats, visits }: StatsProps) {
  const categoryRows = buildCategoryRows(visits);

  return (
    <section className="card">
      <h2>Stats</h2>
      <div className="split-grid">
        <p>
          Fastest: <strong>{stats.fastestHost ?? "Not enough data"}</strong>
        </p>
        <p>
          Slowest: <strong>{stats.slowestHost ?? "Not enough data"}</strong>
        </p>
      </div>
      <div className="category-table">
        {categoryRows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.score}/100</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildCategoryRows(visits: VisitRecord[]) {
  const scores = visits.flatMap((visit) => visit.categoryScores);
  const labels = ["speed", "responsiveness", "stability", "polish"] as const;

  return labels.map((label) => {
    const values = scores.filter((score) => score.category === label).map((score) => score.score100);
    const score = values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    return { label, score };
  });
}
