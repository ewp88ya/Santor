export const telegramWebhookSchema = {
  body: {
    type: 'object',
    required: ['update_id'],
    additionalProperties: true,
    properties: {
      update_id: { type: 'integer' },
      message: { type: 'object', additionalProperties: true },
    },
  },
} as const;
