import type { VisualBlockKind } from '@doku/application';

interface InvalidVisualBlockProps {
  blockKind: VisualBlockKind;
  rawSource: string;
  message: string;
  errorTitle: string;
}

export function InvalidVisualBlock({
  blockKind,
  rawSource,
  message,
  errorTitle,
}: InvalidVisualBlockProps) {
  return (
    <div
      className={`visual-block visual-block--${blockKind} visual-block--error`}
      role="alert"
      data-testid={`invalid-${blockKind}-block`}
    >
      <p className="visual-block__error-title">{errorTitle}</p>
      <pre className="visual-block__error-source">{rawSource}</pre>
      <p className="visual-block__error-message">{message}</p>
    </div>
  );
}
