'use client';

import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getClinicSlots, getVetSlots } from '@/lib/fetchers';

const BOOKING_LEAD_MINUTES = 30;
const ZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Europe/Helsinki';

type Props = {
  vetId?: string;
  clinicId?: string;
  date: string;
  selectedTime?: string;
  onPick: (hhmm: string) => void;
};

export default function SlotPicker({ vetId, clinicId, date, selectedTime, onPick }: Props) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleSlots = useMemo(() => {
    const now = new Date();
    const nowInZone = toZonedTime(now, ZONE);
    const todayInZone = format(nowInZone, 'yyyy-MM-dd');

    if (date !== todayInZone) {
      return slots;
    }

    const earliestAllowed = now.getTime() + BOOKING_LEAD_MINUTES * 60_000;

    return slots.filter((slot) => {
      const slotUtc = fromZonedTime(`${date}T${slot}:00`, ZONE);
      return slotUtc.getTime() >= earliestAllowed;
    });
  }, [date, slots]);

  const load = useCallback(async () => {
    if (!date || (!vetId && !clinicId)) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = vetId
        ? await getVetSlots(vetId, date)
        : await getClinicSlots(clinicId as string, date);

      setSlots(data.map((slot) => slot.time));
    } catch (loadError) {
      console.error(loadError);
      setSlots([]);
      setError('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [clinicId, date, vetId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!date) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {loading && <div className="col-span-full text-sm text-[#5d7b8e]">Loading slots...</div>}

        {!loading && error && <div className="col-span-full text-sm text-red-600">{error}</div>}

        {!loading && !error && visibleSlots.length === 0 && (
          <div className="col-span-full text-sm text-[#5d7b8e]">No available slots</div>
        )}

        {visibleSlots.map((time) => {
          const selected = time === selectedTime;
          return (
            <Button
              key={time}
              variant={selected ? 'default' : 'secondary'}
              onClick={() => onPick(time)}
              className={selected ? 'ring-2 ring-[#7ea5bb]' : 'justify-center'}
            >
              {time}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
