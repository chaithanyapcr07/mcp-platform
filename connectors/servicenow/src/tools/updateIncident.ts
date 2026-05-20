import { z } from "zod";
import type { ServiceNowClient } from "../client.js";

const schema = z.object({
  number: z.string().min(1),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  state: z.enum(["new", "in_progress", "resolved"]).optional()
});

export async function updateIncident(client: ServiceNowClient, input: unknown) {
  return client.updateIncident(schema.parse(input));
}

