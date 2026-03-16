'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  createVetAndInvite,
  getClinicById,
  getVets,
  inviteVet,
  updateClinic,
} from '@/lib/fetchers';
import type { Clinic, Vet } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_CLINIC_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zipCode: '',
  emergency: false,
};

function ClinicAdminDashboardInner() {
  const { user, ready } = useAuth();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinicForm, setClinicForm] = useState(EMPTY_CLINIC_FORM);
  const [savingClinic, setSavingClinic] = useState(false);

  const [vets, setVets] = useState<Vet[]>([]);
  const [emailByVet, setEmailByVet] = useState<Record<string, string>>({});
  const [invitingVet, setInvitingVet] = useState<string | null>(null);

  const [vetName, setVetName] = useState('');
  const [vetEmail, setVetEmail] = useState('');
  const [vetSpec, setVetSpec] = useState('');
  const [creatingVet, setCreatingVet] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;

    const clinicId = user.clinicId;

    if (!clinicId) {
      setClinic(null);
      setClinicForm(EMPTY_CLINIC_FORM);
      setVets([]);
      return;
    }

    (async () => {
      try {
        setError(null);
        const [clinicData, vetsData] = await Promise.all([
          getClinicById(clinicId),
          getVets(clinicId),
        ]);

        setClinic(clinicData);
        setClinicForm({
          name: clinicData.name ?? '',
          email: clinicData.email ?? '',
          phone: clinicData.phone ?? '',
          address: clinicData.address ?? '',
          city: clinicData.city ?? '',
          zipCode: clinicData.zipCode ?? '',
          emergency: Boolean(clinicData.emergency),
        });
        setVets(vetsData);
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load clinic or vets');
      }
    })();
  }, [ready, user]);

  const canSaveClinic = useMemo(() => {
    const { name, email, phone, address, city, zipCode } = clinicForm;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    if (!address.trim()) return false;
    if (!city.trim()) return false;
    if (!zipCode.trim()) return false;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = /^[+0-9\s\-().]+$/.test(phone);
    const zipOk = /^[A-Za-z0-9\- ]+$/.test(zipCode);

    return emailOk && phoneOk && zipOk;
  }, [clinicForm]);

  const canCreateVet = useMemo(() => {
    if (!vetName.trim()) return false;
    if (!vetEmail.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vetEmail);
  }, [vetEmail, vetName]);

  function axiosMessage(err: unknown, fallback: string) {
    if (!axios.isAxiosError(err)) return fallback;
    return (
      (err.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }

  async function onSaveClinic() {
    if (!user?.clinicId || !canSaveClinic) return;

    setSavingClinic(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateClinic(user.clinicId, clinicForm);
      setClinic(updated);
      setMessage('Clinic profile updated');
    } catch (saveError) {
      console.error(saveError);
      setError(axiosMessage(saveError, 'Failed to update clinic'));
    } finally {
      setSavingClinic(false);
    }
  }

  async function onCreateVet() {
    if (!user?.clinicId || !canCreateVet) return;

    const inviteEmail = vetEmail.trim();

    setCreatingVet(true);
    setMessage(null);
    setError(null);

    try {
      const newVet = await createVetAndInvite({
        clinicId: user.clinicId,
        name: vetName.trim(),
        specialization: vetSpec.trim() || undefined,
        email: inviteEmail,
      });

      setVets((prev) => [...prev, newVet]);
      setMessage(`Vet "${newVet.name}" created and invite sent to ${inviteEmail}`);

      setVetName('');
      setVetEmail('');
      setVetSpec('');
    } catch (createError) {
      console.error(createError);
      setError(axiosMessage(createError, 'Failed to create and invite vet'));
    } finally {
      setCreatingVet(false);
    }
  }

  async function onInviteExistingVet(vetId: string) {
    const email = emailByVet[vetId]?.trim();
    if (!email) return;

    setInvitingVet(vetId);
    setMessage(null);
    setError(null);

    try {
      await inviteVet({ email, vetId });
      setMessage(`Invite sent to ${email}`);
      setEmailByVet((prev) => ({ ...prev, [vetId]: '' }));
    } catch (inviteError) {
      console.error(inviteError);
      setError(axiosMessage(inviteError, 'Failed to send invite'));
    } finally {
      setInvitingVet(null);
    }
  }

  if (!ready || !user) {
    return null;
  }

  if (!user.clinicId) {
    return (
      <div className="app-wrap">
        <div className="app-page max-w-4xl space-y-6">
          <div className="app-header">
            <div>
              <h1 className="app-title">Clinic Admin Dashboard</h1>
              <p className="app-subtitle">Manage your clinic profile and your veterinary team.</p>
            </div>
          </div>

          <section className="app-section space-y-2">
            <h2 className="text-lg font-semibold text-[#113a56]">Clinic setup pending</h2>
            <p className="text-sm text-[#5d7b8e]">
              Your account is not linked to a clinic yet. Please contact a super admin to assign a clinic.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrap">
      <div className="app-page max-w-6xl space-y-6">
        <div className="app-header">
          <div>
            <h1 className="app-title">Clinic Admin Dashboard</h1>
            <p className="app-subtitle">Update clinic details, add vets, and send account invites.</p>
          </div>
          {clinic?.name && <p className="text-sm font-medium text-[#234e67]">{clinic.name}</p>}
        </div>

        {message && <div className="status-ok">{message}</div>}
        {error && <div className="status-error">{error}</div>}

        <section className="app-section space-y-4">
          <h2 className="text-lg font-semibold text-[#113a56]">Clinic profile</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={clinicForm.name}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={clinicForm.email}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={clinicForm.phone}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-address">Address</Label>
              <Input
                id="c-address"
                value={clinicForm.address}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-city">City</Label>
              <Input
                id="c-city"
                value={clinicForm.city}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-zip">ZIP code</Label>
              <Input
                id="c-zip"
                value={clinicForm.zipCode}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, zipCode: event.target.value }))}
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-[#d6e4eb] bg-[#f8fbfc] px-3 py-2 md:col-span-2">
              <Switch
                checked={clinicForm.emergency}
                onCheckedChange={(checked: boolean) =>
                  setClinicForm((prev) => ({ ...prev, emergency: checked }))
                }
              />
              <span className="text-sm font-medium text-[#1f485f]">Offers emergency services</span>
            </label>
          </div>

          <Button onClick={onSaveClinic} disabled={!canSaveClinic || savingClinic}>
            {savingClinic ? 'Saving...' : 'Save clinic'}
          </Button>
        </section>

        <section className="app-section space-y-4">
          <h2 className="text-lg font-semibold text-[#113a56]">Add a new vet</h2>
          <p className="text-sm text-[#5d7b8e]">
            Create a vet profile and send an invite in one step.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="v-name">Vet name</Label>
              <Input
                id="v-name"
                value={vetName}
                onChange={(event) => setVetName(event.target.value)}
                placeholder="Dr. Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-email">Vet email</Label>
              <Input
                id="v-email"
                type="email"
                value={vetEmail}
                onChange={(event) => setVetEmail(event.target.value)}
                placeholder="vet@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-spec">Specialization (optional)</Label>
              <Input
                id="v-spec"
                value={vetSpec}
                onChange={(event) => setVetSpec(event.target.value)}
                placeholder="Cardiology"
              />
            </div>
          </div>

          <Button onClick={onCreateVet} disabled={!canCreateVet || creatingVet}>
            {creatingVet ? 'Creating...' : 'Create vet and send invite'}
          </Button>
        </section>

        <section className="app-section space-y-4">
          <h2 className="text-lg font-semibold text-[#113a56]">Existing vets</h2>

          {vets.length === 0 && (
            <p className="text-sm text-[#5d7b8e]">No vets yet. Create your first vet profile above.</p>
          )}

          <div className="space-y-3">
            {vets.map((vet) => (
              <article
                key={vet.id}
                className="rounded-xl border border-[#d5e3ea] bg-[#fbfdff] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-semibold text-[#123a55]">{vet.name}</p>
                    <p className="text-xs text-[#5d7b8e]">
                      {vet.specialization || 'General practice'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Invite email</Label>
                      <Input
                        type="email"
                        value={emailByVet[vet.id] ?? ''}
                        onChange={(event) =>
                          setEmailByVet((prev) => ({
                            ...prev,
                            [vet.id]: event.target.value,
                          }))
                        }
                        placeholder="vet@example.com"
                        className="w-full sm:w-64"
                      />
                    </div>

                    <Button
                      size="sm"
                      disabled={invitingVet === vet.id || !(emailByVet[vet.id] ?? '').trim()}
                      onClick={() => onInviteExistingVet(vet.id)}
                    >
                      {invitingVet === vet.id ? 'Sending...' : 'Send invite'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ClinicAdminDashboardPage() {
  return (
    <AuthGate roles={['CLINIC_ADMIN']}>
      <ClinicAdminDashboardInner />
    </AuthGate>
  );
}
