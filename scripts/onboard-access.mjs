#!/usr/bin/env node
import { generateAccessRequest, parseArgs } from "./self-service-generator.mjs";

const args = parseArgs(process.argv.slice(2));
const target = generateAccessRequest({
  connector: args.connector,
  project: args.project,
  tools: args.tools
});

console.log(`Generated connector access request at ${target}`);

