import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { findSecretFindings } from "./secret-scan.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: repositoryRoot },
)
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const path of files) {
  const bytes = await readFile(resolve(repositoryRoot, path));
  if (bytes.includes(0)) continue;
  findings.push(...findSecretFindings(path, bytes.toString("utf8")));
}

if (findings.length > 0) {
  console.error("Potential committed secrets detected (values are redacted):");
  for (const finding of findings)
    console.error(`${finding.path}:${finding.line} — ${finding.detector}`);
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${files.length} repository files contain no detected secrets.`,
  );
}
