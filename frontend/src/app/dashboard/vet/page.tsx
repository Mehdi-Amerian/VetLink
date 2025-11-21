'use client';
import AuthGate from '@/components/auth/AuthGate';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyVetAppointments, updateAppointmentStatus } from '@/lib/fetchers';
import { serverUtcToLocalLabel } from '@/lib/time';
import type { Appointment } from '@/lib/types';


export default function VetDashboard() {
return (
<AuthGate roles={['VET', 'CLINIC_ADMIN']}>
<VetView />
</AuthGate>
);
}


function VetView() {
const [list, setList] = useState<Appointment[]>([]);
const load = async () => setList(await getMyVetAppointments());
useEffect(() => { void load(); }, []);
async function confirm(id: string) { await updateAppointmentStatus(id, 'CONFIRMED'); await load(); }
async function complete(id: string) { await updateAppointmentStatus(id, 'COMPLETED'); await load(); }


return (
<div className="max-w-4xl mx-auto p-6 space-y-4">
<h1 className="text-xl font-semibold">Today & Upcoming</h1>
{list.map((a) => (
<Card key={a.id}><CardContent className="p-4 flex items-center justify-between">
<div>
<div className="font-medium">{serverUtcToLocalLabel(a.date)} • {a.pet?.name ?? a.petId}</div>
<div className="text-sm text-muted-foreground">{a.reason} • {a.status}</div>
</div>
<div className="flex gap-2">
{a.status === 'PENDING' && (<Button onClick={() => confirm(a.id)}>Confirm</Button>)}
{a.status === 'CONFIRMED' && (<Button onClick={() => complete(a.id)}>Complete</Button>)}
</div>
</CardContent></Card>
))}
</div>
);
}