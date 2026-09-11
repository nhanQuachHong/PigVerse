import type { HTMLAttributes } from "react";

export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["pv-container", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
