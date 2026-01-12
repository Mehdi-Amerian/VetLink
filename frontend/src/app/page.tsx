'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Full role-based routing
    switch (user.role) {
      case 'OWNER':
        router.replace('/dashboard/owner');
        break;
      case 'VET':
        router.replace('/dashboard/vet');
        break;
      case 'CLINIC_ADMIN':
        router.replace('/dashboard/clinic-admin');
        break;
      case 'SUPER_ADMIN':
        router.replace('/dashboard/super-admin');
        break;
      default:
        router.replace('/login');
    }
  }, [user, ready, router]);

  return null;
}
