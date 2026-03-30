## Summary

Adds **Mermaid Iconify** to the Obsidian Community Plugins directory.

- **id**: `mermaid-iconify`
- **name**: `Mermaid Iconify`
- **author**: `Joao`
- **repo**: `JFSF/Mermaid-Iconify`

## Description

Discover, enable, and use Iconify icon packs in Mermaid diagrams inside Obsidian.

## Checklist

- [x] I have read the community plugin submission guide
- [x] The repository contains `README.md`, `LICENSE`, and `manifest.json`
- [x] The GitHub release tag matches the plugin version
- [x] The release includes `main.js`, `manifest.json`, and `styles.css`
- [x] The plugin `id` does not contain `obsidian`
- [x] Network usage is disclosed in the README
- [x] The plugin does not include telemetry, ads, or tracking

## Community plugins entry

```json
{
  "id": "mermaid-iconify",
  "name": "Mermaid Iconify",
  "author": "Joao",
  "description": "Discover, enable, and use Iconify icon packs in Mermaid diagrams inside Obsidian.",
  "repo": "JFSF/Mermaid-Iconify"
}
```

## Notes for reviewers

This plugin adds support for discovering and registering external Iconify icon packs for Mermaid usage inside Obsidian.

It uses Obsidian's `requestUrl` for network requests and discloses external network usage in the README.

External requests are used only for:
- catalog discovery
- icon listing
- SVG preview rendering
- Mermaid icon pack registration

No note content or vault content is sent to external services.
