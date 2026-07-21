import type { RevealedHint } from "@/lib/types";

export function HintList({ hints }: { hints: RevealedHint[] }) {
  if (hints.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {hints.map((hint) => (
        <div
          key={hint.level}
          className="animate-fade-in rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <span>Hint {hint.level}</span>
            {hint.level === 2 && hint.kind === "community" && (
              <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                from the community
              </span>
            )}
          </div>
          <p className="text-slate-800 dark:text-amber-100">{hint.text}</p>
          {hint.level === 2 && hint.kind === "community" && hint.poolSize! > 1 && (
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
              {hint.poolSize! - 1} more community hint
              {hint.poolSize! - 1 === 1 ? "" : "s"} available — solve it to browse and
              rate them.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
