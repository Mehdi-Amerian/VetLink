'use client';

import type {
  DateSelectArg,
  EventChangeArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useMemo, useState } from 'react';

import {
  addAvailabilityBlock,
  deleteAvailabilityBlock,
  updateAvailabilityBlock,
} from '@/lib/fetchers';
import type { Availability, Weekday } from '@/lib/types';

const WEEKDAY_TO_INDEX: Record<Weekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

function toHHmm(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function dateToWeekday(date: Date): Weekday {
  const map: Record<number, Weekday> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
  };
  return map[date.getDay()];
}

type Props = {
  availability: Availability[];
  onChanged: () => Promise<void>;
};

export default function VetAvailabilityCalendar({ availability, onChanged }: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = useMemo<EventInput[]>(
    () =>
      availability.map((block) => ({
        id: block.id,
        title: 'Available',
        daysOfWeek: [WEEKDAY_TO_INDEX[block.day]],
        startTime: block.startTime,
        endTime: block.endTime,
        classNames: ['vetlink-fc-availability'],
      })),
    [availability]
  );

  const onSelect = useCallback(
    async (arg: DateSelectArg) => {
      const day = dateToWeekday(arg.start);
      const startTime = toHHmm(arg.start);
      const endTime = toHHmm(arg.end);

      setWorking(true);
      setError(null);

      try {
        await addAvailabilityBlock({ day, startTime, endTime });
        await onChanged();
      } catch (selectError) {
        console.error(selectError);
        setError('Failed to add availability block');
      } finally {
        setWorking(false);
        arg.view.calendar.unselect();
      }
    },
    [onChanged]
  );

  const onEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const { id, start, end } = arg.event;
      if (!start || !end) return;

      setWorking(true);
      setError(null);

      try {
        await updateAvailabilityBlock(id, {
          day: dateToWeekday(start),
          startTime: toHHmm(start),
          endTime: toHHmm(end),
        });
        await onChanged();
      } catch (dropError) {
        console.error(dropError);
        setError('Failed to update availability block');
        arg.revert();
      } finally {
        setWorking(false);
      }
    },
    [onChanged]
  );

  const onEventResize = useCallback(
    async (arg: EventChangeArg) => {
      const { id, start, end } = arg.event;
      if (!start || !end) return;

      setWorking(true);
      setError(null);

      try {
        await updateAvailabilityBlock(id, {
          day: dateToWeekday(start),
          startTime: toHHmm(start),
          endTime: toHHmm(end),
        });
        await onChanged();
      } catch (resizeError) {
        console.error(resizeError);
        setError('Failed to update availability block');
        arg.revert();
      } finally {
        setWorking(false);
      }
    },
    [onChanged]
  );

  const onEventClick = useCallback(
    async (arg: EventClickArg) => {
      const ok = confirm('Delete this availability block?');
      if (!ok) return;

      setWorking(true);
      setError(null);

      try {
        await deleteAvailabilityBlock(arg.event.id);
        await onChanged();
      } catch (deleteError) {
        console.error(deleteError);
        setError('Failed to delete availability block');
      } finally {
        setWorking(false);
      }
    },
    [onChanged]
  );

  return (
    <div className="space-y-3 rounded-xl border border-[#d6e4ec] bg-[#fbfdff] p-3">
      {error && <div className="status-error">{error}</div>}

      <div className="rounded-xl border border-[#dce8ee] bg-white p-2">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="auto"
          nowIndicator
          selectable={!working}
          selectMirror
          editable={!working}
          eventResizableFromStart={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          snapDuration="00:30:00"
          allDaySlot={false}
          firstDay={1}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          events={events}
          select={onSelect}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          eventClick={onEventClick}
        />
      </div>

      <p className="text-xs text-[#5d7b8e]">
        Tip: drag to create availability, drag or resize to edit, and click a block to delete.
      </p>
    </div>
  );
}
