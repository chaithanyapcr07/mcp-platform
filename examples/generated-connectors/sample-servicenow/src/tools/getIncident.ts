import { z } from "zod";
import { mockIncidents } from "../fixtures.js";

export const getIncidentInputSchema = z.object({
  number: z.string().min(1)
});

export type GetIncidentInput = z.infer<typeof getIncidentInputSchema>;

export async function getIncident(input: GetIncidentInput) {
  const parsed = getIncidentInputSchema.parse(input);
  const incident = mockIncidents.find((item) => item.number === parsed.number);

  if (!incident) {
    return {
      found: false,
      incident: null
    };
  }

  return {
    found: true,
    incident
  };
}

