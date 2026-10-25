# Changelog

## [v4.6.130] - 2026-10-25

Restyle of the Chrome "PDF Viewer" extension (stock PDF.js viewer, v4.6.129). No change to PDF rendering; `viewer.mjs`, `content/build/*` and `locale/*` are untouched.

### Added
- `content/web/modern.css` (loaded after `viewer.css`): light/dark design tokens, frosted-glass surfaces, rounded raised cards, spring easing, and entrance/hover/press animations (all gated on `prefers-reduced-motion`).
- Vertical floating toolbar rail on the left (navigation, zoom, editing, print/save/tools) replacing the top bar; zoom is an icon with a short label and a styled dropdown.
- Floating frosted sidebar panel that peeks on hover over the sidebar button (click pins it); thumbnails are raised cards with an accent outline when selected.
- `content/web/modern.js`: press ripple, sliding segmented pill, page-number pill while scrolling, zoom pulse and label, hover-peek sidebar, and alignment of editor option panels to their rail button (DOM-only, no pdf.js globals).
- Restyled options page (card layout, switches, styled selects).
- New extension icon (`icon.svg`, rendered to `icon16/48/128.png`).

### Changed
- Find bar moved to the top-right as frosted glass; Tools menu and editor option panels sized to their content and placed beside the rail.
- One system-UI font stack across toolbar, panels and dialogs.
- Page cards are borderless with rounded corners and soft shadows; loading bar moved to a 2px accent strip.

### Removed
- `_metadata/` (store signature hashes) and `update_url` in `manifest.json`, so local edits are not overwritten by the store.
