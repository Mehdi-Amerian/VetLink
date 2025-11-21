'use client';

import { useState } from 'react';
import { login } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const router = useRouter();

  async function onLogin() {
  setLoading(true);
  try {
    const { token, user } = await login(email, password);
    setSession(token, user);
    router.replace('/');
  } catch (e: unknown) {
    // Narrow error type safely
    if (axios.isAxiosError(e)) {
      const message =
        (e.response?.data as { message?: string } | undefined)?.message ?? 'Login failed';
      alert(message);
    } else {
      alert('Login failed');
    }
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="max-w-sm mx-auto pt-20 space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button onClick={onLogin} disabled={loading}>
        Log in
      </Button>
    </div>
  );
}
