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

interface DrawingToolbarProps {
  activeTool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  disabled?: boolean;
}

const TOOLS: Array<{
  id: AnnotationTool;
  label: string;
  icon: typeof IconSelect;
  shortcut: string;
}> = [
  { id: 'select', label: 'Select & Move', icon: IconSelect, shortcut: 'V' },
  { id: 'rectangle', label: 'Rectangle', icon: IconRectangle, shortcut: 'R' },
  { id: 'arrow', label: 'Arrow', icon: IconArrow, shortcut: 'A' },
  { id: 'pen', label: 'Freehand Pen', icon: IconPen, shortcut: 'P' },
  { id: 'text', label: 'Text Note', icon: IconText, shortcut: 'T' },
  { id: 'callout', label: 'Numbered Callout', icon: IconCallout, shortcut: 'C' },
  { id: 'blur', label: 'Blur / Redact', icon: IconBlur, shortcut: 'B' },
];

export function DrawingToolbar({
  activeTool,
  onSelectTool,
  disabled = false,
}: DrawingToolbarProps) {
  return (
    <div className="fn-toolbar-container" role="toolbar" aria-label="Annotation tools">
      <div className="fn-toolbar">
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
                disabled={disabled}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={tool.label}
                aria-pressed={isActive}
              >
                <Icon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
