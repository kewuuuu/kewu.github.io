# Changelog

## 2026-03-19

### Site architecture
- Added layout inheritance structure:
  - `layouts/base.njk` as common base layout with shared header and global assets.
  - `layouts/home.njk` for home page.
  - `layouts/post.njk` for post pages.
- Updated routing defaults:
  - Home uses `layouts/home.njk`.
  - Posts use `layouts/post.njk`.
- Added `pathToRoot` filter in `.eleventy.js` to normalize relative asset paths by page depth.

### Markdown and rendering pipeline
- Extended markdown processing in `.eleventy.js`:
  - Custom image handling with metadata support from title syntax:
    - `img:align=...;mode=...;width=...;height=...;scale=...;ratio=...`
  - Default image attributes and module data attributes are injected during markdown render.
  - Standalone image paragraphs are converted to `<figure class="image-module">...`.
- Added heading id generation for heading anchors.
- Added TOC extraction filter `extractToc` with heading level range support.
- Improved TOC hierarchy data by computing semantic `depth` based on real heading nesting.

### Image display module
- Added reusable image module styles and behavior:
  - Alignment: left / center / right.
  - Size modes: `responsive`, `fixed`, `scale`, `responsive-scale` (default 50%).
- Added full-screen image viewer:
  - 50% black overlay background.
  - Wheel zoom, drag-to-pan, top-right close button, click overlay to close.
- Added global image viewer script include in base layout.

### Post page layout and TOC UX
- Implemented post page as a 3-column system:
  - Left: TOC.
  - Center: article content.
  - Right: reserved empty panel.
- Added two draggable splitters (left and right).
- Added collapse/expand buttons for both left and right side panels.
- Widths are responsive and persisted via `localStorage`.
- Added ratio-driven mode switching:
  - Landscape (`width > height`): normal left TOC column mode.
  - Portrait (`height > width`): left column removed, TOC moved above article content in main column; right panel remains.

### TOC interactions
- TOC now includes `h2` to `h4`.
- Added collapsible sub-tree interaction:
  - Parent items show expand/collapse arrow.
  - Child headings can be hidden/shown.
- Added consistent alignment for TOC text:
  - Every TOC row reserves toggle-space, even when no children exist.

### Styling updates
- Added global stable scrollbar gutter to reduce layout shift:
  - `html { scrollbar-gutter: stable; }`
- Removed borders from the three main post columns on request.
- Added text wrapping constraints in article content area to prevent overflow:
  - `overflow-wrap: anywhere; word-break: break-word;`
  - `pre` blocks keep horizontal scrolling behavior.

### Build outputs and assets
- Added new frontend asset:
  - `src/assets/post-layout.js`
- Updated static output generation through regular Eleventy build (`docs`).

