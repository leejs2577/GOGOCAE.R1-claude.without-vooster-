'use client';

import type { RequestStatus } from '@/lib/supabase/types';

const statusConfig: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  pending_assignment: {
    label: '담당자 지정 필요',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  before_start: {
    label: '작업 전',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  in_progress: {
    label: '진행 중',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  completed: {
    label: '완료',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: RequestStatus): string {
  return statusConfig[status].label;
}

export function getStatusColor(status: RequestStatus): string {
  const colors: Record<RequestStatus, string> = {
    pending_assignment: '#f59e0b',
    before_start: '#6b7280',
    in_progress: '#3b82f6',
    completed: '#10b981',
  };
  return colors[status];
}
