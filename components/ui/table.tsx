export function Table({
  headers,
  children,
  empty,
  emptyAction,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: { title: string; description?: string };
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10 bg-surface/60">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/8">
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10">
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="font-medium text-ink">{empty.title}</p>
                  {empty.description ? (
                    <p className="text-sm text-muted">{empty.description}</p>
                  ) : null}
                  {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-2.5 font-medium text-muted ${className}`}>{children}</th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}