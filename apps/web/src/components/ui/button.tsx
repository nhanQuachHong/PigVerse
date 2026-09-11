import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return ["pv-button", `pv-button--${variant}`, `pv-button--${size}`, className]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  className,
  size = "md",
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={buttonClassName(variant, size, className)}
      type={type}
      {...props}
    />
  );
}

export function ButtonLink({
  children,
  className,
  size = "md",
  variant = "primary",
  ...props
}: LinkProps & {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <Link className={buttonClassName(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
