import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 shadow-sm hover:shadow focus-visible:outline-accent",
  secondary:
    "bg-ink text-surface hover:bg-ink/90 shadow-sm hover:shadow focus-visible:outline-ink",
  ghost:
    "border border-ink/20 bg-white text-ink hover:bg-surface hover:border-ink/30 focus-visible:outline-ink",
  danger:
    "border border-danger/30 bg-white text-danger hover:bg-danger/5 hover:border-danger focus-visible:outline-danger",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
