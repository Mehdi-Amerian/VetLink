// src/app/dashboard/super-admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { createClinic, getClinics, inviteClinicAdmin } from "@/lib/fetchers";
import type { Clinic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";

export default function SuperAdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [emailByClinic, setEmailByClinic] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicZip, setClinicZip] = useState("");
  const [clinicEmergency, setClinicEmergency] = useState(false);
  const [creatingClinic, setCreatingClinic] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[+0-9\s\-().]{7,20}$/;
  const ZIP_REGEX = /^[A-Za-z0-9\- ]{3,10}$/;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SUPER_ADMIN") {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const data = await getClinics();
        setClinics(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError("Failed to load clinics");
      }
    })();
  }, [
    ready,
    user,
    router,
    clinicName,
    clinicEmail,
    clinicPhone,
    clinicAddress,
    clinicCity,
    clinicZip,
    clinicEmergency,
  ]);

  const nameValid = clinicName.trim().length > 0;
  const emailValid = EMAIL_REGEX.test(clinicEmail.trim());
  const phoneValid = PHONE_REGEX.test(clinicPhone.trim());
  const addressValid = clinicAddress.trim().length > 0;
  const cityValid = clinicCity.trim().length > 0;
  const zipValid = ZIP_REGEX.test(clinicZip.trim());

  const canCreateClinic =
    nameValid &&
    emailValid &&
    phoneValid &&
    addressValid &&
    cityValid &&
    zipValid &&
    !creatingClinic;

  async function onCreateClinic() {
    if (!canCreateClinic) return;
    setCreatingClinic(true);

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

      setClinics((prev) => [...prev, newClinic]);

      // Clear form
      setClinicName("");
      setClinicEmail("");
      setClinicPhone("");
      setClinicAddress("");
      setClinicCity("");
      setClinicZip("");
      setClinicEmergency(false);

      alert("Clinic created");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const message = (e.response?.data as { message?: string } | undefined)
          ?.message;

        if (status === 409) {
          alert(message ?? "Clinic email or phone is already in use.");
        } else if (status === 400) {
          alert(message ?? "Invalid clinic data.");
        } else {
          alert(message ?? "Failed to create clinic.");
        }
      } else {
        alert("Failed to create clinic.");
      }
    } finally {
      setCreatingClinic(false);
    }
  }

  async function onInvite(clinicId: string) {
    const email = emailByClinic[clinicId]?.trim();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await inviteClinicAdmin({ email, clinicId });
      setMessage(`Invite sent to ${email}`);
      setEmailByClinic((prev) => ({ ...prev, [clinicId]: "" }));
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          "Failed to send invite";
        setError(msg);
      } else {
        setError("Failed to send invite");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !user || user.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Super admin dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Invite clinic admins for existing clinics.
      </p>

      <section className="mb-8 border rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create clinic</h2>
        <p className="text-sm text-gray-500">
          Create a minimal clinic profile so you can invite its first clinic
          admin.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="clinicName">Clinic name</Label>
            <Input
              id="clinicName"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="clinicEmail">Clinic email</Label>
            <Input
              id="clinicEmail"
              type="email"
              value={clinicEmail}
              onChange={(e) => setClinicEmail(e.target.value)}
            />
            {clinicEmail && !emailValid && (
              <p className="text-xs text-red-500 mt-1">
                Please enter a valid email address.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="clinicPhone">Phone</Label>
            <Input
              id="clinicPhone"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
            />
            {clinicPhone && !phoneValid && (
              <p className="text-xs text-red-500 mt-1">
                Please enter a valid phone number.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="clinicAddress">Address</Label>
            <Input
              id="clinicAddress"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="clinicCity">City</Label>
            <Input
              id="clinicCity"
              value={clinicCity}
              onChange={(e) => setClinicCity(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="clinicZip">ZIP code</Label>
            <Input
              id="clinicZip"
              value={clinicZip}
              onChange={(e) => setClinicZip(e.target.value)}
            />
            {clinicZip && !zipValid && (
              <p className="text-xs text-red-500 mt-1">
                Please enter a valid ZIP code.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              id="clinicEmergency"
              type="checkbox"
              checked={clinicEmergency}
              onChange={(e) => setClinicEmergency(e.target.checked)}
            />
            <Label htmlFor="clinicEmergency">Emergency clinic</Label>
          </div>
        </div>

        <Button
          onClick={onCreateClinic}
          disabled={!canCreateClinic || creatingClinic}
        >
          {creatingClinic ? "Creating…" : "Create clinic"}
        </Button>
      </section>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className="border rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium">{clinic.name}</div>
              <div className="text-xs text-muted-foreground">
                {clinic.email} · {clinic.city}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
              <div>
                <Label className="text-xs">Admin email</Label>
                <Input
                  type="email"
                  value={emailByClinic[clinic.id] ?? ""}
                  onChange={(e) =>
                    setEmailByClinic((prev) => ({
                      ...prev,
                      [clinic.id]: e.target.value,
                    }))
                  }
                  placeholder="admin@example.com"
                  className="w-56"
                />
              </div>
              <Button
                size="sm"
                disabled={loading || !(emailByClinic[clinic.id] ?? "").trim()}
                onClick={() => onInvite(clinic.id)}
              >
                Send admin invite
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
