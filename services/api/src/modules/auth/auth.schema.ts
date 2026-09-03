export interface RegisterInput {
  email: string;

  password: string;

  name?: string;
}

export interface LoginInput {
  email: string;

  password: string;
}

export const registerBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
    },
  },
};

export const loginBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
    },
  },
};
