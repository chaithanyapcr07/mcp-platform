import Fastify from "fastify";

const app = Fastify({ logger: true });
app.get("/health", async () => ({ ok: true }));
app.post("/tools/example_read/invoke", async (request) => ({ input: request.body, items: [] }));
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 4100) });
