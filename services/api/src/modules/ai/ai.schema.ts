export const aiChatBodySchema = {
  body: {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: {
      message: {
        type: 'string',
        minLength: 1,
        maxLength: 8000,
      },
      context: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
} as const;
