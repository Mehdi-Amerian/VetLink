'use client';

import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';

import { acceptInvite } from '@/lib/auth';
import { dashboardPathForRole } from '@/lib/role-routing';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 8;
const NAME_REGEX = /^[\p{L}' -]+$/u;

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const nameTrimmed = fullName.trim();
  const nameValid = nameTrimmed.length > 0 && NAME_REGEX.test(nameTrimmed);
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = !!token && nameValid && passwordValid && !loading;

  async function onSubmit() {
    if (!canSubmit || !token) return;
    setLoading(true);

    try {
      const { token: jwt, user } = await acceptInvite({
        token,
        fullName: nameTrimmed,
        password,
      });

      setSession(jwt, user);
      router.replace(dashboardPathForRole(user.role));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg =
          (error.response?.data as { message?: string } | undefined)?.message ??
          'Failed to accept invite';
        alert(msg);
      } else {
        alert('Failed to accept invite');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="app-wrap flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[#d7e2e9] bg-white/90 p-6 text-center shadow-lg">
          <p className="text-sm text-[#5a7486]">
            Invalid or missing invite token. Please use the link from your email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrap flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#cfe0e8] bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="mb-5 flex justify-center">
          <Image src="/vetlink-logo.png" alt="VetLink" width={180} height={60} className="h-auto w-[180px]" />
        </div>

        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-[#103857]">Activate your account</h1>
          <p className="mt-1 text-sm text-[#4f6d81]">
            Set your name and password to complete account setup.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => {
                const cleaned = event.target.value.replace(/[^\p{L}' -]/gu, '');
                setFullName(cleaned);
              }}
            />
            {nameTrimmed.length > 0 && !nameValid && (
              <p className="text-xs text-red-500">
                Name can only contain letters, spaces, apostrophes, and hyphens.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-[#688396]">At least {MIN_PASSWORD_LENGTH} characters.</p>
            {password.length > 0 && !passwordValid && (
              <p className="text-xs text-red-500">
                Password must be at least {MIN_PASSWORD_LENGTH} characters long.
              </p>
            )}
          </div>

          <Button className="w-full" onClick={onSubmit} disabled={!canSubmit}>
            {loading ? 'Activating...' : 'Activate account'}
          </Button>
        </div>
      </div>
    </div>
  );
}
