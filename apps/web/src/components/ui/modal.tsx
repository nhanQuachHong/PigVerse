"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

import { useLocale } from "../i18n/locale-provider";
import { Icon } from "./icon";

export function Modal({
  children,
  description,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pv-modal" role="presentation">
      <button
        aria-hidden="true"
        className="pv-modal__backdrop"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="pv-modal__dialog"
        role="dialog"
      >
        <button
          aria-label={t("common.close")}
          className="pv-modal__close"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <Icon name="close" />
        </button>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        <div className="pv-modal__content">{children}</div>
      </section>
    </div>
  );
}
