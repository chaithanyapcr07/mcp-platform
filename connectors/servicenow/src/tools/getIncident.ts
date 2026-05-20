import { z } from "zod";
import type { ServiceNowClient } from "../client.js";

const schema = z.object({ number: z.string().min(1) });

export async function getIncident(client: ServiceNowClient, input: unknown) {
  return client.getIncident(schema.parse(input));
}

