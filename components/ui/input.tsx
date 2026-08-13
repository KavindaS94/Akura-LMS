import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className = "", invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink shadow-xs outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 ${
        invalid ? "border-danger" : "border-ink/15"
      } ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink shadow-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 ${className}`}
      {...props}
    />
  );
});

export function Field(props: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{props.label}</span>
      {props.children}
      {props.hint ? <span className="text-xs text-muted">{props.hint}</span> : null}
    </label>
  );
}