import { z } from "zod";
import { mockIncidents } from "../fixtures.js";

export const searchIncidentsInputSchema = z.object({
  query: z.string().min(1).default(""),
  limit: z.number().int().min(1).max(50).default(10)
});

export type SearchIncidentsInput = z.infer<typeof searchIncidentsInputSchema>;

export async function searchIncidents(input: SearchIncidentsInput) {
  const parsed = searchIncidentsInputSchema.parse(input);
  const query = parsed.query.toLowerCase();

  const incidents = mockIncidents
    .filter((incident) => {
      return (
        incident.number.toLowerCase().includes(query) ||
        incident.shortDescription.toLowerCase().includes(query) ||
        `priority=${incident.priority}`.includes(query) ||
        incident.assignmentGroup.toLowerCase().includes(query)
      );
    })
    .slice(0, parsed.limit);

  return {
    mode: "mock",
    count: incidents.length,
    incidents
  };
}

