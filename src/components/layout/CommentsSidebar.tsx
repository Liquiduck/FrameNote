import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';
import type { AnnotationDocument } from '../../types/document';
import type { PinAnnotation } from '../../types/annotation';
import { getAllPins } from '../../core/annotation/pinGeometry';
import { IconClear, IconComment } from '../common/Icons';

interface CommentsSidebarProps {
  document: AnnotationDocument;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (annotation: PinAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function CommentsSidebar({
  document,
  isOpen = true,
  onClose,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: CommentsSidebarProps) {
  const pins = getAllPins(document.annotations);
  const pinCount = pins.length;
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const prevPinsLengthRef = useRef(pinCount);

  // Restore focus sensibly after deletion
  const handleDeletePin = (pinId: string, index: number) => {
    onDeleteAnnotation(pinId);
    setTimeout(() => {
      // Focus the card that took its place, or the previous card, or the container
      const cards = sidebarContentRef.current?.querySelectorAll<HTMLElement>('.fn-comment-card');
      if (cards && cards.length > 0) {
        const nextTarget = cards[index] || cards[index - 1] || cards[0];
        nextTarget?.focus();
      } else {
        sidebarContentRef.current?.focus();
      }
    }, 50);
  };

  useEffect(() => {
    prevPinsLengthRef.current = pinCount;
  }, [pinCount]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fn-sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fn-sidebar ${isOpen ? 'is-open' : ''}`}
        aria-label="Feedback and comments"
        tabIndex={-1}
      >
        <div className="fn-sidebar-header">
          <div className="fn-sidebar-header-left">
            <h2 className="fn-sidebar-title">Comments & Notes</h2>
            <span
              className="fn-sidebar-counter"
              aria-label={`${pinCount} ${pinCount === 1 ? 'comment' : 'comments'}`}
            >
              {pinCount}
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              className="fn-sidebar-close-btn"
              onClick={onClose}
              title="Close comments panel"
              aria-label="Close comments panel"
            >
              ✕
            </button>
          )}
        </div>

      <div
        ref={sidebarContentRef}
        className="fn-sidebar-content"
        tabIndex={-1}
      >
        {pinCount === 0 ? (
          <div className="fn-sidebar-empty">
            <div style={{ marginBottom: 12, opacity: 0.6 }}>
              <IconComment width={32} height={32} />
            </div>
            <p className="fn-sidebar-empty-title">No comments yet</p>
            <p className="fn-sidebar-empty-desc">
              Select the <strong>Comment Pin</strong> tool (<kbd>C</kbd>) and click anywhere on the screenshot to drop a numbered pin and leave feedback.
            </p>
          </div>
        ) : (
          <div className="fn-comment-list" role="list">
            {pins.map((pin, index) => {
              const pinNumber = index + 1; // Derived dynamic display number
              const isSelected = pin.id === document.selectedAnnotationId;

              return (
                <CommentCard
                  key={pin.id}
                  pin={pin}
                  pinNumber={pinNumber}
                  isSelected={isSelected}
                  onSelect={() => onSelectAnnotation(pin.id)}
                  onUpdateText={(newText) => {
                    onUpdateAnnotation({
                      ...pin,
                      text: newText,
                    });
                  }}
                  onDelete={() => handleDeletePin(pin.id, index)}
                />
              );
            })}
          </div>
        )}
      </div>
    </aside>
  </>
  );
}

interface CommentCardProps {
  pin: PinAnnotation;
  pinNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateText: (newText: string) => void;
  onDelete: () => void;
}

function CommentCard({
  pin,
  pinNumber,
  isSelected,
  onSelect,
  onUpdateText,
  onDelete,
}: CommentCardProps) {
  // Keep local text draft separate from document history
  const [draftText, setDraftText] = useState(pin.text);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft text if pin.text updates externally (e.g. undo/redo)
  useEffect(() => {
    setDraftText(pin.text);
  }, [pin.text]);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftText(e.target.value);
  };

  // Commit text change only on blur or explicit keyboard save action
  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    const trimmed = e.target.value.trim();
    if (trimmed !== pin.text) {
      onUpdateText(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter or Ctrl+Enter commits and blurs
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      textareaRef.current?.blur();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`fn-comment-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      role="listitem"
      aria-label={`Comment #${pinNumber}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === cardRef.current) {
          e.preventDefault();
          onSelect();
          textareaRef.current?.focus();
        }
      }}
    >
      <div className="fn-comment-card-header">
        <div className="fn-comment-card-title">
          <span
            className="fn-comment-badge"
            style={{ backgroundColor: pin.color }}
            aria-hidden="true"
          >
            {pinNumber}
          </span>
          <span className="fn-comment-heading">Feedback #{pinNumber}</span>
        </div>

        <button
          type="button"
          className="fn-comment-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={`Delete comment #${pinNumber}`}
          aria-label={`Delete comment #${pinNumber}`}
        >
          <IconClear />
        </button>
      </div>

      <div className="fn-comment-card-body">
        <textarea
          ref={textareaRef}
          className="fn-comment-textarea"
          value={draftText}
          placeholder="Add feedback note... (press Ctrl+Enter to save)"
          rows={3}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Feedback text for pin #${pinNumber}`}
        />
      </div>
    </div>
  );
}
