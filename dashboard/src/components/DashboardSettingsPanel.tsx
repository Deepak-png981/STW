import { useCallback, useState } from "react";
import type { KnowledgeImportMode } from "@shame-the-web/shared";

import { requestBridge } from "../lib/bridge";

export function DashboardSettingsPanel() {
  const [importMode, setImportMode] = useState<KnowledgeImportMode>("merge");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");

  const exportKnowledge = useCallback(async () => {
    setTransferBusy(true);
    try {
      const response = await requestBridge("exportKnowledgeGraph");
      const blob = new Blob([response.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setTransferMessage(
        `Exported ${response.data.pageCount} pages and ${response.data.edgeCount} graph connections.`
      );
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setTransferBusy(false);
    }
  }, []);

  const importKnowledge = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setTransferBusy(true);
    setTransferMessage("Importing knowledge graph…");
    try {
      const fileContents = await file.text();
      const response = await requestBridge("importKnowledgeGraph", { fileContents, mode: importMode });
      setTransferMessage(`Imported ${response.data.importedPageCount} pages (${response.data.mode}). Re-indexing will run in the background.`);
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setTransferBusy(false);
      event.target.value = "";
    }
  }, [importMode]);

  return (
    <section className="section-card dashboard-settings-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Knowledge graph backup and restore</h2>
          <p className="bridge-status">
            Export saves your local graph data. Import merges or replaces pages, then re-indexes embeddings on-device.
          </p>
        </div>
      </div>

      <div className="dashboard-settings-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => void exportKnowledge()}
          disabled={transferBusy}
        >
          Export graph
        </button>

        <fieldset className="dashboard-settings-import-mode">
          <legend>Import mode</legend>
          <label>
            <input
              type="radio"
              name="settingsImportMode"
              checked={importMode === "merge"}
              onChange={() => setImportMode("merge")}
            />
            <span>Merge with existing pages</span>
          </label>
          <label>
            <input
              type="radio"
              name="settingsImportMode"
              checked={importMode === "replace"}
              onChange={() => setImportMode("replace")}
            />
            <span>Replace all local pages</span>
          </label>
        </fieldset>

        <label className="dashboard-settings-import-file button button-secondary">
          Import graph file
          <input
            type="file"
            accept=".json,.stw.json"
            onChange={(event) => void importKnowledge(event)}
            disabled={transferBusy}
          />
        </label>
      </div>

      {transferMessage ? <p className="bridge-status">{transferMessage}</p> : null}
    </section>
  );
}
