'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

import { login } from '@/lib/auth';
import { dashboardPathForRole } from '@/lib/role-routing';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function extractAxiosMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Login failed';

  const data = error.response?.data as
    | { message?: string | Array<{ message?: string } | string>; errors?: Array<{ message?: string } | string> }
    | undefined;

  if (typeof data?.message === 'string') return data.message;

  const list = Array.isArray(data?.message)
    ? data.message
    : Array.isArray(data?.errors)
      ? data.errors
      : null;

  if (Array.isArray(list)) {
    const msg = list
      .map((item) => (typeof item === 'string' ? item : item?.message))
      .filter(Boolean)
      .join(', ');
    if (msg) return msg;
  }

  return 'Login failed';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const params = useSearchParams();
  const reason = params.get('reason');
  const router = useRouter();

  function validate(): boolean {
    let ok = true;
    const e = email.trim();
    const p = password;

    if (!e) {
      setEmailError('Please fill in this field.');
      ok = false;
    } else if (!isValidEmail(e)) {
      setEmailError('Please enter a valid email address.');
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!p) {
      setPasswordError('Please fill in this field.');
      ok = false;
    } else if (p.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      ok = false;
    } else {
      setPasswordError(null);
    }

    return ok;
  }

  async function onLogin() {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setSession(token, user);
      router.replace(dashboardPathForRole(user.role));
    } catch (error: unknown) {
      setFormError(extractAxiosMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrap flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#cfe0e8] bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="mb-5 flex justify-center">
          <Image src="/vetlink-logo.png" alt="VetLink" width={190} height={64} className="h-auto w-[190px]" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#103857]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#4f6d81]">Log in to access your VetLink dashboard.</p>
        </div>

        <div className="space-y-4">
          {reason === 'session-expired' && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              Your session has expired. Please sign in again.
            </div>
          )}

          {formError && <div className="status-error">{formError}</div>}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={validate}
              aria-invalid={!!emailError}
            />
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={validate}
              aria-invalid={!!passwordError}
            />
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          </div>

          <Button className="w-full" onClick={onLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </div>

        <p className="mt-5 text-center text-sm text-[#5b7688]">
          New to VetLink?{' '}
          <Link href="/signup" className="font-semibold text-[#103857] underline underline-offset-2">
            Create owner account
          </Link>
        </p>
      </div>
    </div>
  );
}
