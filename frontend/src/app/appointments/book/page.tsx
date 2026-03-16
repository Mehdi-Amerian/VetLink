import AuthGate from '@/components/auth/AuthGate';
import AppointmentForm from '@/components/bookings/AppointmentForm';
import { Card, CardContent } from '@/components/ui/card';

export default function BookPage() {
  return (
    <AuthGate roles={['OWNER']}>
      <div className="app-wrap">
        <div className="app-page max-w-4xl">
          <div className="app-header">
            <div>
              <h1 className="app-title">Book an Appointment</h1>
              <p className="app-subtitle">Choose a clinic, vet, date, and time for your pet.</p>
            </div>
          </div>

          <Card className="border-[#d5e3ea] bg-white/90">
            <CardContent className="p-6">
              <AppointmentForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGate>
  );
}
