CREATE INDEX CONCURRENTLY idx_appointment_vet_date_endtime
  ON "Appointment"("vetId", date, "endTime")
  WHERE status <> 'CANCELLED';