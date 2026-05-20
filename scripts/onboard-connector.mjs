#!/usr/bin/env node
import { generateServiceNowRepo, parseArgs } from "./self-service-generator.mjs";

const args = parseArgs(process.argv.slice(2));
const system = args.system ?? "servicenow";
const ownerTeam = args["owner-team"] ?? "service-management-platform";
const mode = args.mode ?? "new-repo";

if (system !== "servicenow") {
  throw new Error("The local MVP onboarding generator currently supports --system servicenow");
}

if (mode !== "new-repo" && mode !== "examples") {
  throw new Error("--mode must be new-repo or examples");
}

const output = mode === "examples" ? "examples/generated-connectors" : "generated-repos";
const target = generateServiceNowRepo({ name: "servicenow-mcp-connector", ownerTeam, output });

console.log(`Generated SDD onboarding package at ${target}`);

