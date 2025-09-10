import cron from 'node-cron';
import { sendRemindersForWindow } from '../services/notification';


const TZ = process.env.TIMEZONE || 'Europe/Helsinki';


/** Schedule the daily reminder at 09:00 local time */
export function scheduleReminderJob() {
cron.schedule('0 9 * * *', async () => {
const now = new Date();
const start = now;
const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
await sendRemindersForWindow(start, end);
}, { timezone: TZ });
}