import type { VisitRecord } from "@shame-the-web/shared";

type HistoryProps = {
  visits: VisitRecord[];
};

export function History({ visits }: HistoryProps) {
  if (visits.length === 0) {
    return (
      <section className="card">
        <h2>Visit history</h2>
        <p className="muted">No roasts yet. Browse a few sites after signing in locally.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Visit history</h2>
      <div className="history-list">
        {visits.map((visit) => (
          <article className="history-item" key={visit.id}>
            <div>
              <strong>{visit.hostname}</strong>
              <p>{visit.roast.message}</p>
            </div>
            <span>{visit.speedScore100}/100</span>
          </article>
        ))}
      </div>
    </section>
  );
}
