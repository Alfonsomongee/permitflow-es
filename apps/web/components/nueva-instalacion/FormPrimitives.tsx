/**
 * Primitivos UI del formulario.
 * Todos son presentacionales — no tienen estado propio.
 */

import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className = "" }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      {children}
      {hint && (
        <p className="text-xs text-text-secondary/70 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function Select({ value, onChange, options, placeholder }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors hover:border-neutral focus:border-primary focus:ring-1 focus:ring-primary/20"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Input numérico ───────────────────────────────────────────────────────────

interface NumberInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 0.1,
  suffix,
}: NumberInputProps) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors hover:border-neutral focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 text-xs text-text-secondary">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── Toggle group (selector de opciones) ─────────────────────────────────────

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
  cols?: 2 | 3 | 4;
}

export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
  cols = 3,
}: ToggleGroupProps<T>) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[cols];

  return (
    <div className={`grid gap-2 ${gridCols}`}>
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value as T)}
            className={`
              flex flex-col items-start rounded-lg border px-3 py-2.5 text-left
              transition-colors text-sm
              ${
                isActive
                  ? "border-primary bg-primary-light text-primary-dark font-medium"
                  : "border-border bg-surface text-text-secondary hover:border-neutral hover:bg-bg"
              }
            `}
          >
            <span className="leading-snug">{o.label}</span>
            {o.description && (
              <span className="mt-0.5 text-xs opacity-70">{o.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Toggle booleano (Sí / No) ────────────────────────────────────────────────

interface BoolToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  labelTrue?: string;
  labelFalse?: string;
}

export function BoolToggle({
  value,
  onChange,
  labelTrue = "Sí",
  labelFalse = "No",
}: BoolToggleProps) {
  return (
    <div className="flex gap-2">
      {[false, true].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`
            flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors
            ${
              value === v
                ? "border-primary bg-primary-light text-primary-dark font-medium"
                : "border-border bg-surface text-text-secondary hover:border-neutral"
            }
          `}
        >
          {v ? labelTrue : labelFalse}
        </button>
      ))}
    </div>
  );
}

// ─── Divider con label ────────────────────────────────────────────────────────

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/60">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Banner informativo ───────────────────────────────────────────────────────

interface InfoBannerProps {
  type?: "info" | "warning";
  children: ReactNode;
}

export function InfoBanner({ type = "info", children }: InfoBannerProps) {
  const isWarning = type === "warning";
  return (
    <div
      className={`flex gap-2.5 items-start rounded-lg border px-3.5 py-3 text-xs leading-relaxed
        ${isWarning ? "border-warning bg-warning-light text-warning-dark" : "border-primary/20 bg-primary-light text-primary-dark"}
      `}
    >
      {isWarning ? (
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden />
      ) : (
        <Info size={13} className="flex-shrink-0 mt-0.5" aria-hidden />
      )}
      <span>{children}</span>
    </div>
  );
}
