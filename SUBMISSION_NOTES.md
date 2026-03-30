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

Use the release assets generated from the build for the GitHub release binary attachments:

- `main.js`
- `manifest.json`
- `styles.css`

## Notes

- Plugin id is `mermaid-iconify` and does not contain `obsidian`.
- Plugin name avoids the redundant `Obsidian` prefix.
- Network use is disclosed in `README.md`.
- Plugin code uses `requestUrl` for JSON API calls.
