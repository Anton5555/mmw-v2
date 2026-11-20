export function StatsTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-zinc-900/80 px-3 py-2.5">
      <dt className="text-xs font-bold text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-black text-zinc-100">
        {value}
      </dd>
    </div>
  );
}
