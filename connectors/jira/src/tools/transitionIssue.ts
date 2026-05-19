import { z } from "zod";
import type { JiraClient } from "../client.js";

export const transitionIssueInput = z.object({
  issueKey: z.string().min(1),
  transitionName: z.string().min(1)
});

export async function transitionIssue(client: JiraClient, input: unknown) {
  return client.transitionIssue(transitionIssueInput.parse(input));
}
