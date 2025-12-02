'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { signup } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { createPetForOwner } from '@/lib/fetchers';
import axios from 'axios';

export default function SignupPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  // Account fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // First pet fields
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petBirthDate, setPetBirthDate] = useState(''); // YYYY-MM-DD

  const [loading, setLoading] = useState(false);

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
      // 1) Create OWNER account
      const { token, user } = await signup(
        email.trim(),
        password,
        fullName.trim()
      );

      // Store session so subsequent /pets call is authenticated
      setSession(token, user);

      // 2) Create first pet for owner
      try {
        await createPetForOwner({
          name: petName.trim(),
          species: petSpecies.trim(),
          breed: petBreed.trim() || undefined,
          birthDateYYYYMMDD: petBirthDate,
        });
      } catch (petError) {
        // If pet creation fails, don't block login — just warn
        // eslint-disable-next-line no-console
        console.error('Failed to create initial pet', petError);
        alert(
          'Your account was created, but we could not create your pet automatically. You can add a pet later from your dashboard.'
        );
      }

      // 3) Redirect owner to dashboard (or booking)
      router.replace('/dashboard/owner');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const message =
          (e.response?.data as { message?: string } | undefined)?.message ??
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-center">
          Create owner account
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          This creates an <strong>OWNER</strong> account and your first pet so
          you can book appointments immediately.
        </p>

        <div className="space-y-6">
          {/* Account section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Your details</h2>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password (min 6 chars)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {password.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match.
                </p>
              )}
            </div>
          </div>

          {/* Pet section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Your first pet</h2>

            <div>
              <Label htmlFor="petName">Pet name</Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Rene"
              />
            </div>

            <div>
              <Label htmlFor="petSpecies">Species</Label>
              <Input
                id="petSpecies"
                value={petSpecies}
                onChange={(e) => setPetSpecies(e.target.value)}
                placeholder="Dog, Cat..."
              />
            </div>

            <div>
              <Label htmlFor="petBreed">Breed (optional)</Label>
              <Input
                id="petBreed"
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                placeholder="Labrador"
              />
            </div>

            <div>
              <Label htmlFor="petBirthDate">Birth date</Label>
              <Input
                id="petBirthDate"
                type="date"
                value={petBirthDate}
                onChange={(e) => setPetBirthDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || loading}
            onClick={onSignup}
          >
            {loading ? 'Creating account...' : 'Sign up & add pet'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
