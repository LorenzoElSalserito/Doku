import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="doku-empty">
      {icon}
      <div className="doku-empty__title">{title}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
