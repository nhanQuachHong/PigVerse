import { ButtonLink } from "../ui/button";
import { Card } from "../ui/card";
import { PageContainer } from "../ui/page-container";

export function PlannedRoute({
  milestone,
  title,
}: {
  milestone: string;
  title: string;
}) {
  return (
    <PageContainer className="pv-planned-route">
      <Card>
        <p className="pv-eyebrow">{milestone}</p>
        <h1>{title}</h1>
        <p>
          This route already uses the shared Pigverse shell. Product content
          will be implemented in its approved milestone.
        </p>
        <ButtonLink href="/" variant="secondary">
          Back to foundation
        </ButtonLink>
      </Card>
    </PageContainer>
  );
}
