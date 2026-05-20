import { z } from "zod";
import type { ServiceNowClient } from "../client.js";

const schema = z.object({ query: z.string().optional(), limit: z.number().int().min(1).max(50).default(10) });

export async function searchIncidents(client: ServiceNowClient, input: unknown) {
  return client.searchIncidents(schema.parse(input));
}

