import { z } from "zod";
import type { JiraClient } from "../client.js";

export const createIssueInput = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional(),
  issueType: z.string().default("Bug"),
  priority: z.string().optional(),
  labels: z.array(z.string()).default([])
});

export async function createIssue(client: JiraClient, input: unknown) {
  return client.createIssue(createIssueInput.parse(input));
}
