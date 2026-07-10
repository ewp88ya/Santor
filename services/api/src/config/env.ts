import "dotenv/config";


export const env = {

  PORT: Number(process.env.PORT ?? 3000),

  NODE_ENV:
    process.env.NODE_ENV ?? "development",


  DATABASE_URL:
    process.env.DATABASE_URL ?? "",


  REDIS_URL:
    process.env.REDIS_URL ?? "",


  JWT_SECRET:
    process.env.JWT_SECRET ?? "development-secret",


  JWT_EXPIRES:
    process.env.JWT_EXPIRES ?? "7d",

};
