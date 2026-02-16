'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGate({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

  const isUnauthorized = ready && (!user || (roles && user && !roles.includes(user.role)));

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace('/');
    }
  }, [ready, user, roles, router]);

  if (!ready || isUnauthorized){
    return null;
  }
  
  return <>{children}</>;
}
