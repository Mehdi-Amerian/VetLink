import type { User } from './types';

export function dashboardPathForRole(role: User['role']): string {
  switch (role) {
    case 'OWNER':
      return '/dashboard/owner';
    case 'VET':
      return '/dashboard/vet';
    case 'CLINIC_ADMIN':
      return '/dashboard/clinic-admin';
    case 'SUPER_ADMIN':
      return '/dashboard/super-admin';
    default:
      return '/login';
  }
}
