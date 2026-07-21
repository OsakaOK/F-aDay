import type { GameState } from "@/lib/types";
import { CommunitySection } from "./CommunitySection";

type PostFn = (url: string, body: unknown) => Promise<{ ok: boolean; error?: string }>;

export function ResultView({ state, post }: { state: GameState; post: PostFn }) {
  const won = state.status === "won";
  const answer = state.answer!;
  const guessesUsed = state.guesses.length;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`animate-fade-in rounded-2xl border p-5 text-center ${
          won
            ? "border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-rose-300/60 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
        }`}
      >
        <div className="text-4xl">{answer.flagEmoji}</div>
        <h2 className="mt-2 text-xl font-bold">
          {won ? "You got it!" : "Out of guesses"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          The answer was <strong>{answer.name}</strong>
          {answer.officialName !== answer.name && (
            <span className="text-slate-400"> ({answer.officialName})</span>
          )}
          .
        </p>
        {won && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
            Solved in {guessesUsed} {guessesUsed === 1 ? "guess" : "guesses"}.
          </p>
        )}
      </div>

      {state.baselineFacts && state.baselineFacts.length > 0 && (
        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            About {answer.name}
          </h3>
          <ul className="mt-3 grid gap-1.5 text-sm text-slate-700 dark:text-slate-200">
            {state.baselineFacts.map((fact, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.community && <CommunitySection data={state.community} post={post} />}
    </div>
  );
}
