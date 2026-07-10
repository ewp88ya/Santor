import type { FastifyInstance } from "fastify";

export default async function healthRoute(
  app: FastifyInstance
) {
  app.get("/health", async () => {
    let database = "disconnected";
    let redis = "disconnected";

    try {
      await app.prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch (error) {
      app.log.error(error);
    }

    try {
      await app.redis.ping();
      redis = "connected";
    } catch (error) {
      app.log.error(error);
    }

    return {
      status: "ok",
      service: "santor-api",
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  });
}
