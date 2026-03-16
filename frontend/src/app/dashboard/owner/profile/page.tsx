'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import AuthGate from '@/components/auth/AuthGate';
import { useAuth } from '@/providers/auth-provider';
import type { Pet } from '@/lib/types';
import {
  createPetForOwner,
  deletePet,
  getPets,
  updateMyOwnerProfile,
  updatePet,
} from '@/lib/fetchers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function OwnerProfileInner() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);

  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editingPetName, setEditingPetName] = useState('');

  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetBirth, setNewPetBirth] = useState('');
  const [addingPet, setAddingPet] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'OWNER') {
      router.replace('/');
      return;
    }

    setFullName(user.fullName ?? '');
    void loadPets();
  }, [ready, user, router]);

  async function loadPets() {
    setLoadingPets(true);
    try {
      const list = await getPets();
      setPets(list);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load pets');
    } finally {
      setLoadingPets(false);
    }
  }

  const canSaveProfile = useMemo(() => fullName.trim().length > 0, [fullName]);

  async function onSaveProfile() {
    if (!canSaveProfile) return;

    setSavingProfile(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateMyOwnerProfile({ fullName: fullName.trim() });
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      localStorage.setItem('user', JSON.stringify({ ...(stored ?? {}), ...updated }));
      setMessage('Profile updated');
    } catch (saveError: unknown) {
      if (axios.isAxiosError(saveError)) {
        const msg =
          typeof saveError.response?.data?.message === 'string'
            ? saveError.response.data.message
            : 'Failed to update profile';
        setError(msg);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditPet(pet: Pet) {
    setEditingPetId(pet.id);
    setEditingPetName(pet.name ?? '');
    setMessage(null);
    setError(null);
  }

  function cancelEditPet() {
    setEditingPetId(null);
    setEditingPetName('');
  }

  async function savePetName(petId: string) {
    const nextName = editingPetName.trim();
    if (!nextName) return;

    try {
      setMessage(null);
      setError(null);

      const updated = await updatePet(petId, { name: nextName });
      setPets((prev) => prev.map((pet) => (pet.id === petId ? updated : pet)));
      setMessage('Pet updated');
      cancelEditPet();
    } catch (saveError: unknown) {
      if (axios.isAxiosError(saveError)) {
        const msg =
          typeof saveError.response?.data?.message === 'string'
            ? saveError.response.data.message
            : 'Failed to update pet';
        setError(msg);
      } else {
        setError('Failed to update pet');
      }
    }
  }

  async function onAddPet() {
    if (!newPetName.trim() || !newPetSpecies.trim() || !newPetBirth) return;

    setAddingPet(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createPetForOwner({
        name: newPetName.trim(),
        species: newPetSpecies.trim(),
        breed: newPetBreed.trim() || undefined,
        birthDateYYYYMMDD: newPetBirth,
      });

      setPets((prev) => [created, ...prev]);
      setNewPetName('');
      setNewPetSpecies('');
      setNewPetBreed('');
      setNewPetBirth('');
      setMessage('Pet added');
    } catch (createError: unknown) {
      if (axios.isAxiosError(createError)) {
        const msg =
          typeof createError.response?.data?.message === 'string'
            ? createError.response.data.message
            : 'Failed to add pet';
        setError(msg);
      } else {
        setError('Failed to add pet');
      }
    } finally {
      setAddingPet(false);
    }
  }

  async function onDeletePet(id: string) {
    const ok = confirm("Delete this pet? (You can't book appointments for it anymore.)");
    if (!ok) return;

    try {
      setMessage(null);
      setError(null);
      await deletePet(id);
      setPets((prev) => prev.filter((pet) => pet.id !== id));
      setMessage('Pet deleted');
    } catch (deleteError: unknown) {
      if (axios.isAxiosError(deleteError)) {
        const msg =
          typeof deleteError.response?.data?.message === 'string'
            ? deleteError.response.data.message
            : 'Failed to delete pet';
        setError(msg);
      } else {
        setError('Failed to delete pet');
      }
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="app-wrap">
      <div className="app-page max-w-5xl space-y-6">
        <div className="app-header">
          <div>
            <h1 className="app-title">My Profile</h1>
            <p className="app-subtitle">Manage your account and pets in one place.</p>
          </div>
          <Link href="/dashboard/owner">
            <Button variant="outline" size="sm">
              Back to dashboard
            </Button>
          </Link>
        </div>

        {message && <div className="status-ok">{message}</div>}
        {error && <div className="status-error">{error}</div>}

        <Card className="border-[#d5e3ea] bg-white/90">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[#103857]">Account</h2>
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email ?? ''} disabled />
            </div>
            <Button disabled={!canSaveProfile || savingProfile} onClick={onSaveProfile}>
              {savingProfile ? 'Saving...' : 'Save profile'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#d5e3ea] bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#103857]">My pets</h2>
              <Button variant="outline" size="sm" onClick={loadPets} disabled={loadingPets}>
                {loadingPets ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>

            <div className="rounded-xl border border-[#d7e4eb] bg-[#f8fbfc] p-4 space-y-3">
              <div className="font-medium text-[#103857]">Add a pet</div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input value={newPetName} onChange={(event) => setNewPetName(event.target.value)} />
                </div>
                <div>
                  <Label>Species</Label>
                  <Input
                    value={newPetSpecies}
                    onChange={(event) => setNewPetSpecies(event.target.value)}
                    placeholder="Dog, Cat..."
                  />
                </div>
                <div>
                  <Label>Breed (optional)</Label>
                  <Input value={newPetBreed} onChange={(event) => setNewPetBreed(event.target.value)} />
                </div>
                <div>
                  <Label>Birth date</Label>
                  <Input
                    type="date"
                    value={newPetBirth}
                    max={today}
                    onChange={(event) => setNewPetBirth(event.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={onAddPet}
                disabled={addingPet || !newPetName.trim() || !newPetSpecies.trim() || !newPetBirth}
              >
                {addingPet ? 'Adding...' : 'Add pet'}
              </Button>
            </div>

            {loadingPets && pets.length === 0 && <p className="text-sm text-muted-foreground">Loading pets...</p>}

            {!loadingPets && pets.length === 0 && (
              <p className="text-sm text-muted-foreground">No pets yet. Add your first pet above.</p>
            )}

            {pets.length > 0 && (
              <div className="space-y-2">
                {pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#d6e4ec] bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      {editingPetId === pet.id ? (
                        <div className="space-y-2">
                          <Label className="text-xs">Pet name</Label>
                          <Input value={editingPetName} onChange={(event) => setEditingPetName(event.target.value)} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => savePetName(pet.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditPet}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="truncate font-medium">{pet.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {pet.species}
                            {pet.breed ? ` - ${pet.breed}` : ''}
                          </div>
                        </>
                      )}
                    </div>

                    {editingPetId !== pet.id && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditPet(pet)}>
                          Edit name
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDeletePet(pet.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OwnerProfilePage() {
  return (
    <AuthGate roles={['OWNER']}>
      <OwnerProfileInner />
    </AuthGate>
  );
}
