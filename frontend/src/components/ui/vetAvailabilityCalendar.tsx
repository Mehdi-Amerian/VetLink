"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, DateSelectArg, EventDropArg, EventChangeArg, EventClickArg } from "@fullcalendar/core";

import { useCallback, useMemo } from "react";
import type { Availability, Weekday } from "@/lib/types";
import { addAvailabilityBlock, updateAvailabilityBlock, deleteAvailabilityBlock } from "@/lib/fetchers";

const WEEKDAY_TO_INDEX: Record<Weekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

function toHHmm(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function dateToWeekday(d: Date): Weekday {
  const idx = d.getDay(); // 0..6 (Sun..Sat)
  const map: Record<number, Weekday> = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  };
  return map[idx];
}

type Props = {
  availability: Availability[];
  onChanged: () => Promise<void>; // reload from server
};

export default function VetAvailabilityCalendar({ availability, onChanged }: Props) {
  // Map your weekly blocks to events shown in the *current* week view
  const events = useMemo<EventInput[]>(() => {
    // Anchor events to the current week by using "daysOfWeek" + startTime/endTime (recurring)
    // FullCalendar supports recurring weekly events with these props.
    return availability.map((a) => ({
      id: a.id,
      title: "Available",
      daysOfWeek: [WEEKDAY_TO_INDEX[a.day]],
      startTime: a.startTime, // "HH:mm"
      endTime: a.endTime,     // "HH:mm"
    }));
  }, [availability]);

  // Create block by selecting time range
  const onSelect = useCallback(async (arg: DateSelectArg) => {
    // FullCalendar selection gives actual dates; convert to weekday + HH:mm
    const day = dateToWeekday(arg.start);
    const startTime = toHHmm(arg.start);
    const endTime = toHHmm(arg.end);

    try {
      await addAvailabilityBlock({ day, startTime, endTime });
      await onChanged();
    } finally {
      arg.view.calendar.unselect();
    }
  }, [onChanged]);

  // Update block by drag
  const onEventDrop = useCallback(async (arg: EventDropArg) => {
    const id = arg.event.id;
    const start = arg.event.start;
    const end = arg.event.end;
    if (!start || !end) return;

    const day = dateToWeekday(start);
    const startTime = toHHmm(start);
    const endTime = toHHmm(end);

    try {
      await updateAvailabilityBlock(id, { day, startTime, endTime });
      await onChanged();
    } catch (e) {
      // revert UI if server rejects (overlap, invalid, etc.)
      arg.revert();
      throw e;
    }
  }, [onChanged]);

  // Update block by resize
  const onEventResize = useCallback(async (arg: EventChangeArg) => {
    const id = arg.event.id;
    const start = arg.event.start;
    const end = arg.event.end;
    if (!start || !end) return;

    const day = dateToWeekday(start);
    const startTime = toHHmm(start);
    const endTime = toHHmm(end);

    try {
      await updateAvailabilityBlock(id, { day, startTime, endTime });
      await onChanged();
    } catch (e) {
      arg.revert();
      throw e;
    }
  }, [onChanged]);

  // Delete block on click (simple UX)
  const onEventClick = useCallback(async (arg: EventClickArg) => {
    const ok = confirm("Delete this availability block?");
    if (!ok) return;

    await deleteAvailabilityBlock(arg.event.id);
    await onChanged();
  }, [onChanged]);

  return (
    <div className="rounded-lg border p-3">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        nowIndicator
        selectable
        selectMirror
        editable
        eventResizableFromStart={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"          // your slotMinutes
        snapDuration="00:30:00"
        allDaySlot={false}
        firstDay={1}                      // Monday
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        events={events}
        select={onSelect}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        eventClick={onEventClick}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Tip: drag to create availability, drag/resize to edit, click a block to delete.
      </p>
    </div>
  );
}
