import AuthGate from '@/components/auth/AuthGate';
import AppointmentForm from '@/components/bookings/AppointmentForm';
import { Card, CardContent } from '@/components/ui/card';


export default function BookPage() {
return (
<AuthGate roles={['OWNER', 'CLINIC_ADMIN', 'VET']}>
<div className="max-w-3xl mx-auto p-6">
<Card>
<CardContent className="p-6">
<h1 className="text-xl font-semibold mb-4">Book an appointment</h1>
<AppointmentForm />
</CardContent>
</Card>
</div>
</AuthGate>
);
}