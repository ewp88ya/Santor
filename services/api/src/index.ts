import { createApp } from './server.js';
import { env } from './config/env.js';

import { startSubscriptionExpiryJob } from './jobs/subscription-expiry.job.js';
import { startSubscriptionRenewalJob } from './jobs/subscription-renewal.job.js';

const app = await createApp();

startSubscriptionExpiryJob();
startSubscriptionRenewalJob();

app
  .listen({
    port: env.PORT,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log(`Santor API running on port ${env.PORT}`);
  })
  .catch((error) => {
    console.error(error);

    process.exit(1);
  });
