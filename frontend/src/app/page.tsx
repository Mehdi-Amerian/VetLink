'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'VET') {
      router.replace('/dashboard/vet');
    } else {
      router.replace('/dashboard/owner');
    }
  }, [user, router]);

  return null;
}
