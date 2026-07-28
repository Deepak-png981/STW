import { useCallback, useState } from "react";
import type { KnowledgeImportMode } from "@shame-the-web/shared";

import { requestBridge } from "../lib/bridge";
import { StwToggle } from "./ui/stw-toggle";

const ENCRYPTED_PACK_EXTENSION = ".stw.enc";

type TransferFeedback = {
  kind: "success" | "error" | "info";
  text: string;
};

const importModeOptions: ReadonlyArray<{
  value: KnowledgeImportMode;
  title: string;
  description: string;
  caution?: string;
}> = [
  {
    value: "merge",
    title: "Merge",
    description: "Add imported pages and keep what you already have."
  },
  {
    value: "replace",
    title: "Replace all",
    description: "Remove local pages first, then load the import.",
    caution: "This cannot be undone from the dashboard."
  }
];

export function DashboardSettingsPanel() {
  const [importMode, setImportMode] = useState<KnowledgeImportMode>("merge");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<TransferFeedback | null>(null);
  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState("");

  const exportKnowledge = useCallback(async () => {
    if (encryptExport && exportPassphrase.length === 0) {
      setTransferFeedback({
        kind: "error",
        text: "Enter a passphrase or turn off encryption before exporting."
      });
      return;
    }
    setTransferBusy(true);
    setTransferFeedback({ kind: "info", text: "Preparing export…" });
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
      setTransferFeedback({
        kind: "success",
        text: `Exported ${response.data.pageCount} pages and ${response.data.edgeCount} graph connections${suffix}.`
      });
    } catch (error) {
      setTransferFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Export failed."
      });
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
        ? (window.prompt("This pack is encrypted. Enter its passphrase to import:") ?? "")
        : "";
      if (isEncrypted && passphrase.length === 0) {
        setTransferFeedback({
          kind: "error",
          text: "Import cancelled: a passphrase is required for encrypted packs."
        });
        event.target.value = "";
        return;
      }
      setTransferBusy(true);
      setTransferFeedback({ kind: "info", text: "Importing knowledge graph…" });
      try {
        const fileContents = await file.text();
        const response = await requestBridge("importKnowledgeGraph", {
          fileContents,
          mode: importMode,
          ...(isEncrypted ? { passphrase } : {})
        });
        setTransferFeedback({
          kind: "success",
          text: `Imported ${response.data.importedPageCount} pages (${response.data.mode}). Re-indexing will run in the background.`
        });
      } catch (error) {
        setTransferFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Import failed."
        });
      } finally {
        setTransferBusy(false);
        event.target.value = "";
      }
    },
    [importMode]
  );

  return (
    <section className="section-card dashboard-settings-section">
      <div className="section-heading dashboard-settings-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Knowledge graph backup and restore</h2>
          <p className="dashboard-settings-lede">
            Export saves your local graph data. Import merges or replaces pages, then re-indexes embeddings
            on-device.
          </p>
        </div>
      </div>

      {transferFeedback ? (
        <p
          className={`dashboard-settings-feedback dashboard-settings-feedback--${transferFeedback.kind}`}
          role="status"
          aria-live="polite"
        >
          {transferFeedback.text}
        </p>
      ) : null}

      <div className="dashboard-settings-grid">
        <article className="dashboard-settings-panel">
          <header className="dashboard-settings-panel-head">
            <span className="dashboard-settings-panel-icon" aria-hidden="true">
              ↓
            </span>
            <div>
              <h3>Export</h3>
              <p>Download a JSON pack of your pages and graph edges.</p>
            </div>
          </header>

          <fieldset className="dashboard-settings-fieldset">
            <legend>Encryption</legend>
            <StwToggle
              checked={encryptExport}
              onCheckedChange={setEncryptExport}
              disabled={transferBusy}
              label="Encrypt this export with a passphrase"
              description="Adds AES-256-GCM encryption before download. You will need the passphrase to import."
            />
            {encryptExport ? (
              <div className="dashboard-settings-encrypt-details">
                <input
                  type="password"
                  className="dashboard-settings-passphrase"
                  placeholder="Passphrase"
                  autoComplete="new-password"
                  value={exportPassphrase}
                  onChange={(event) => setExportPassphrase(event.target.value)}
                  disabled={transferBusy}
                />
                <p className="dashboard-settings-note dashboard-settings-warning">
                  Encrypted on this device with AES-256-GCM. The passphrase is never stored — if you lose it, the
                  pack is unrecoverable.
                </p>
              </div>
            ) : null}
          </fieldset>

          <footer className="dashboard-settings-panel-foot">
            <button
              type="button"
              className="button button-primary dashboard-settings-action"
              onClick={() => void exportKnowledge()}
              disabled={transferBusy}
            >
              {transferBusy ? "Working…" : "Export graph"}
            </button>
          </footer>
        </article>

        <article className="dashboard-settings-panel">
          <header className="dashboard-settings-panel-head">
            <span className="dashboard-settings-panel-icon" aria-hidden="true">
              ↑
            </span>
            <div>
              <h3>Import</h3>
              <p>Load a graph pack from disk. Embeddings re-index in the background.</p>
            </div>
          </header>

          <fieldset className="dashboard-settings-fieldset">
            <legend>Import mode</legend>
            <div className="dashboard-settings-mode-grid" role="radiogroup" aria-label="Import mode">
              {importModeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`dashboard-settings-mode-card${
                    importMode === option.value ? " is-selected" : ""
                  }${option.caution ? " is-destructive" : ""}`}
                >
                  <input
                    type="radio"
                    name="settingsImportMode"
                    value={option.value}
                    checked={importMode === option.value}
                    onChange={() => setImportMode(option.value)}
                    disabled={transferBusy}
                  />
                  <span className="dashboard-settings-mode-title">{option.title}</span>
                  <span className="dashboard-settings-mode-copy">{option.description}</span>
                  {option.caution && importMode === option.value ? (
                    <span className="dashboard-settings-mode-caution">{option.caution}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="dashboard-settings-note">
            Accepts <code>.json</code>, <code>.stw.json</code>, and encrypted <code>.stw.enc</code> packs.
          </p>

          <footer className="dashboard-settings-panel-foot">
            <label className="button button-primary dashboard-settings-action dashboard-settings-import-file">
              {transferBusy ? "Working…" : "Choose file to import"}
              <input
                type="file"
                accept=".json,.stw.json,.stw.enc,.enc"
                onChange={(event) => void importKnowledge(event)}
                disabled={transferBusy}
              />
            </label>
          </footer>
        </article>
      </div>
    </section>
  );
}
