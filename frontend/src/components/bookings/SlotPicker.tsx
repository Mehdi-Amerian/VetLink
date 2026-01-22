'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getVetSlots, getClinicSlots } from '@/lib/fetchers';


type Props = { vetId?: string; clinicId?: string; date: string; onPick: (hhmm: string) => void };
export default function SlotPicker({ vetId, clinicId, date, onPick }: Props) {
const [slots, setSlots] = useState<string[]>([]);
const [loading, setLoading] = useState(false);
const load = useCallback(async () => {
if (!date || (!vetId && !clinicId)) return;
setLoading(true);
try {
const data = vetId
? await getVetSlots(vetId, date)
: await getClinicSlots(clinicId!, date, vetId);
setSlots(data.map((s) => s.time));
} finally {
setLoading(false);
}
}, [vetId, clinicId, date]);
useEffect(() => { void load(); }, [load]);
if (!date) return null;
return (
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
{loading && <div className="col-span-full text-sm">Loading slots…</div>}
{!loading && slots.length === 0 && <div className="col-span-full text-sm">No slots</div>}
{slots.map((t) => (
<Button key={t} variant="secondary" onClick={() => onPick(t)} className="justify-center">{t}</Button>
))}
</div>
);
}