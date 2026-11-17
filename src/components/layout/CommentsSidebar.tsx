import type { AnnotationDocument } from '../../types/document';
import { IconComment } from '../common/Icons';

interface CommentsSidebarProps {
  document: AnnotationDocument;
  onSelectAnnotation: (id: string | null) => void;
}

export function CommentsSidebar({
  document,
  onSelectAnnotation,
}: CommentsSidebarProps) {
  const commentCount = document.comments.length;
  const hasComments = commentCount > 0;

  return (
    <aside className="fn-sidebar" aria-label="Feedback and comments">
      <div className="fn-sidebar-header">
        <h2 className="fn-sidebar-title">Comments & Notes</h2>
        <span className="fn-sidebar-counter">{commentCount}</span>
      </div>

      <div className="fn-sidebar-content">
        {!hasComments ? (
          <div className="fn-sidebar-empty">
            <div style={{ marginBottom: 10, opacity: 0.6 }}>
              <IconComment width={28} height={28} />
            </div>
            <p className="fn-sidebar-empty-title">No comments yet</p>
            <p className="fn-sidebar-empty-desc">
              Annotations and callouts placed on the screenshot will appear here as discussion threads.
            </p>
          </div>
        ) : (
          <div className="fn-comment-list">
            {document.comments.map((thread) => {
              const isSelected = thread.annotationId === document.selectedAnnotationId;
              const firstMsg = thread.messages[0];
              return (
                <div
                  key={thread.id}
                  className={`fn-comment-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectAnnotation(thread.annotationId)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="fn-comment-item-header">
                    <span className="fn-comment-author">{firstMsg?.author ?? 'Feedback'}</span>
                    {thread.resolved && <span className="fn-comment-resolved-tag">Resolved</span>}
                  </div>
                  <p className="fn-comment-text">{firstMsg?.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
