const assignmentName =
  /(?:^|["'])((?:[A-Z][A-Z0-9_]*_)?(?:PRIVATE_KEY|MNEMONIC|SEED_PHRASE|SESSION_SECRET|API_KEY|ACCESS_TOKEN|SECRET_ACCESS_KEY|PINATA_JWT|DATABASE_URL))["']?\s*[:=]\s*(.+)$/u;

const tokenPatterns = [
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u],
  ["GitHub token", /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}\b/u],
  ["GitHub token", /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u],
  ["private PEM key", /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u],
  ["Slack token", /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{20,}\b/u],
  ["Stripe live key", /\b(?:pk|rk|sk)_live_[A-Za-z0-9]{16,}\b/u],
];

const safeExactValues = new Set([
  "",
  '""',
  "''",
  "example",
  "placeholder",
  "pigverse",
  "test",
]);

function normalizedAssignedValue(source) {
  return source
    .trim()
    .replace(/[;,]$/u, "")
    .replace(/^(["'])(.*)\1$/u, "$2")
    .trim();
}

function isSafeAssignment(value) {
  const normalized = normalizedAssignedValue(value);
  if (safeExactValues.has(normalized.toLowerCase())) return true;
  if (/^\$\{?[A-Z][A-Z0-9_]*\}?$/u.test(normalized)) return true;
  if (
    /^(?:https?|postgres(?:ql)?):\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/iu.test(
      normalized,
    )
  )
    return true;
  if (
    /^https?:\/\/[^/]*(?:\.example|\.example\.test)(?:\/|$)/iu.test(normalized)
  )
    return true;
  return false;
}

function assignmentLooksSecret(name, value) {
  const normalized = normalizedAssignedValue(value);
  if (isSafeAssignment(normalized)) return false;
  if (name.endsWith("PRIVATE_KEY"))
    return /^(?:0x)?[0-9a-f]{64}$/iu.test(normalized);
  if (name === "DATABASE_URL" || name.endsWith("_DATABASE_URL"))
    return /^(?:postgres(?:ql)?):\/\/[^:@/\s]+:[^@/\s]+@[^/\s]+/iu.test(
      normalized,
    );
  return normalized.length >= 12;
}

export function findSecretFindings(path, source) {
  const findings = [];
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    for (const [detector, pattern] of tokenPatterns) {
      if (pattern.test(line))
        findings.push({ detector, line: index + 1, path });
    }
    const assignment = line.match(assignmentName);
    if (
      assignment &&
      assignmentLooksSecret(assignment[1] ?? "", assignment[2] ?? "")
    )
      findings.push({
        detector: `non-placeholder ${assignment[1]}`,
        line: index + 1,
        path,
      });
  }
  return findings;
}
