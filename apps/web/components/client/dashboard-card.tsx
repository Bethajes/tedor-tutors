'use client';

import type { ReactNode } from 'react';
import { Card } from './card';

export function DashboardCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions}>
      {children}
    </Card>
  );
}