# Submission notes

This package is arranged to match the Obsidian community plugin submission flow.

## Repository files

Present in repository root:

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`
- `package.json`
- `package-lock.json`
- `src/main.ts`
- `styles.css`

## Release assets

Use the build output for the GitHub release binary attachments:

- `main.js`
- `manifest.json`
- `styles.css`

## Notes

- Plugin id is `mermaid-iconify` and does not contain `obsidian`.
- Network use is disclosed in `README.md`.
- Plugin code uses `requestUrl` for JSON API calls.
- Do not commit `main.js`, `node_modules`, or `release-assets` to the repository.
