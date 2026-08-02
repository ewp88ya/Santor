import 'dotenv/config';
import cron from 'node-cron';

import { runExpiryCheck } from './jobs/expiry.job.js';

console.log('[WORKER] Santor worker started');

cron.schedule('*/10 * * * *', async () => {
  console.log('[WORKER] Running expiry check');

  try {
    await runExpiryCheck();
  } catch (error) {
    console.error('[WORKER] Expiry check failed', error);
  }
});
