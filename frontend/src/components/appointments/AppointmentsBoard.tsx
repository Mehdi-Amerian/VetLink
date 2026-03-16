'use client';

import type { EventClickArg, EventInput } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { serverUtcToLocalLabel } from '@/lib/time';
import type { AppointmentView, AppointmentsPage, DashboardAppointment } from '@/lib/types';

type BoardRole = 'OWNER' | 'VET';

type LoadAppointmentsParams = {
  view: AppointmentView;
  page: number;
  pageSize: number;
};

type Props = {
  role: BoardRole;
  loadAppointments: (
    params: LoadAppointmentsParams
  ) => Promise<AppointmentsPage<DashboardAppointment>>;
};

const UPCOMING_PAGE_SIZE = 100;
const HISTORY_PAGE_SIZE = 12;

function eventTitle(appointment: DashboardAppointment, role: BoardRole): string {
  if (role === 'OWNER') {
    return `${appointment.pet?.name ?? 'Pet'} - ${appointment.vet?.name ?? 'Vet'}`;
  }
  return `${appointment.pet?.name ?? 'Pet'} - ${appointment.owner?.fullName ?? 'Owner'}`;
}

function eventSubtitle(appointment: DashboardAppointment, role: BoardRole): string {
  const side =
    role === 'OWNER'
      ? appointment.vet?.name ?? 'Unknown vet'
      : appointment.owner?.fullName ?? 'Unknown owner';
  return `${side} | ${appointment.reason}`;
}

function historyStatus(appointment: DashboardAppointment): string {
  return appointment.cancelledAt ? 'Cancelled' : 'Completed';
}

function searchableText(appointment: DashboardAppointment, role: BoardRole): string {
  const ownerOrVet =
    role === 'OWNER' ? appointment.vet?.name : appointment.owner?.fullName;
  return [
    appointment.reason,
    appointment.pet?.name,
    appointment.clinic?.name,
    ownerOrVet,
    appointment.owner?.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function AppointmentsBoard({ role, loadAppointments }: Props) {
  const [activeTab, setActiveTab] = useState<AppointmentView>('upcoming');
  const [upcoming, setUpcoming] = useState<AppointmentsPage<DashboardAppointment> | null>(null);
  const [history, setHistory] = useState<AppointmentsPage<DashboardAppointment> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string | null>(null);

  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUpcoming = useCallback(async () => {
    setLoadingUpcoming(true);
    setError(null);
    try {
      const data = await loadAppointments({
        view: 'upcoming',
        page: 1,
        pageSize: UPCOMING_PAGE_SIZE,
      });
      setUpcoming(data);
    } catch (loadError: unknown) {
      if (axios.isAxiosError(loadError)) {
        const message =
          (loadError.response?.data as { message?: string } | undefined)?.message ??
          'Failed to load upcoming appointments';
        setError(message);
      } else {
        setError('Failed to load upcoming appointments');
      }
    } finally {
      setLoadingUpcoming(false);
    }
  }, [loadAppointments]);

  const loadHistory = useCallback(
    async (page: number) => {
      setLoadingHistory(true);
      setError(null);
      try {
        const data = await loadAppointments({
          view: 'history',
          page,
          pageSize: HISTORY_PAGE_SIZE,
        });
        setHistory(data);
      } catch (loadError: unknown) {
        if (axios.isAxiosError(loadError)) {
          const message =
            (loadError.response?.data as { message?: string } | undefined)?.message ??
            'Failed to load appointment history';
          setError(message);
        } else {
          setError('Failed to load appointment history');
        }
      } finally {
        setLoadingHistory(false);
      }
    },
    [loadAppointments]
  );

  useEffect(() => {
    void loadUpcoming();
  }, [loadUpcoming]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    void loadHistory(historyPage);
  }, [activeTab, historyPage, loadHistory]);

  useEffect(() => {
    if (!upcoming || upcoming.appointments.length === 0) {
      setSelectedUpcomingId(null);
      return;
    }

    const stillExists = upcoming.appointments.some((appointment) => appointment.id === selectedUpcomingId);
    if (!stillExists) {
      setSelectedUpcomingId(upcoming.appointments[0].id);
    }
  }, [selectedUpcomingId, upcoming]);

  const upcomingEvents = useMemo<EventInput[]>(
    () =>
      (upcoming?.appointments ?? []).map((appointment) => ({
        id: appointment.id,
        title: eventTitle(appointment, role),
        start: appointment.date,
        end: appointment.endTime,
        classNames: ['vetlink-fc-event'],
      })),
    [upcoming?.appointments, role]
  );

  const selectedUpcoming = useMemo(
    () =>
      (upcoming?.appointments ?? []).find(
        (appointment) => appointment.id === selectedUpcomingId
      ) ?? null,
    [selectedUpcomingId, upcoming?.appointments]
  );

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history?.appointments ?? [];

    return (history?.appointments ?? []).filter((appointment) =>
      searchableText(appointment, role).includes(query)
    );
  }, [history?.appointments, historySearch, role]);

  const upcomingTotal = upcoming?.pagination.total ?? upcoming?.appointments.length ?? 0;
  const historyTotal = history?.pagination.total ?? 0;

  function onUpcomingClick(arg: EventClickArg) {
    setSelectedUpcomingId(arg.event.id);
  }

  function refreshActiveTab() {
    if (activeTab === 'upcoming') {
      void loadUpcoming();
      return;
    }
    void loadHistory(historyPage);
  }

  const historyPageLabel =
    history?.pagination.totalPages && history.pagination.totalPages > 0
      ? `${history.pagination.page} / ${history.pagination.totalPages}`
      : '0 / 0';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d4e2e9] bg-white/80 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => setActiveTab('history')}
            >
              History
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-[#577387]">
              Upcoming: <span className="font-semibold text-[#143b57]">{upcomingTotal}</span>
            </p>
            <p className="text-xs text-[#577387]">
              History: <span className="font-semibold text-[#143b57]">{historyTotal}</span>
            </p>
            <Button size="sm" variant="outline" onClick={refreshActiveTab}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="status-error">{error}</div>}

      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {loadingUpcoming && !upcoming && (
            <Card className="border-[#d5e3ea] bg-white/90">
              <CardContent className="p-4 text-sm text-[#5d7b8e]">
                Loading upcoming appointments...
              </CardContent>
            </Card>
          )}

          {!loadingUpcoming && (upcoming?.appointments.length ?? 0) === 0 && (
            <Card className="border-[#d5e3ea] bg-white/90">
              <CardContent className="p-4 text-sm text-[#5d7b8e]">
                No upcoming appointments.
              </CardContent>
            </Card>
          )}

          {(upcoming?.appointments.length ?? 0) > 0 && (
            <>
              <Card className="border-[#d5e3ea] bg-white/90">
                <CardContent className="p-3">
                  <div className="rounded-xl border border-[#d8e5ec] bg-[#fcfeff] p-2">
                    <FullCalendar
                      plugins={[timeGridPlugin]}
                      initialView="timeGridWeek"
                      height="auto"
                      nowIndicator
                      allDaySlot={false}
                      slotMinTime="06:00:00"
                      slotMaxTime="22:00:00"
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'timeGridWeek,timeGridDay',
                      }}
                      events={upcomingEvents}
                      eventClick={onUpcomingClick}
                    />
                  </div>
                </CardContent>
              </Card>

              {selectedUpcoming && (
                <Card className="border-[#d5e3ea] bg-white/90">
                  <CardContent className="space-y-2 p-4">
                    <h3 className="font-semibold text-[#123a55]">
                      {serverUtcToLocalLabel(selectedUpcoming.date)} -{' '}
                      {serverUtcToLocalLabel(selectedUpcoming.endTime, 'HH:mm')}
                    </h3>
                    <p className="text-sm text-[#5d7b8e]">{eventSubtitle(selectedUpcoming, role)}</p>

                    {selectedUpcoming.clinic?.name && (
                      <p className="text-sm text-[#5d7b8e]">Clinic: {selectedUpcoming.clinic.name}</p>
                    )}

                    <p className="text-sm text-[#1f4960]">Reason: {selectedUpcoming.reason}</p>

                    {selectedUpcoming.emergency && (
                      <p className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                        Marked as emergency
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              className="w-full sm:w-80"
              placeholder="Search by pet, clinic, person, or reason..."
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
            />
            <p className="text-xs font-medium text-[#577387]">Page {historyPageLabel}</p>
          </div>

          <Card className="border-[#d5e3ea] bg-white/90">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#d7e4eb] bg-[#f6fafc] text-[#1f4960]">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Pet</th>
                      <th className="p-3 font-semibold">{role === 'OWNER' ? 'Vet' : 'Owner'}</th>
                      <th className="p-3 font-semibold">Clinic</th>
                      <th className="p-3 font-semibold">Reason</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory && !history && (
                      <tr>
                        <td className="p-3 text-[#5d7b8e]" colSpan={6}>
                          Loading appointment history...
                        </td>
                      </tr>
                    )}

                    {!loadingHistory && filteredHistory.length === 0 && (
                      <tr>
                        <td className="p-3 text-[#5d7b8e]" colSpan={6}>
                          {(history?.appointments.length ?? 0) === 0
                            ? 'No historical appointments.'
                            : 'No matches on this page.'}
                        </td>
                      </tr>
                    )}

                    {filteredHistory.map((appointment) => (
                      <tr key={appointment.id} className="border-t border-[#edf3f7] align-top">
                        <td className="p-3">{serverUtcToLocalLabel(appointment.date)}</td>
                        <td className="p-3">{appointment.pet?.name ?? '-'}</td>
                        <td className="p-3">
                          {role === 'OWNER'
                            ? appointment.vet?.name ?? '-'
                            : appointment.owner?.fullName ?? '-'}
                        </td>
                        <td className="p-3">{appointment.clinic?.name ?? '-'}</td>
                        <td className="p-3">{appointment.reason}</td>
                        <td className="p-3">
                          <span
                            className={
                              appointment.cancelledAt
                                ? 'inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700'
                                : 'inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'
                            }
                          >
                            {historyStatus(appointment)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={loadingHistory || historyPage <= 1}
              onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loadingHistory || !history?.pagination.hasMore}
              onClick={() => setHistoryPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
