import { z } from "zod";
import type { JiraClient } from "../client.js";

export const addCommentInput = z.object({
  issueKey: z.string().min(1),
  comment: z.string().min(1)
});

export async function addComment(client: JiraClient, input: unknown) {
  return client.addComment(addCommentInput.parse(input));
}
