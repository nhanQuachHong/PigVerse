import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findSecretFindings } from "./secret-scan.mjs";

describe("repository secret scanner", () => {
  it("detects supported secret forms without returning their values", () => {
    const privateKey = "0x" + "a".repeat(64);
    const githubToken = "ghp_" + "b".repeat(36);
    const deployerKeyName = "BASE_SEPOLIA_DEPLOYER_PRIVATE_" + "KEY";
    const source = [
      `${deployerKeyName}=${privateKey}`,
      `token = "${githubToken}"`,
      "-----BEGIN " + "PRIVATE KEY-----",
    ].join("\n");

    const findings = findSecretFindings("fixture.env", source);

    assert.deepEqual(
      findings.map(({ detector, line, path }) => ({ detector, line, path })),
      [
        {
          detector: "non-placeholder BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY",
          line: 1,
          path: "fixture.env",
        },
        { detector: "GitHub token", line: 2, path: "fixture.env" },
        { detector: "private PEM key", line: 3, path: "fixture.env" },
      ],
    );
    assert.equal(JSON.stringify(findings).includes(privateKey), false);
    assert.equal(JSON.stringify(findings).includes(githubToken), false);
  });

  it("allows blank examples, environment references and local test credentials", () => {
    const deployerKeyName = "BASE_SEPOLIA_DEPLOYER_PRIVATE_" + "KEY";
    const sessionSecretName = "SESSION_" + "SECRET";
    const databaseUrlName = "DATABASE_" + "URL";
    const rpcApiKeyName = "RPC_API_" + "KEY";
    const source = [
      `${deployerKeyName}=`,
      `${sessionSecretName}=\${PIGVERSE_SESSION_SECRET}`,
      `${databaseUrlName}=postgresql://pigverse:pigverse@127.0.0.1:5432/pigverse`,
      `${rpcApiKeyName}=placeholder`,
    ].join("\n");

    assert.deepEqual(findSecretFindings("config.env.example", source), []);
  });

  it("detects non-local database credentials and long named secrets", () => {
    const databaseUrlName = "DATABASE_" + "URL";
    const pinataJwtName = "PINATA_" + "JWT";
    const findings = findSecretFindings(
      "deployment.env",
      [
        `${databaseUrlName}=postgresql://admin:actual-password@db.internal/pigverse`,
        `${pinataJwtName}=${"x".repeat(48)}`,
      ].join("\n"),
    );

    assert.deepEqual(
      findings.map(({ detector }) => detector),
      ["non-placeholder DATABASE_URL", "non-placeholder PINATA_JWT"],
    );
  });
});
