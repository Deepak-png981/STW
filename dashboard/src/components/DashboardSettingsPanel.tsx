import { useCallback, useState } from "react";
import type { KnowledgeImportMode } from "@shame-the-web/shared";

import { requestBridge } from "../lib/bridge";

const ENCRYPTED_PACK_EXTENSION = ".stw.enc";

export function DashboardSettingsPanel() {
  const [importMode, setImportMode] = useState<KnowledgeImportMode>("merge");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState("");

  const exportKnowledge = useCallback(async () => {
    if (encryptExport && exportPassphrase.length === 0) {
      setTransferMessage("Enter a passphrase or turn off encryption before exporting.");
      return;
    }
    setTransferBusy(true);
    try {
      const response = await requestBridge(
        "exportKnowledgeGraph",
        encryptExport ? { passphrase: exportPassphrase } : undefined
      );
      const blob = new Blob([response.data.json], {
        type: response.data.encrypted ? "application/octet-stream" : "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      const suffix = response.data.encrypted ? " (encrypted)" : "";
      setTransferMessage(
        `Exported ${response.data.pageCount} pages and ${response.data.edgeCount} graph connections${suffix}.`
      );
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setTransferBusy(false);
    }
  }, [encryptExport, exportPassphrase]);

  const importKnowledge = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      const isEncrypted = file.name.endsWith(ENCRYPTED_PACK_EXTENSION);
      const passphrase = isEncrypted
        ? window.prompt("This pack is encrypted. Enter its passphrase to import:") ?? ""
        : "";
      if (isEncrypted && passphrase.length === 0) {
        setTransferMessage("Import cancelled: a passphrase is required for encrypted packs.");
        event.target.value = "";
        return;
      }
      setTransferBusy(true);
      setTransferMessage("Importing knowledge graph…");
      try {
        const fileContents = await file.text();
        const response = await requestBridge("importKnowledgeGraph", {
          fileContents,
          mode: importMode,
          ...(isEncrypted ? { passphrase } : {})
        });
        setTransferMessage(
          `Imported ${response.data.importedPageCount} pages (${response.data.mode}). Re-indexing will run in the background.`
        );
      } catch (error) {
        setTransferMessage(error instanceof Error ? error.message : "Import failed.");
      } finally {
        setTransferBusy(false);
        event.target.value = "";
      }
    },
    [importMode]
  );

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

        <fieldset className="dashboard-settings-encrypt">
          <legend>Encryption</legend>
          <label>
            <input
              type="checkbox"
              checked={encryptExport}
              onChange={(event) => setEncryptExport(event.target.checked)}
            />
            <span>Encrypt this export with a passphrase</span>
          </label>
          {encryptExport ? (
            <>
              <input
                type="password"
                className="dashboard-settings-passphrase"
                placeholder="Passphrase"
                autoComplete="new-password"
                value={exportPassphrase}
                onChange={(event) => setExportPassphrase(event.target.value)}
              />
              <p className="bridge-status dashboard-settings-warning">
                The pack is encrypted on this device with AES-256-GCM. The passphrase is never stored or sent
                anywhere — if you lose it, the pack is unrecoverable.
              </p>
            </>
          ) : null}
        </fieldset>

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
            accept=".json,.stw.json,.stw.enc,.enc"
            onChange={(event) => void importKnowledge(event)}
            disabled={transferBusy}
          />
        </label>
      </div>

      {transferMessage ? <p className="bridge-status">{transferMessage}</p> : null}
    </section>
  );
}
