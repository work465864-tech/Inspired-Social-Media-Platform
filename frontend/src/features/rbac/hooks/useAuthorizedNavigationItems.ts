'use client';

import { navigationItems } from '../../../constants/navigation.js';
import { useCan } from './useCan';

export function useAuthorizedNavigationItems() {
  const canAccessAdmin = useCan('admin:access');
  const canReviewReports = useCan('reports:review');

  return [
    ...navigationItems,
    ...(canReviewReports
      ? [{ label: 'Moderation', to: '/moderation', icon: 'moderation' }]
      : []),
    ...(canAccessAdmin
      ? [{ label: 'Admin', to: '/admin', icon: 'admin' }]
      : []),
  ];
}
