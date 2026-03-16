'use client';

import { useEffect, useState } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getNotificationPref, setNotificationPref } from '@/lib/fetchers';

export default function PreferencesPage() {
  return (
    <AuthGate>
      <PreferencesInner />
    </AuthGate>
  );
}

function PreferencesInner() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const pref = await getNotificationPref();
      setEnabled(pref.emailEnabled);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    await setNotificationPref(enabled);
    setSaving(false);
    setMessage('Preferences saved.');
  }

  if (loading) return null;

  return (
    <div className="app-wrap">
      <div className="app-page max-w-2xl">
        <div className="app-header">
          <div>
            <h1 className="app-title">Notification Preferences</h1>
            <p className="app-subtitle">Control reminders for upcoming appointments.</p>
          </div>
        </div>

        {message && <div className="status-ok mb-4">{message}</div>}

        <Card className="border-[#d5e3ea] bg-white/90">
          <CardContent className="space-y-5 p-6">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#d6e4eb] bg-[#f8fbfc] p-4">
              <div>
                <p className="font-semibold text-[#123953]">Email reminders</p>
                <p className="text-sm text-[#587487]">Receive appointment notifications by email.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </label>

            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save preferences'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
