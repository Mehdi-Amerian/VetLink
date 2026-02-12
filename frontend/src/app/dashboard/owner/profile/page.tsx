"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import AuthGate from "@/components/auth/AuthGate";
import { useAuth } from "@/providers/auth-provider";
import type { Pet } from "@/lib/types";
import {
  getPets,
  createPetForOwner,
  updatePet,
  deletePet,
  updateMyOwnerProfile,
} from "@/lib/fetchers";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function OwnerProfileInner() {
  const { user, ready } = useAuth();
  const router = useRouter();

  // ---- profile ----
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ---- pets ----
  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);

  // inline edit state
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editingPetName, setEditingPetName] = useState("");

  // add pet state
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetBirth, setNewPetBirth] = useState(""); // YYYY-MM-DD
  const [addingPet, setAddingPet] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // guards + initial load
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "OWNER") {
      router.replace("/");
      return;
    }

    setFullName(user.fullName ?? "");
    void loadPets();
  }, [ready, user, router]);

  async function loadPets() {
    setLoadingPets(true);
    try {
      const list = await getPets();
      setPets(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load pets");
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

      // keep local auth user in sync (adjust if your auth provider has a setter)
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      localStorage.setItem("user", JSON.stringify({ ...(stored ?? {}), ...updated }));

      setMessage("Profile updated");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = typeof e.response?.data?.message === "string"
            ? e.response.data.message
            : 'Failed to update profile';
        setError(msg);
       } else {
        setError("Failed to update profile");
      }
  } finally {
      setSavingProfile(false);
    }
    }

  // ---- pets actions ----

  function startEditPet(p: Pet) {
    setEditingPetId(p.id);
    setEditingPetName(p.name ?? "");
    setMessage(null);
    setError(null);
  }

  function cancelEditPet() {
    setEditingPetId(null);
    setEditingPetName("");
  }

  async function savePetName(petId: string) {
    const nextName = editingPetName.trim();
    if (!nextName) return;

    try {
      setMessage(null);
      setError(null);

      const updated = await updatePet(petId, { name: nextName });

      setPets((prev) => prev.map((p) => (p.id === petId ? updated : p)));
      setMessage("Pet updated");
      cancelEditPet();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = typeof e.response?.data?.message === "string"
            ? e.response.data.message
            : 'Failed to update pet';
        setError(msg);
      } else {
        setError("Failed to update pet");
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

      setNewPetName("");
      setNewPetSpecies("");
      setNewPetBreed("");
      setNewPetBirth("");

      setMessage("Pet added");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = typeof e.response?.data?.message === "string"
            ? e.response.data.message
            : 'Failed to add pet';
        setError(msg);
      } else {
        setError("Failed to add pet");
      }
    } finally {
      setAddingPet(false);
    }
  }

  async function onDeletePet(id: string) {
    const ok = confirm("Delete this pet? (You can’t book appointments for it anymore.)");
    if (!ok) return;

    try {
      setMessage(null);
      setError(null);

      await deletePet(id);
      setPets((prev) => prev.filter((p) => p.id !== id));
      setMessage("Pet deleted");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = typeof e.response?.data?.message === "string"
            ? e.response.data.message
            : 'Failed to delete pet';
        setError(msg);
      } else {
        setError("Failed to delete pet");
      }
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My profile</h1>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ---- profile card ---- */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-medium">Account</h2>

          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input value={user.email ?? ""} disabled />
          </div>

          <Button disabled={!canSaveProfile || savingProfile} onClick={onSaveProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      {/* ---- pets card ---- */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">My pets</h2>
            <Button variant="outline" size="sm" onClick={loadPets} disabled={loadingPets}>
              {loadingPets ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {/* Add pet */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="font-medium">Add a pet</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={newPetName} onChange={(e) => setNewPetName(e.target.value)} />
              </div>
              <div>
                <Label>Species</Label>
                <Input
                  value={newPetSpecies}
                  onChange={(e) => setNewPetSpecies(e.target.value)}
                  placeholder="Dog, Cat…"
                />
              </div>
              <div>
                <Label>Breed (optional)</Label>
                <Input value={newPetBreed} onChange={(e) => setNewPetBreed(e.target.value)} />
              </div>
              <div>
                <Label>Birth date</Label>
                <Input
                  type="date"
                  value={newPetBirth}
                  onChange={(e) => setNewPetBirth(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={onAddPet}
              disabled={
                addingPet ||
                !newPetName.trim() ||
                !newPetSpecies.trim() ||
                !newPetBirth
              }
            >
              {addingPet ? "Adding…" : "Add pet"}
            </Button>
          </div>

          {/* Pets list */}
          {loadingPets && pets.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading pets…</p>
          )}

          {!loadingPets && pets.length === 0 && (
            <p className="text-sm text-muted-foreground">No pets yet. Add your first pet above.</p>
          )}

          {pets.length > 0 && (
            <div className="space-y-2">
              {pets.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    {editingPetId === p.id ? (
                      <div className="space-y-2">
                        <Label className="text-xs">Pet name</Label>
                        <Input
                          value={editingPetName}
                          onChange={(e) => setEditingPetName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => savePetName(p.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditPet}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.species}
                          {p.breed ? ` • ${p.breed}` : ""}
                        </div>
                      </>
                    )}
                  </div>

                  {editingPetId !== p.id && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditPet(p)}>
                        Edit name
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeletePet(p.id)}>
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
  );
}

export default function OwnerProfilePage() {
  return (
    <AuthGate roles={["OWNER"]}>
      <OwnerProfileInner />
    </AuthGate>
  );
}
