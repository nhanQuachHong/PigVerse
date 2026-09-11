import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "alert"
  | "arrow"
  | "check"
  | "chevron"
  | "close"
  | "menu"
  | "refresh"
  | "wallet";

const paths: Record<IconName, ReactNode> = {
  alert: <path d="M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7" />,
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M15 10h5v4h-5a2 2 0 1 1 0-4Z" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {paths[name]}
      </g>
    </svg>
  );
}
