import { z } from "zod";
import type { JiraClient } from "../client.js";

export const searchIssuesInput = z.object({
  jql: z.string().min(1),
  maxResults: z.number().int().positive().max(50).default(10)
});

export async function searchIssues(client: JiraClient, input: unknown) {
  return client.searchIssues(searchIssuesInput.parse(input));
}
