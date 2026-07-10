import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env.js";


const RedisClient = Redis as unknown as typeof import("ioredis").default;


declare module "fastify" {
  interface FastifyInstance {
    redis: InstanceType<typeof RedisClient>;
  }
}


export default fp(async (app) => {

  const redis = new RedisClient(env.REDIS_URL);


  redis.on("connect", () => {
    app.log.info("Redis connected");
  });


  redis.on("error", (error: Error) => {
    app.log.error(error);
  });


  app.decorate("redis", redis);


  app.addHook("onClose", async () => {
    await redis.quit();
  });

});
