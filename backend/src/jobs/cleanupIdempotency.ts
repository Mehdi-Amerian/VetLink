import cron from 'node-cron';
import prisma from '../config/prismaClient';

const CRON_SCHEDULE = process.env.IDEMPOTENCY_CLEANUP_CRON || '15 3 * * *'; // daily 03:15
export function scheduleIdempotencyCleanup() {
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      const deleted = await prisma.idempotencyRequest.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (deleted.count > 0) {
        console.log(`[idempotency] cleaned ${deleted.count} expired keys`);
      }
    } catch (err) {
      console.error('[idempotency] cleanup failed', err);
    }
  });
}
