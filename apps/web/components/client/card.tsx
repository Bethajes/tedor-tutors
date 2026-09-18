'use client';

import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {title || actions ? (
        <div className="card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p className="muted card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="row-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}