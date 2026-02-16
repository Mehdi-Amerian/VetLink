'use client';

import { useState } from 'react';
import { login } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function extractAxiosMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return 'Login failed';

    const data: any = e.response?.data;

    if(typeof data?.message === 'string') return data.message;
    
    //Zod commonly returns validation errors in an array under either `message` or `errors` key, so we check both
    const list = Array.isArray(data?.message) ? data.message : Array.isArray(data?.errors) ? data.errors : null;
    if(Array.isArray(list)) {
      const msg = list
        .map((x: any) => (typeof x === "string" ? x : x?.message))
        .filter(Boolean)
        .join(", ");
    if (msg) return msg;
  }

  return "Login failed";
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
  const reason = params.get("reason");
  const router = useRouter();

  function validate(): boolean {
    let ok = true;

    const e = email.trim();
    const p = password;

    if (!e) {
      setEmailError("Please fill in this field.");
      ok = false;
    } else if (!isValidEmail(e)) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!p) {
      setPasswordError("Please fill in this field.");
      ok = false;
    } else if (p.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
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
    router.replace('/');
  } catch (e: unknown) {
    // Wrong credentials is a common case, so we want to show the error message from the server if available
    setFormError(extractAxiosMessage(e));
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="max-w-sm mx-auto pt-20 space-y-4">
      {reason === "session-expired" && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Your session has expired. Please sign in again.
        </div>
      )}

      {formError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email}
         onChange={(e) => {
           setEmail(e.target.value);
          if (emailError) setEmailError(null);
        }}
        onBlur={() => validate()}
        aria-invalid={!!emailError} 
        />
        {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
             setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          onBlur={() => validate()}
          aria-invalid={!!passwordError}
        />
        {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
      </div>
      <Button onClick={onLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </div>
  );
}
