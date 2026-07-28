import { useId } from "react";

type StwToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function StwToggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  id,
  className
}: StwToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelTextId = `${inputId}-label`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const rootClassName = [
    "stw-toggle",
    checked ? "is-on" : "",
    disabled ? "is-disabled" : "",
    className ?? ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <label className="stw-toggle-copy" htmlFor={inputId}>
        <span className="stw-toggle-label" id={labelTextId}>
          {label}
        </span>
        {description ? (
          <span className="stw-toggle-description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </label>
      <button
        type="button"
        id={inputId}
        className="stw-toggle-switch"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelTextId}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="stw-toggle-track" aria-hidden="true">
          <span className="stw-toggle-thumb" />
        </span>
      </button>
    </div>
  );
}
