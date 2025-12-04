'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';

import { acceptInvite } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 8;
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

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
    if (t) {
      setToken(t);
    }
  }, [searchParams]);

  const nameTrimed = fullName.trim();
  const nameValid = nameTrimed.length > 0 && NAME_REGEX.test(nameTrimed);
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;

  const canSubmit =
    !!token && nameValid && passwordValid && !loading;

  const onSubmit = async () => {
    if (!canSubmit || !token) return;
    setLoading(true);

    try {
      const { token: jwt, user } = await acceptInvite({
        token,
        fullName: nameTrimed,
        password,
      });
      setSession(jwt, user);
      router.replace('/');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          'Failed to accept invite';
        alert(msg);
      } else {
        alert('Failed to accept invite');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-sm mx-auto pt-20">
        <p className="text-sm text-gray-500">
          Invalid or missing invite token. Please use the link from your email.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pt-20 space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Complete your account</h1>
        <p className="text-sm text-gray-500">
          Set your name and password to activate your VetLink account.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => {
              const value = e.target.value;
              const cleaned = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '');
              setFullName(cleaned);
            }}
          />
          {nameTrimed.length > 0 && !nameValid && (
            <p className="text-xs text-red-500 mt-1">
              Name can only contain letters, spaces, apostrophes, and hyphens.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-gray-400">At least {MIN_PASSWORD_LENGTH} characters.</p>
          {password.length > 0 && !passwordValid && (
            <p className="text-xs text-red-500 mt-1">
              Password must be at least {MIN_PASSWORD_LENGTH} characters long.
            </p>
          )}
        </div>

        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {loading ? 'Activating…' : 'Activate account'}
        </Button>
      </div>
    </div>
  );
}
