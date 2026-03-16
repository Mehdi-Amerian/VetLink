'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { signup } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { createPetForOwner } from '@/lib/fetchers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState('');
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  const passwordsMatch = password.length > 0 && password === confirm;

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    passwordsMatch &&
    petName.trim().length > 0 &&
    petSpecies.trim().length > 0 &&
    petBirthDate.length > 0;

  async function onSignup() {
    if (!canSubmit || loading) return;
    setLoading(true);

    try {
      const { token, user } = await signup(email.trim(), password, fullName.trim());
      setSession(token, user);

      try {
        await createPetForOwner({
          name: petName.trim(),
          species: petSpecies.trim(),
          breed: petBreed.trim() || undefined,
          birthDateYYYYMMDD: petBirthDate,
        });
      } catch (petError) {
        console.error('Failed to create initial pet', petError);
        alert('Your account was created, but your pet could not be created automatically. You can add it later.');
      }

      router.replace('/dashboard/owner');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          'Signup failed';
        alert(message);
      } else {
        alert('Signup failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrap px-4 py-8">
      <div className="app-page max-w-3xl">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[#cfe0e8] bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="mb-6 flex justify-center">
            <Image src="/vetlink-logo.png" alt="VetLink" width={200} height={66} className="h-auto w-[200px]" />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-[#103857]">Create owner account</h1>
            <p className="mt-1 text-sm text-[#4f6d81]">
              Create your account and first pet profile to start booking appointments.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-[#d8e5ec] bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#35657f]">Your details</h2>

              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password (min 6 chars)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                />
                {password.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#d8e5ec] bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#35657f]">Your first pet</h2>

              <div>
                <Label htmlFor="petName">Pet name</Label>
                <Input id="petName" value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="Rene" />
              </div>

              <div>
                <Label htmlFor="petSpecies">Species</Label>
                <Input
                  id="petSpecies"
                  value={petSpecies}
                  onChange={(event) => setPetSpecies(event.target.value)}
                  placeholder="Dog, Cat..."
                />
              </div>

              <div>
                <Label htmlFor="petBreed">Breed (optional)</Label>
                <Input
                  id="petBreed"
                  value={petBreed}
                  onChange={(event) => setPetBreed(event.target.value)}
                  placeholder="Labrador"
                />
              </div>

              <div>
                <Label htmlFor="petBirthDate">Birth date</Label>
                <Input
                  id="petBirthDate"
                  type="date"
                  value={petBirthDate}
                  max={today}
                  onChange={(event) => setPetBirthDate(event.target.value)}
                />
              </div>
            </section>
          </div>

          <div className="mt-6 space-y-4">
            <Button className="w-full" disabled={!canSubmit || loading} onClick={onSignup}>
              {loading ? 'Creating account...' : 'Sign up and add pet'}
            </Button>

            <p className="text-center text-sm text-[#5b7688]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#103857] underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
