import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["pv-card", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
