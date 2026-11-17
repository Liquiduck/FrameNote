import type { AnnotationTool } from '../../types/annotation';
import {
  IconArrow,
  IconBlur,
  IconCallout,
  IconPen,
  IconRectangle,
  IconSelect,
  IconText,
} from '../common/Icons';
import {
  ANNOTATION_COLORS,
  STROKE_WIDTH_PRESETS,
} from '../../core/annotation/rectangleGeometry';

interface DrawingToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  onSelectTool: (tool: AnnotationTool) => void;
  onSelectColor: (color: string) => void;
  onSelectStrokeWidth: (width: number) => void;
  disabled?: boolean;
}

const TOOLS: Array<{
  id: AnnotationTool;
  label: string;
  icon: typeof IconSelect;
  shortcut: string;
  implemented: boolean;
}> = [
  { id: 'select', label: 'Select & Move', icon: IconSelect, shortcut: 'V', implemented: true },
  { id: 'rectangle', label: 'Rectangle', icon: IconRectangle, shortcut: 'R', implemented: true },
  { id: 'arrow', label: 'Arrow (coming soon)', icon: IconArrow, shortcut: 'A', implemented: false },
  { id: 'pen', label: 'Freehand Pen (coming soon)', icon: IconPen, shortcut: 'P', implemented: false },
  { id: 'text', label: 'Text (coming soon)', icon: IconText, shortcut: 'T', implemented: false },
  { id: 'callout', label: 'Callout (coming soon)', icon: IconCallout, shortcut: 'C', implemented: false },
  { id: 'blur', label: 'Redact (coming soon)', icon: IconBlur, shortcut: 'B', implemented: false },
];

export function DrawingToolbar({
  activeTool,
  activeColor,
  activeStrokeWidth,
  onSelectTool,
  onSelectColor,
  onSelectStrokeWidth,
  disabled = false,
}: DrawingToolbarProps) {
  return (
    <div className="fn-toolbar-container" role="toolbar" aria-label="Annotation tools">
      <div className="fn-toolbar">
        {/* Tool selector buttons */}
        <div className="fn-toolbar-group" role="radiogroup" aria-label="Tool selection">
          {TOOLS.map((tool, index) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <div key={tool.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {index === 1 && <div className="fn-toolbar-divider" />}
                <button
                  type="button"
                  className={`fn-toolbar-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectTool(tool.id)}
                  disabled={disabled || !tool.implemented}
                  title={`${tool.label} (${tool.shortcut})`}
                  aria-label={tool.label}
                  aria-checked={isActive}
                  role="radio"
                >
                  <Icon />
                </button>
              </div>
            );
          })}
        </div>

        <div className="fn-toolbar-divider" />

        {/* Color Presets */}
        <div className="fn-toolbar-group fn-color-palette" role="radiogroup" aria-label="Stroke color">
          {ANNOTATION_COLORS.map((c) => {
            const isSelected = activeColor.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                className={`fn-color-swatch ${isSelected ? 'is-selected' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => onSelectColor(c.value)}
                title={`Color: ${c.label}`}
                aria-label={`Color: ${c.label}`}
                aria-checked={isSelected}
                role="radio"
              />
            );
          })}
        </div>

        <div className="fn-toolbar-divider" />

        {/* Stroke Width Presets */}
        <div className="fn-toolbar-group fn-width-palette" role="radiogroup" aria-label="Stroke width">
          {STROKE_WIDTH_PRESETS.map((sw) => {
            const isSelected = activeStrokeWidth === sw.value;
            return (
              <button
                key={sw.id}
                type="button"
                className={`fn-width-btn ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectStrokeWidth(sw.value)}
                title={`Stroke Width: ${sw.label} (${sw.value}px)`}
                aria-label={`Stroke Width: ${sw.label}`}
                aria-checked={isSelected}
                role="radio"
              >
                <span
                  className="fn-width-indicator"
                  style={{
                    height: Math.min(Math.max(sw.value, 2), 8),
                    backgroundColor: activeColor,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
