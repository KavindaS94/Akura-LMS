export function Alert({
  tone,
  children,
  title,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
  title?: string;
}) {
  const tones = {
    error: "border-danger/25 bg-danger/8 text-danger",
    success: "border-success/25 bg-success/8 text-success",
    info: "border-accent/25 bg-accent/8 text-accent",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : tone === "success" ? "status" : undefined}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${tones[tone]}`}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-middle ${className}`}
    />
  );
}