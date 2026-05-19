import Fastify from "fastify";
import { connector } from "./connector.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, connectorId: connector.getManifest().id }));
app.get("/manifest", async () => connector.getManifest());
app.post("/tools/:toolName/invoke", async (request: any, reply) => {
  try {
    const output = await connector.invoke(request.params.toolName, request.body ?? {}, {
      requestId: request.headers["x-request-id"] ?? request.id,
      secrets: {}
    });
    return output;
  } catch (error: any) {
    reply.status(error.statusCode ?? 500).send({ message: error.message });
  }
});

const port = Number(process.env.CONNECTOR_PORT ?? 4100);
await app.listen({ host: "0.0.0.0", port });
