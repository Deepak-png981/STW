import type { VisitRecord } from "@shame-the-web/shared";

type HistoryProps = {
  visits: VisitRecord[];
};

function getDisplayTitle(visit: VisitRecord): string {
  const t = visit.title?.trim();
  if (t && t.toLowerCase() !== visit.hostname.toLowerCase()) {
    return t;
  }
  return visit.hostname;
}

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
        {visits.map((visit) => {
          const title = getDisplayTitle(visit);
          const showHost = title !== visit.hostname;
          return (
            <article className="history-item" key={visit.id}>
              <div className="history-item__text">
                <strong title={visit.url}>{title}</strong>
                {showHost ? <span className="history-item__host">{visit.hostname}</span> : null}
                <p>{visit.roast.message}</p>
              </div>
              <span>{visit.speedScore100}/100</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
