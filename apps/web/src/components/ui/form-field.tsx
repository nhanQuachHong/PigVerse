import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label: string;
  leading?: ReactNode;
};

export function FormField({
  error,
  hint,
  id,
  label,
  leading,
  ...props
}: FormFieldProps) {
  const inputId = id ?? props.name;
  const descriptionId = inputId ? `${inputId}-description` : undefined;

  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={inputId}>
        {label}
      </label>
      <span className="pv-field__control">
        {leading}
        <input
          aria-describedby={hint || error ? descriptionId : undefined}
          aria-invalid={Boolean(error)}
          className="pv-field__input"
          id={inputId}
          {...props}
        />
      </span>
      {(error || hint) && (
        <span
          className={
            error
              ? "pv-field__message pv-field__message--error"
              : "pv-field__message"
          }
          id={descriptionId}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

export function TextAreaField({
  error,
  hint,
  id,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  hint?: string;
  label: string;
}) {
  const inputId = id ?? props.name;
  const descriptionId = inputId ? `${inputId}-description` : undefined;

  return (
    <div className="pv-field">
      <label className="pv-field__label" htmlFor={inputId}>
        {label}
      </label>
      <span className="pv-field__control pv-field__control--textarea">
        <textarea
          aria-describedby={hint || error ? descriptionId : undefined}
          aria-invalid={Boolean(error)}
          className="pv-field__input pv-field__textarea"
          id={inputId}
          {...props}
        />
      </span>
      {(error || hint) && (
        <span
          className={
            error
              ? "pv-field__message pv-field__message--error"
              : "pv-field__message"
          }
          id={descriptionId}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
