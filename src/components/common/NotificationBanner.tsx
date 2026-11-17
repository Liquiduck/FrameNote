import { IconClear } from './Icons';

interface NotificationBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export function NotificationBanner({ message, onDismiss }: NotificationBannerProps) {
  if (!message) return null;

  return (
    <div
      className="fn-alert-banner"
      role="alert"
      aria-live="assertive"
    >
      <div className="fn-alert-content">
        <span className="fn-alert-icon" aria-hidden="true">⚠️</span>
        <span className="fn-alert-text">{message}</span>
      </div>
      <button
        type="button"
        className="fn-alert-close"
        onClick={onDismiss}
        aria-label="Dismiss error notification"
      >
        <IconClear />
      </button>
    </div>
  );
}
