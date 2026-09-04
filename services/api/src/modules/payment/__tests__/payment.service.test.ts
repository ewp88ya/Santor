import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markPaymentSuccess } from '../payment.service.js';

// ...

      expect(provider.verifyPayment).toHaveBeenCalledTimes(1);
      expect(provider.verifyPayment).toHaveBeenCalledWith('provider-payment-1', {
        paymentMethod: 'card',
        transactionId: 'tx-001',
      });

// ...
