import { Card } from "../../src/components/ui/card";
import { PageContainer } from "../../src/components/ui/page-container";
import { SectionHeading } from "../../src/components/ui/section-heading";

export default function AdminPage() {
  return (
    <PageContainer className="pv-admin-foundation">
      <SectionHeading
        as="h1"
        description="Authentication and product workflows arrive in M8 and M9."
        eyebrow="M1 · Shared shell"
        title="Admin foundation"
      />
      <div className="pv-admin-stat-grid">
        {["10 total NFTs", "— available", "— minted", "— drafts"].map(
          (label) => (
            <Card key={label}>
              <strong>{label.split(" ")[0]}</strong>
              <span>{label.slice(label.indexOf(" ") + 1)}</span>
            </Card>
          ),
        )}
      </div>
      <Card className="pv-admin-placeholder">
        <h2>Dashboard content is intentionally deferred.</h2>
        <p>
          This verifies the admin navigation, container and responsive behavior
          without inventing privileged product actions early.
        </p>
      </Card>
    </PageContainer>
  );
}
