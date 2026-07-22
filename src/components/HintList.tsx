import type { RevealedHint } from "@/lib/types";

export function HintList({ hints }: { hints: RevealedHint[] }) {
  if (hints.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {hints.map((hint, i) => (
        <div
          key={i}
          className="animate-fade-in rounded-md border border-dashed bg-hintBg px-4 py-3"
          style={{ borderColor: "var(--hint-edge)" }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="label">Marginal Note</span>
            <span className="rounded-sm border border-brass px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass">
              from a fellow explorer
            </span>
          </div>
          <p className="font-body text-[0.95rem] italic text-ink">{hint.text}</p>
          {hint.poolSize > 1 && (
            <p className="mt-1 font-body text-xs text-inkMuted">
              {hint.poolSize - 1} more note{hint.poolSize - 1 === 1 ? "" : "s"} in the
              margins — solve it to browse and rate them.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
