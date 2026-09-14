import { PostgresAdminAuditStore } from "./admin-audit-store";
import { getDatabase } from "./database";

export function getAdminAuditRuntime() {
  return { store: new PostgresAdminAuditStore(getDatabase()) };
}
