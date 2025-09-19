"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentReminderTemplate = appointmentReminderTemplate;
function appointmentReminderTemplate(opts) {
    const { ownerName, petName, dateStr, clinicName } = opts;
    return `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>Appointment reminder</h2>
      <p>Hi ${ownerName},</p>
      <p>This is a reminder for <strong>${petName}</strong>'s appointment at <strong>${clinicName}</strong> on <strong>${dateStr}</strong>.</p>
      <p>If you need to cancel or reschedule, please do so in VetLink.</p>
      <hr/>
      <small>Sent by VetLink • Please do not reply</small>
    </div>
  `;
}
