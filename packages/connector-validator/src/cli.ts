#!/usr/bin/env node
import { validateConnectorRepo } from "./index.js";

function parsePath(argv: string[]) {
  const index = argv.indexOf("--path");
  return index >= 0 ? argv[index + 1] : undefined;
}

const repoPath = parsePath(process.argv.slice(2));
if (!repoPath) {
  console.error("Usage: npm run connector:validate -- --path generated-repos/servicenow-mcp-connector");
  process.exit(1);
}

const result = validateConnectorRepo(repoPath);
console.log(JSON.stringify(result, null, 2));
process.exit(result.valid ? 0 : 1);

