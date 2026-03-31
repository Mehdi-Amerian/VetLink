'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

const HIDDEN_PATHS = ['/login', '/signup', '/accept-invite'] as const;

export default function SessionControls() {
  const { ready, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const hiddenOnCurrentPath = useMemo(() => {
    if (!pathname) return false;
    return HIDDEN_PATHS.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  useEffect(() => {
    // Ensure button state is reset when auth/page context changes.
    if (!user || hiddenOnCurrentPath) {
      setSigningOut(false);
    }
  }, [user, hiddenOnCurrentPath]);

  if (!ready || !user || hiddenOnCurrentPath) {
    return null;
  }

  function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    logout();
    router.replace('/login');
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80]">
      <div className="pointer-events-auto rounded-2xl border border-[#cfe0e8] bg-white/92 p-2 shadow-lg backdrop-blur">
        <Button size="sm" variant="outline" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}
