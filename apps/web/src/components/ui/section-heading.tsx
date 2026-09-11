import type { ReactNode } from "react";

export function SectionHeading({
  action,
  as = "h2",
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  as?: "h1" | "h2";
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  const Heading = as;

  return (
    <div className="pv-section-heading">
      <div>
        {eyebrow && <p className="pv-eyebrow">{eyebrow}</p>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="pv-section-heading__action">{action}</div>}
    </div>
  );
}
