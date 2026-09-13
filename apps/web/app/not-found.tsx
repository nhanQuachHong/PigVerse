import { ErrorState } from "../src/components/ui/feedback-state";
import { PageContainer } from "../src/components/ui/page-container";

export default function NotFound() {
  return (
    <PageContainer className="pv-planned-route">
      <ErrorState />
    </PageContainer>
  );
}
