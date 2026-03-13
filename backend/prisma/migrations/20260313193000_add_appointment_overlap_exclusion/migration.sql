-- Ensure GiST supports equality for uuid in exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping active appointments for the same vet
ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_overlapping_active_vet_slots"
EXCLUDE USING GIST (
  "vetId" WITH =,
  tsrange("date", "endTime", '[)') WITH &&
)
WHERE ("cancelledAt" IS NULL);
