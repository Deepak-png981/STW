# Export/Import End-to-End Checklist

See also: [Documentation index](./README.md) · [Local AI and search](./local-ai-and-search.md) (re-embed after import)

## Preconditions

- Extension installed and enabled in both source and target browser profiles.
- Dashboard reachable at `https://shametheweb.com` (or local dashboard origin).
- Source profile contains indexed pages in knowledge graph.

## 1. Source export

1. Open dashboard in source profile.
2. In **Knowledge graph transfer**, click **Export graph**.
3. Confirm a `.stw.json` file downloads.
4. Confirm UI message reports exported page and edge counts.

## 2. Target import

1. Open dashboard in target profile (fresh install).
2. In **Knowledge graph transfer**, choose import mode:
   - `Merge` for additive import
   - `Replace all` to overwrite local graph pages
3. Select exported file.
4. Confirm UI shows import completion message.

## 3. Re-embed + readiness

1. Watch local AI status line:
   - `Importing knowledge graph...`
   - `Downloading local embedding model...` (if needed)
   - `Indexing your pages (x/y)...`
   - `Local semantic search is ready.`
2. Confirm graph node count reflects imported dataset.

## 4. Functional verification

1. Run semantic search on imported topics and confirm relevant pages return.
2. Ask a local chat follow-up and verify answer references imported sources.
3. Repeat import with `Replace all` and verify old-only pages disappear.

## 5. Failure paths

1. Import malformed JSON and verify UI shows validation error.
2. Import oversized payload (>50MB) and verify rejection.
3. Disable extension and verify dashboard bridge error behavior remains intact.
