"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import {
  createVetAndInvite,
  getVets,
  inviteVet,
  getClinicById,
  updateClinic,
} from "@/lib/fetchers";
import type { Clinic, Vet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";

export default function ClinicAdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [vets, setVets] = useState<Vet[]>([]);
  const [emailByVet, setEmailByVet] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinicForm, setClinicForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    emergency: false,
  });
  const [savingClinic, setSavingClinic] = useState(false);
  const [invitingVet, setInvitingVet] = useState<string | null>(null);

  //New vet form state
  const [vetName, setVetName] = useState("");
  const [vetEmail, setVetEmail] = useState("");
  const [vetSpec, setVetSpec] = useState("");
  const [creatingVet, setCreatingVet] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "CLINIC_ADMIN") {
      router.replace("/");
      return;
    }

    // If no clinicId yet, don't redirect – just show an empty state
    if (!user.clinicId) {
      setClinic(null);
      setClinicForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
        emergency: false,
      });
      setVets([]);
      return;
    }

    const clinicId = user.clinicId;

    (async () => {
      try {
        setError(null);
        // load clinic
        const c = await getClinicById(clinicId);
        setClinic(c);
        setClinicForm({
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          city: c.city,
          zipCode: c.zipCode,
          emergency: c.emergency,
        });

        // load vets
        const v = await getVets(clinicId);
        setVets(v);
      } catch (e) {
        console.error(e);
        setError("Failed to load clinic or vets");
      }
    })();
  }, [ready, user, router]);

  const canSaveClinic = useMemo(() => {
    const { name, email, phone, address, city, zipCode } = clinicForm;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    if (!address.trim()) return false;
    if (!city.trim()) return false;
    if (!zipCode.trim()) return false;

    // Very basic email and phone checks
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = /^[+0-9\s\-().]+$/.test(phone);
    const zipOk = /^[A-Za-z0-9\- ]+$/.test(zipCode);

    return emailOk && phoneOk && zipOk;
  }, [clinicForm]);

  const canCreateVet = useMemo(() => {
    if (!vetName.trim()) return false;
    if (!vetEmail.trim()) return false;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vetEmail);
    return emailOk;
  }, [vetName, vetEmail]);

  // ---- handlers ----

  async function onSaveClinic() {
    if (!clinic || !user?.clinicId || !canSaveClinic) return;
    setSavingClinic(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateClinic(user.clinicId, clinicForm);
      setClinic(updated);
      setMessage("Clinic profile updated");
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          "Failed to update clinic";
        setError(msg);
      } else {
        setError("Failed to update clinic");
      }
    } finally {
      setSavingClinic(false);
    }
  }

  async function onCreateVet() {
    if (!user?.clinicId || !canCreateVet) return;
    setCreatingVet(true);
    setMessage(null);
    setError(null);

    try {
      const newVet = await createVetAndInvite({
        clinicId: user.clinicId,
        name: vetName.trim(),
        specialization: vetSpec.trim() || undefined,
        email: vetEmail.trim(), // this sends the invite automatically
      });

      // Add to local list
      setVets((prev) => [...prev, newVet]);

      setMessage(
        `Vet "${newVet.name}" created and invite sent to ${vetEmail.trim()}`
      );

      // Clear form
      setVetName("");
      setVetEmail("");
      setVetSpec("");
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          "Failed to create and invite vet";
        setError(msg);
      } else {
        setError("Failed to create and invite vet");
      }
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
      setEmailByVet((prev) => ({ ...prev, [vetId]: "" }));
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          "Failed to send invite";
        setError(msg);
      } else {
        setError("Failed to send invite");
      }
    } finally {
      setInvitingVet(null);
    }
  }

  if (!ready || !user || user.role !== "CLINIC_ADMIN") {
    return null;
  }

  if (!user.clinicId) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Clinic admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your account is not yet linked to a clinic. Please contact a super
          admin to assign a clinic to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Clinic admin dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Manage your clinic profile and invite vets to activate their accounts.
      </p>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ---- Clinic profile ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Clinic profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              value={clinicForm.name}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={clinicForm.email}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              value={clinicForm.phone}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="c-address">Address</Label>
            <Input
              id="c-address"
              value={clinicForm.address}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="c-city">City</Label>
            <Input
              id="c-city"
              value={clinicForm.city}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, city: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="c-zip">ZIP code</Label>
            <Input
              id="c-zip"
              value={clinicForm.zipCode}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, zipCode: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={clinicForm.emergency}
              onCheckedChange={(checked: boolean) =>
                setClinicForm((f) => ({ ...f, emergency: checked }))
              }
            />
            <Label>Offers emergency services</Label>
          </div>
        </div>
        <Button
          onClick={onSaveClinic}
          disabled={!canSaveClinic || savingClinic}
        >
          {savingClinic ? "Saving…" : "Save clinic"}
        </Button>
      </section>

      {/* ---- Create new vet ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Add a new vet</h2>
        <p className="text-sm text-muted-foreground">
          Create a vet profile for this clinic and optionally send them an
          invite immediately.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="v-name">Vet name</Label>
            <Input
              id="v-name"
              value={vetName}
              onChange={(e) => setVetName(e.target.value)}
              placeholder="Dr. Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="v-email">Vet email (for invite)</Label>
            <Input
              id="v-email"
              type="email"
              value={vetEmail}
              onChange={(e) => setVetEmail(e.target.value)}
              placeholder="vet@example.com"
            />
          </div>
          <div>
            <Label htmlFor="v-spec">Specialization (optional)</Label>
            <Input
              id="v-spec"
              value={vetSpec}
              onChange={(e) => setVetSpec(e.target.value)}
              placeholder="Cardiology"
            />
          </div>
        </div>

        <Button onClick={onCreateVet} disabled={!canCreateVet || creatingVet}>
          {creatingVet ? "Creating…" : "Create vet (and invite)"}
        </Button>
      </section>

      {/* ---- Existing vets & invites ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Existing vets</h2>
        {vets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No vets yet. Create one above to get started.
          </p>
        )}

        <div className="space-y-4">
          {vets.map((vet) => (
            <div
              key={vet.id}
              className="border rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{vet.name}</div>
                {vet.specialization && (
                  <div className="text-xs text-muted-foreground">
                    {vet.specialization}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
                <div>
                  <Label className="text-xs">Invite email</Label>
                  <Input
                    type="email"
                    value={emailByVet[vet.id] ?? ""}
                    onChange={(e) =>
                      setEmailByVet((prev) => ({
                        ...prev,
                        [vet.id]: e.target.value,
                      }))
                    }
                    placeholder="vet@example.com"
                    className="w-56"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={
                    invitingVet === vet.id || !(emailByVet[vet.id] ?? "").trim()
                  }
                  onClick={() => onInviteExistingVet(vet.id)}
                >
                  {invitingVet === vet.id ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
