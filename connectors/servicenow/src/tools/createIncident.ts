import { z } from "zod";
import type { ServiceNowClient } from "../client.js";

const schema = z.object({
  shortDescription: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["1", "2", "3", "4"]).optional()
});

export async function createIncident(client: ServiceNowClient, input: unknown) {
  return client.createIncident(schema.parse(input));
}

