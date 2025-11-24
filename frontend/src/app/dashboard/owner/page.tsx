'use client';
import AuthGate from '@/components/auth/AuthGate';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyAppointments, updateAppointmentStatus } from '@/lib/fetchers';
import { serverUtcToLocalLabel } from '@/lib/time';
import type { Appointment } from '@/lib/types';
import Link from 'next/link';


export default function OwnerDashboard() {
return (
<AuthGate roles={['OWNER']}>
<OwnerView />
</AuthGate>
);
}


function OwnerView() {
const [list, setList] = useState<Appointment[]>([]);
const load = async () => setList(await getMyAppointments());
useEffect(() => { void load(); }, []);
async function cancel(id: string) { await updateAppointmentStatus(id, 'CANCELLED'); await load(); }


return (
<div className="max-w-4xl mx-auto p-6 space-y-4">
<div className="flex justify-between items-center">
<h1 className="text-xl font-semibold">My Appointments</h1>
<Link href="/appointments/book"><Button>Book new</Button></Link>
</div>
{list.map((a) => (
<Card key={a.id}><CardContent className="p-4 flex items-center justify-between">
<div>
<div className="font-medium">{serverUtcToLocalLabel(a.date)} → {serverUtcToLocalLabel(a.endTime)}</div>
<div className="text-sm text-muted-foreground">{a.reason} • {a.status}</div>
</div>
{a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
<Button variant="destructive" onClick={() => cancel(a.id)}>Cancel</Button>
)}
</CardContent></Card>
))}
</div>
);
}