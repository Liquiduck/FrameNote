# FrameNote

FrameNote is a high-precision, client-side screenshot annotation studio designed for software engineers, product designers, and technical reviewers. FrameNote provides a frictionless workflow: **Upload a screenshot → annotate with precision → export high-resolution PNGs** with optional formatted feedback notes.

All operations occur strictly in the browser. Uploaded images never leave your local machine.

---

## Screenshot


<img width="1919" height="942" alt="image" src="https://github.com/user-attachments/assets/c0b8dd75-1d60-46de-ac52-8a482c1f2200" />

---

## Core Features

- **Local Image Loading**: Instant client-side loading via drag-and-drop, native file browser, or a bundled landing page sample asset.
- **Strict Image-Space Coordinate System**: All annotation geometry is computed and stored in unscaled native image coordinates. Annotations never drift, blur, or distort regardless of browser viewport size or zoom scale.
- **Interactive Annotation Tools**:
  - **Select & Move (<kbd>V</kbd>)**: Topmost hit testing, non-drifting translation with boundary clamping, and single-action history tracking.
  - **Rectangle (<kbd>R</kbd>)**: Normalized all-direction drawing, minimum screen-drag threshold, and customizable stroke presets.
  - **Arrow (<kbd>A</kbd>)**: Tail-to-tip directional vectors with mathematically shared arrowhead geometry calculation between SVG and Canvas.
  - **Numbered Comment Pin (<kbd>C</kbd>)**: Visual number badges coupled dynamically with comments in the feedback sidebar.
  - **Hand / Pan Canvas (<kbd>H</kbd> or <kbd>Space</kbd>+drag)**: Discoverable pan tool for touch and desktop.
- **Feedback & Comments Sidebar**:
  - Derived numbering (#1, #2, #3...) dynamically synchronized between canvas pins and comment cards.
  - Plain-text note editing with keyboard commit (<kbd>Ctrl</kbd>+<kbd>Enter</kbd> or `blur`).
  - Accessible focus restoration and item deletion.
  - Responsive slide-over drawer layout with backdrop on screens $\le 900\text{px}$.
- **Immutable Undo/Redo Engine**:
  - Full history stack for creation, movement, deletion, style modifications, and text edits.
  - Transient drafts, viewport zoom/pan, selection, and image blobs are strictly excluded from history for optimal memory efficiency.
- **Independent Viewport Zoom & Pan**:
  - Bounded zoom range (10% to 500%).
  - Centered zoom buttons (<kbd>+</kbd> / <kbd>-</kbd>) preserving container center.
  - Focal zoom around cursor via <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + wheel.
  - Actual size (<kbd>0</kbd>) at 1 image pixel per CSS pixel.
  - Pan bounds clamping to prevent screenshots from being dragged out of view.
- **High-Fidelity PNG Export**:
  - Canvas-based rasterization (no DOM screenshot workarounds).
  - Native resolution export at decoded dimensions.
  - Two export formats:
    1. **Annotated Image Only**: Clean screenshot with shapes, arrows, and pin markers.
    2. **Annotated Image with Comments Appendix**: Formatted appendix beneath the screenshot with matching numbered badges, headers, and precomputed wrapped feedback text.
  - Pre-checked canvas limits (8,192 px and 40 MP) with automatic fallback recommendations.

---

## Architecture & Coordinate Model

FrameNote follows a strict modular separation of concerns:

```
src/
├── core/
│   ├── annotation/     # Pure geometry (rectangles, arrows, pins, movement)
│   ├── coordinates/    # Coordinate transforms (screen-to-image, zoom anchors, pan clamping)
│   ├── document/       # Pure reducer document state (annotations, tools, styles)
│   ├── export/         # Appendix layout calculation & HTML5 Canvas PNG pipeline
│   ├── history/        # Generic immutable undo/redo history stack (max 50 steps)
│   └── image/          # File validation (25MB, 8192px, 40MP), decoders, sample asset
├── hooks/              # Encapsulated stateful hooks (useViewport, useCanvasInteraction, etc.)
├── components/         # Accessible React UI components (layout, canvas, common)
└── types/              # Strict TypeScript definitions
```

### The Image-Space Invariant
A foundational rule in FrameNote is that **annotations are stored strictly in original image pixel coordinates**.
- When an image is decoded at $1920 \times 1080$, an annotation at $(100, 100)$ is always stored as $(100, 100)$.
- Viewport transformations (`scale`, `translate`) apply to the container stage via CSS.
- Pointer inputs are mapped to image space using SVG's inverse screen transformation matrix (`getScreenCTM().inverse()`).
- Zooming and panning never modify document annotation data, ensuring 100% mathematical fidelity upon export.

---

## Privacy & Security

FrameNote operates with zero server roundtrips:
- **100% Local**: All image reading, decoding, rendering, and PNG generation occur entirely inside your browser's V8 engine.
- **No Analytics / Telemetry**: No tracking scripts, analytics beacons, or remote logging.
- **No External Assets**: All icons, fonts, and sample assets are bundled locally.
- **Memory Safety**: Object URLs are tracked and promptly revoked (`URL.revokeObjectURL`) upon image replacement, export completion, and component unmount.

---

## Supported Formats & System Limits

### Formats (Version 1)
- **PNG** (`image/png`, `.png`)
- **JPEG** (`image/jpeg`, `.jpg`, `.jpeg`)
- **WebP** (`image/webp`, `.webp`)

*(Note: SVG is omitted in v1 to protect against embedded `<script>` execution/XSS vectors and to guarantee deterministic raster canvas rendering.)*

### Documented Limits
| Constant | Limit | Technical Rationale |
| :--- | :--- | :--- |
| `MAX_FILE_SIZE_BYTES` | **25 MB** | Protects browser tab memory and prevents UI freezes during decoding. |
| `MAX_IMAGE_DIMENSION` | **8,192 px** | Conforms to HTML5 Canvas dimension and standard GPU texture limits. |
| `MIN_IMAGE_DIMENSION` | **10 px** | Guards against degenerate zero-dimension files. |
| `MAX_IMAGE_PIXELS` | **40 MP** (e.g., 8,000 × 5,000) | Prevents allocating excessively massive uncompressed RGBA buffers. |
| `MAX_HISTORY_STEPS` | **50 steps** | Deep undo stack while bounding memory consumption. |
| `MIN_ZOOM` / `MAX_ZOOM` | **0.1 (10%)** / **5.0 (500%)** | Ensures controllable, bounded viewport scaling. |
| `MIN_VISIBLE_MARGIN` | **64 px** | Prevents image from being panned irretrievably off-screen. |

---

## Setup & Commands

### Prerequisites
- Node.js `v18+` or `v20+`
- npm `v9+` or `v10+`

### Installation
```bash
git clone https://github.com/your-username/FrameNote.git
cd FrameNote
npm install
```

### Development Server
```bash
npm run dev
# Starts local development server at http://localhost:5173/
```

### Testing Commands
```bash
# Run unit & integration tests (109 tests across 13 suites)
npm run test

# Run Playwright End-to-End tests (8 browser scenarios)
npm run test:e2e

# TypeScript strict type checking
npm run typecheck

# Production build
npm run build
```

---

## 30-Second Quickstart Demo Walkthrough

1. **Load Sample Image**: Click **"Try sample screenshot"** on the empty canvas to load the bundled 1200 × 760 dashboard mockup.
2. **Draw a Rectangle**: Press <kbd>R</kbd> (or click Rectangle tool). Drag across a card on the screenshot.
3. **Point an Arrow**: Press <kbd>A</kbd> (or click Arrow tool). Drag from an empty area to a call-to-action button.
4. **Leave Feedback**: Press <kbd>C</kbd> (or click Comment Pin). Click on the screenshot to drop Pin #1. Type `"Update button label to 'Get Started Free'"` in the focused sidebar card and press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.
5. **Zoom & Pan**: Hold <kbd>Space</kbd> and drag to pan smoothly around the canvas. Press <kbd>+</kbd> or scroll with <kbd>Ctrl</kbd> to zoom in without coordinate drift.
6. **Export**: Click **"Export PNG"** in the header. Choose **"Annotated image with comments appendix"** and click **"Export & Download"** to save your annotated screenshot with formatted notes.

---

## Known Limitations & Future Roadmap

- **Resize Handles & Rotation**: Annotations currently support translation movement and deletion. Shape corner resize handles and angle rotation are planned for v2.
- **Pencil / Freehand Drawing**: Freehand vector drawing (`pen` tool) and text insertion are reserved for future milestone releases.
- **Multi-select**: Current version supports single-annotation active selection and manipulation.

---

## Attribution & Dependencies

- **Framework**: [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), and [Playwright](https://playwright.dev/)
- **Design Tokens & Icons**: Custom handcrafted SVG icons inspired by Feather & Lucide specifications.
- **Sample Screenshot Asset**: Original SVG vector artwork rendered locally on canvas as a sample landing page mockup (no external assets or network dependencies).
