# FrameNote

FrameNote is a polished screenshot annotation studio designed for software engineers, designers, and product teams. It runs entirely client-side in the browser with no backend, authentication, or external API dependencies.

## Core Journey

1. **Upload a screenshot**: Drag and drop, browse local files, or try the bundled landing page sample screenshot.
2. **Annotate**: Overlay feedback, boxes, arrows, text notes, and callouts directly in image coordinates.
3. **Export**: Render and download a high-resolution annotated PNG.

---

## Supported Image Formats & Limits

### Supported Formats (Version 1)

- **PNG** (`image/png`, `.png`)
- **JPEG** (`image/jpeg`, `.jpg`, `.jpeg`)
- **WebP** (`image/webp`, `.webp`)

> **Why SVG is not supported in Version 1:**
> FrameNote is specifically tailored for raster screenshot annotation and pixel-accurate canvas exports. Scalable Vector Graphics (SVG) files introduce cross-platform text font rendering variances, untrusted embedded script execution risks (`<script>` injection / XSS vectors), and complex external resource resolution issues that compromise deterministic canvas export. Raster formats guarantee pixel-for-pixel fidelity.

---

### Documented Limits

| Constant | Limit | Technical Rationale |
| :--- | :--- | :--- |
| `MAX_FILE_SIZE_BYTES` | **25 MB** | Prevents browser tab crashes, out-of-memory errors, and UI freezing during image file buffering. |
| `MAX_IMAGE_DIMENSION` | **8,192 px** | Conforms to maximum HTML5 Canvas dimension and standard GPU texture limits across modern desktop and mobile browsers. |
| `MIN_IMAGE_DIMENSION` | **10 px** | Guards against degenerate or corrupted image files. |
| `MAX_IMAGE_PIXELS` | **40 Megapixels** (e.g., 8,000 × 5,000) | Protects decoded RGBA bitmap buffer allocations from exceeding browser tab memory constraints (~160 MB raw). |
| `MAX_HISTORY_STEPS` | **50 steps** | Deep undo/redo stack capacity while bounding memory consumption. |

---

## Undo/Redo History Architecture

FrameNote implements an immutable snapshot history stack (`past`, `present`, `future`) designed specifically for performance and memory safety:

### Included in History
- **Creating annotations**: Rectangle, arrow, and numbered comment pin creation.
- **Deleting annotations**: Removing annotations from canvas or sidebar.
- **Moving annotations**: Full drag translation (one completed drag equals one history entry).
- **Changing annotation styles**: Updating color or stroke width on selected annotations.
- **Committing comment edits**: Text notes committed upon `blur` or <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (individual keystrokes never pollute history).

### Excluded from History
- **Image Data & Blobs**: Decoded images are held once in the document shell, never cloned into history entries.
- **Active Selection**: Kept valid dynamically; undoing a creation clears selection if the target no longer exists.
- **Tool Choice & Defaults**: Switching tools (<kbd>V</kbd>, <kbd>R</kbd>, <kbd>A</kbd>, <kbd>C</kbd>) does not create undo steps.
- **Viewport Transformations**: Panning and zooming remain independent of document history.
- **Transient Drafts**: In-progress drags and uncommitted drafts exist only in local interaction state.

### Keyboard Shortcuts
- <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Z</kbd>: Undo.
- <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (or <kbd>Ctrl</kbd>+<kbd>Y</kbd>): Redo.
- Native undo/redo is strictly preserved when editing text inside comment fields or inputs.

---

## Image Lifecycle & Architecture

1. **Local Browser Isolation**:
   - Files loaded via `<input>` or drag-and-drop are kept entirely local.
   - Decoded natively using the browser's image decoder.
   - Object URLs are tracked and explicitly revoked (`URL.revokeObjectURL`) whenever an image is replaced or unmounted to prevent memory leaks.

2. **Race-Condition & Stale Upload Prevention**:
   - Asynchronous file decodes are stamped with an incremental sequence identifier.
   - If a user rapidly selects multiple files or drops a file while a decode is in progress, stale decodes are automatically discarded and revoked without overwriting newer uploads.

3. **Lossless Coordinate Separation**:
   - All annotation geometries are calculated and stored in **original image pixel coordinates**, never screen coordinates.
   - Viewport zooming, panning, and device pixel ratios do not affect annotation document coordinates.

4. **Safe Replacement Confirmation**:
   - If an image replacement is triggered while unsaved annotations exist, a confirmation dialog appears to prevent accidental data loss.

---

## Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run unit tests with Vitest
npm run test

# TypeScript strict type check
npm run typecheck

# Production build
npm run build
```
