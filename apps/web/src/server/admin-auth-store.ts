import type { Sql } from "postgres";

import { getDatabase } from "./database";

export type AdminChallenge = {
  chainId: number;
  consumedAt: Date | null;
  domain: string;
  expiresAt: Date;
  issuedAt: Date;
  messageHash: string;
  nonceHash: string;
  uri: string;
  walletAddress: `0x${string}`;
};

export type AdminSession = {
  expiresAt: Date;
  issuedAt: Date;
  revokedAt: Date | null;
  tokenHash: string;
  walletAddress: `0x${string}`;
};

export interface AdminAuthStore {
  consumeChallengeAndCreateSession(
    nonceHash: string,
    now: Date,
    session: AdminSession,
  ): Promise<boolean>;
  createChallenge(challenge: AdminChallenge): Promise<void>;
  getChallenge(nonceHash: string): Promise<AdminChallenge | null>;
  getSession(tokenHash: string, now: Date): Promise<AdminSession | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
}

type ChallengeRow = {
  chain_id: string;
  consumed_at: Date | null;
  domain: string;
  expires_at: Date;
  issued_at: Date;
  message_hash: string;
  nonce_hash: string;
  uri: string;
  wallet_address: `0x${string}`;
};

type SessionRow = {
  expires_at: Date;
  issued_at: Date;
  revoked_at: Date | null;
  token_hash: string;
  wallet_address: `0x${string}`;
};

function challengeFromRow(row: ChallengeRow): AdminChallenge {
  return {
    chainId: Number(row.chain_id),
    consumedAt: row.consumed_at,
    domain: row.domain,
    expiresAt: row.expires_at,
    issuedAt: row.issued_at,
    messageHash: row.message_hash,
    nonceHash: row.nonce_hash,
    uri: row.uri,
    walletAddress: row.wallet_address,
  };
}

function sessionFromRow(row: SessionRow): AdminSession {
  return {
    expiresAt: row.expires_at,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    tokenHash: row.token_hash,
    walletAddress: row.wallet_address,
  };
}

export class PostgresAdminAuthStore implements AdminAuthStore {
  constructor(private readonly sql: Sql) {}

  async createChallenge(challenge: AdminChallenge) {
    await this.sql`
      INSERT INTO admin_auth_challenges (
        nonce_hash, message_hash, wallet_address, domain, uri, chain_id,
        issued_at, expires_at, consumed_at
      ) VALUES (
        ${challenge.nonceHash}, ${challenge.messageHash},
        ${challenge.walletAddress}, ${challenge.domain}, ${challenge.uri},
        ${challenge.chainId}, ${challenge.issuedAt}, ${challenge.expiresAt},
        ${challenge.consumedAt}
      )
    `;
  }

  async getChallenge(nonceHash: string) {
    const rows = await this.sql<ChallengeRow[]>`
      SELECT nonce_hash, message_hash, wallet_address, domain, uri, chain_id,
             issued_at, expires_at, consumed_at
      FROM admin_auth_challenges
      WHERE nonce_hash = ${nonceHash}
      LIMIT 1
    `;
    return rows[0] ? challengeFromRow(rows[0]) : null;
  }

  async consumeChallengeAndCreateSession(
    nonceHash: string,
    now: Date,
    session: AdminSession,
  ) {
    return this.sql.begin(async (transaction) => {
      const consumed = await transaction<{ nonce_hash: string }[]>`
        UPDATE admin_auth_challenges
        SET consumed_at = ${now}
        WHERE nonce_hash = ${nonceHash}
          AND consumed_at IS NULL
          AND expires_at > ${now}
        RETURNING nonce_hash
      `;
      if (consumed.length !== 1) return false;
      await transaction`
        INSERT INTO admin_sessions (
          token_hash, wallet_address, issued_at, expires_at, revoked_at
        ) VALUES (
          ${session.tokenHash}, ${session.walletAddress}, ${session.issuedAt},
          ${session.expiresAt}, ${session.revokedAt}
        )
      `;
      return true;
    });
  }

  async getSession(tokenHash: string, now: Date) {
    const rows = await this.sql<SessionRow[]>`
      SELECT token_hash, wallet_address, issued_at, expires_at, revoked_at
      FROM admin_sessions
      WHERE token_hash = ${tokenHash}
        AND revoked_at IS NULL
        AND expires_at > ${now}
      LIMIT 1
    `;
    return rows[0] ? sessionFromRow(rows[0]) : null;
  }

  async revokeSession(tokenHash: string, now: Date) {
    await this.sql`
      UPDATE admin_sessions
      SET revoked_at = ${now}
      WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
    `;
  }
}

export class MemoryAdminAuthStore implements AdminAuthStore {
  readonly challenges = new Map<string, AdminChallenge>();
  readonly sessions = new Map<string, AdminSession>();

  async createChallenge(challenge: AdminChallenge) {
    if (this.challenges.has(challenge.nonceHash))
      throw new Error("Challenge collision");
    this.challenges.set(challenge.nonceHash, structuredClone(challenge));
  }

  async getChallenge(nonceHash: string) {
    const challenge = this.challenges.get(nonceHash);
    return challenge ? structuredClone(challenge) : null;
  }

  async consumeChallengeAndCreateSession(
    nonceHash: string,
    now: Date,
    session: AdminSession,
  ) {
    const challenge = this.challenges.get(nonceHash);
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= now.getTime()
    )
      return false;
    challenge.consumedAt = now;
    this.sessions.set(session.tokenHash, structuredClone(session));
    return true;
  }

  async getSession(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now.getTime()
    )
      return null;
    return structuredClone(session);
  }

  async revokeSession(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    if (session && !session.revokedAt) session.revokedAt = now;
  }
}

export function getAdminAuthStore(): AdminAuthStore {
  return new PostgresAdminAuthStore(getDatabase());
}
