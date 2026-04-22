import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevated = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['doku-card', elevated && 'doku-card--elevated', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
});
