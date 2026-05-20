#!/usr/bin/env node
import path from "node:path";
import { generateConnector } from "../packages/create-mcp-connector/src/index.js";
import { maybeCreateGitHubRepo, parseArgs } from "./self-service-generator.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.name || !args.template || !args["owner-team"]) {
  throw new Error("--name, --template, and --owner-team are required");
}

const output = args.output ?? "generated-repos";
let target;
try {
  target = generateConnector({ name: args.name, template: args.template, output });
} catch (error) {
  if (!String(error.message).includes("Target already exists")) {
    throw error;
  }
  target = path.resolve(process.cwd(), output, args.name);
}

const github = await maybeCreateGitHubRepo({ repoName: args.name, target });

console.log(`Connector repo scaffold available at ${target}`);
if (github.created) {
  console.log(`GitHub repo created at ${github.url}`);
} else {
  console.log(`GitHub repo creation skipped: ${github.reason}`);
}

