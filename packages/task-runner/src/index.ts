import { taskManifestSchema, type TaskManifest } from "@mcp-platform/shared-types";

export type TaskStep = {
  id: string;
  skillId: string;
  action: string;
  input: Record<string, unknown>;
};

export type TaskDefinition = {
  manifest: TaskManifest;
  steps: TaskStep[];
};

export type TaskRunnerHooks = {
  executeSkill(step: TaskStep): Promise<unknown>;
  audit(step: TaskStep, output: unknown): Promise<void>;
};

export class TaskRunner {
  constructor(private readonly hooks: TaskRunnerHooks) {}

  async run(definition: TaskDefinition): Promise<Record<string, unknown>> {
    taskManifestSchema.parse(definition.manifest);
    const outputs: Record<string, unknown> = {};
    for (const step of definition.steps) {
      const output = await this.hooks.executeSkill(step);
      outputs[step.id] = output;
      await this.hooks.audit(step, output);
    }
    return outputs;
  }
}
