import { useEffect, useState } from "react";

import { summarizeVisits } from "@shame-the-web/shared";
import type { UserProfile, VisitRecord } from "@shame-the-web/shared";

import { requestBridge } from "./lib/bridge";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Stats } from "./pages/Stats";

export function App() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [status, setStatus] = useState("Connecting to extension bridge...");
  const stats = summarizeVisits(visits);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [sessionResponse, visitsResponse] = await Promise.all([
          requestBridge("getSession"),
          requestBridge("getVisits")
        ]);

        if (!isMounted) {
          return;
        }

        setActiveUser(sessionResponse.data.activeUser);
        setVisits(visitsResponse.data.visits.slice().reverse());
        setStatus("Local extension data loaded.");
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : "Unable to connect to extension bridge.");
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="shell">
      <div className="status-bar">{status}</div>
      <Home activeUser={activeUser} stats={stats} />
      <Stats stats={stats} visits={visits} />
      <History visits={visits} />
    </main>
  );
}
