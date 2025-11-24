'use client';
import AuthGate from '@/components/auth/AuthGate';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getNotificationPref, setNotificationPref } from '@/lib/fetchers';


export default function PreferencesPage() {
return (
<AuthGate>
<Prefs />
</AuthGate>
);
}


function Prefs() {
const [enabled, setEnabled] = useState<boolean>(true);
const [loading, setLoading] = useState(true);
useEffect(() => { (async () => { const pref = await getNotificationPref(); setEnabled(pref.emailEnabled); setLoading(false); })(); }, []);


async function save() {
await setNotificationPref(enabled);
alert('Saved');
}


if (loading) return null;
return (
<div className="max-w-xl mx-auto p-6">
<Card><CardContent className="p-6 space-y-4">
<h1 className="text-xl font-semibold">Notification Preferences</h1>
<label className="flex items-center gap-2">
<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
<span>Email reminders enabled</span>
</label>
<Button onClick={save}>Save</Button>
</CardContent></Card>
</div>
);
}