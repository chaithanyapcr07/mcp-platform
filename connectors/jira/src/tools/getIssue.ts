import { z } from "zod";
import type { JiraClient } from "../client.js";

export const getIssueInput = z.object({
  issueKey: z.string().min(1)
});

export async function getIssue(client: JiraClient, input: unknown) {
  return client.getIssue(getIssueInput.parse(input));
}
