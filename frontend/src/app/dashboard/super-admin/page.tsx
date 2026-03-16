'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createClinic, getClinics, inviteClinicAdmin } from '@/lib/fetchers';
import type { Clinic } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

function SuperAdminDashboardInner() {
  const { user, ready } = useAuth();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [emailByClinic, setEmailByClinic] = useState<Record<string, string>>({});

  const [loadingClinics, setLoadingClinics] = useState(false);
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [invitingClinicId, setInvitingClinicId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicZip, setClinicZip] = useState('');
  const [clinicEmergency, setClinicEmergency] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[+0-9\s\-().]{7,20}$/;
  const ZIP_REGEX = /^[A-Za-z0-9\- ]{3,10}$/;

  useEffect(() => {
    if (!ready || !user) return;

    (async () => {
      setLoadingClinics(true);
      try {
        const data = await getClinics();
        setClinics(data);
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load clinics');
      } finally {
        setLoadingClinics(false);
      }
    })();
  }, [ready, user]);

  const nameValid = clinicName.trim().length > 0;
  const emailValid = EMAIL_REGEX.test(clinicEmail.trim());
  const phoneValid = PHONE_REGEX.test(clinicPhone.trim());
  const addressValid = clinicAddress.trim().length > 0;
  const cityValid = clinicCity.trim().length > 0;
  const zipValid = ZIP_REGEX.test(clinicZip.trim());

  const canCreateClinic = useMemo(
    () =>
      nameValid &&
      emailValid &&
      phoneValid &&
      addressValid &&
      cityValid &&
      zipValid &&
      !creatingClinic,
    [
      addressValid,
      cityValid,
      creatingClinic,
      emailValid,
      nameValid,
      phoneValid,
      zipValid,
    ]
  );

  function getAxiosMessage(err: unknown, fallback: string) {
    if (!axios.isAxiosError(err)) return fallback;
    return (
      (err.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }

  async function onCreateClinic() {
    if (!canCreateClinic) return;

    setCreatingClinic(true);
    setMessage(null);
    setError(null);

    try {
      const newClinic = await createClinic({
        name: clinicName.trim(),
        email: clinicEmail.trim(),
        phone: clinicPhone.trim(),
        address: clinicAddress.trim(),
        city: clinicCity.trim(),
        zipCode: clinicZip.trim(),
        emergency: clinicEmergency,
      });

      setClinics((prev) => [newClinic, ...prev]);
      setMessage(`Clinic "${newClinic.name}" created`);

      setClinicName('');
      setClinicEmail('');
      setClinicPhone('');
      setClinicAddress('');
      setClinicCity('');
      setClinicZip('');
      setClinicEmergency(false);
    } catch (createError: unknown) {
      if (axios.isAxiosError(createError)) {
        if (createError.response?.status === 409) {
          setError(getAxiosMessage(createError, 'Clinic email or phone is already in use'));
        } else if (createError.response?.status === 400) {
          setError(getAxiosMessage(createError, 'Invalid clinic data'));
        } else {
          setError(getAxiosMessage(createError, 'Failed to create clinic'));
        }
      } else {
        setError('Failed to create clinic');
      }
    } finally {
      setCreatingClinic(false);
    }
  }

  async function onInvite(clinicId: string) {
    const email = emailByClinic[clinicId]?.trim();
    if (!email) return;

    setInvitingClinicId(clinicId);
    setMessage(null);
    setError(null);

    try {
      await inviteClinicAdmin({ email, clinicId });
      setMessage(`Invite sent to ${email}`);
      setEmailByClinic((prev) => ({ ...prev, [clinicId]: '' }));
    } catch (inviteError: unknown) {
      setError(getAxiosMessage(inviteError, 'Failed to send invite'));
    } finally {
      setInvitingClinicId(null);
    }
  }

  if (!ready || !user) {
    return null;
  }

  return (
    <div className="app-wrap">
      <div className="app-page max-w-6xl space-y-6">
        <div className="app-header">
          <div>
            <h1 className="app-title">Super Admin Dashboard</h1>
            <p className="app-subtitle">Create clinics and invite their first clinic admins.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void (async () => {
            setLoadingClinics(true);
            try {
              setError(null);
              setClinics(await getClinics());
            } catch (refreshError) {
              console.error(refreshError);
              setError('Failed to refresh clinics');
            } finally {
              setLoadingClinics(false);
            }
          })()}>
            {loadingClinics ? 'Refreshing...' : 'Refresh clinics'}
          </Button>
        </div>

        {message && <div className="status-ok">{message}</div>}
        {error && <div className="status-error">{error}</div>}

        <section className="app-section space-y-4">
          <h2 className="text-lg font-semibold text-[#113a56]">Create clinic</h2>
          <p className="text-sm text-[#5d7b8e]">
            Add a clinic profile first, then invite a clinic admin from the list below.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clinicName">Clinic name</Label>
              <Input id="clinicName" value={clinicName} onChange={(event) => setClinicName(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicEmail">Clinic email</Label>
              <Input
                id="clinicEmail"
                type="email"
                value={clinicEmail}
                onChange={(event) => setClinicEmail(event.target.value)}
              />
              {clinicEmail && !emailValid && (
                <p className="text-xs text-red-600">Please enter a valid email address.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicPhone">Phone</Label>
              <Input id="clinicPhone" value={clinicPhone} onChange={(event) => setClinicPhone(event.target.value)} />
              {clinicPhone && !phoneValid && (
                <p className="text-xs text-red-600">Please enter a valid phone number.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicAddress">Address</Label>
              <Input
                id="clinicAddress"
                value={clinicAddress}
                onChange={(event) => setClinicAddress(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicCity">City</Label>
              <Input id="clinicCity" value={clinicCity} onChange={(event) => setClinicCity(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicZip">ZIP code</Label>
              <Input id="clinicZip" value={clinicZip} onChange={(event) => setClinicZip(event.target.value)} />
              {clinicZip && !zipValid && (
                <p className="text-xs text-red-600">Please enter a valid ZIP code.</p>
              )}
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-[#d6e4eb] bg-[#f8fbfc] px-3 py-2 md:col-span-2">
              <Switch checked={clinicEmergency} onCheckedChange={setClinicEmergency} />
              <span className="text-sm font-medium text-[#1f485f]">Emergency clinic</span>
            </label>
          </div>

          <Button onClick={onCreateClinic} disabled={!canCreateClinic || creatingClinic}>
            {creatingClinic ? 'Creating...' : 'Create clinic'}
          </Button>
        </section>

        <section className="app-section space-y-4">
          <h2 className="text-lg font-semibold text-[#113a56]">Clinics</h2>

          {loadingClinics && clinics.length === 0 && (
            <p className="text-sm text-[#5d7b8e]">Loading clinics...</p>
          )}

          {!loadingClinics && clinics.length === 0 && (
            <p className="text-sm text-[#5d7b8e]">No clinics yet. Create one above to get started.</p>
          )}

          <div className="space-y-3">
            {clinics.map((clinic) => (
              <article
                key={clinic.id}
                className="rounded-xl border border-[#d5e3ea] bg-[#fbfdff] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-semibold text-[#123a55]">{clinic.name}</p>
                    <p className="text-xs text-[#5d7b8e]">
                      {clinic.email} | {clinic.city}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Admin email</Label>
                      <Input
                        type="email"
                        value={emailByClinic[clinic.id] ?? ''}
                        onChange={(event) =>
                          setEmailByClinic((prev) => ({
                            ...prev,
                            [clinic.id]: event.target.value,
                          }))
                        }
                        placeholder="admin@example.com"
                        className="w-full sm:w-64"
                      />
                    </div>

                    <Button
                      size="sm"
                      disabled={invitingClinicId === clinic.id || !(emailByClinic[clinic.id] ?? '').trim()}
                      onClick={() => onInvite(clinic.id)}
                    >
                      {invitingClinicId === clinic.id ? 'Sending...' : 'Send admin invite'}
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

export default function SuperAdminDashboardPage() {
  return (
    <AuthGate roles={['SUPER_ADMIN']}>
      <SuperAdminDashboardInner />
    </AuthGate>
  );
}
