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
        className={`card animate-fade-in p-6 text-center ${
          won ? "border-correct" : "border-wrong"
        }`}
      >
        <div className="text-5xl">{answer.flagEmoji}</div>
        <div className="label mt-3">{won ? "Charted" : "Lost at sea"}</div>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
          {won ? "You found it" : "Out of guesses"}
        </h2>
        <p className="mt-2 font-body text-ink">
          The territory was <strong className="font-semibold">{answer.name}</strong>
          {answer.officialName !== answer.name && (
            <span className="text-inkMuted"> ({answer.officialName})</span>
          )}
          .
        </p>
        {won && (
          <p className="mt-1 font-mono text-sm text-correct">
            Solved in {guessesUsed} {guessesUsed === 1 ? "attempt" : "attempts"}.
          </p>
        )}
      </div>

      {state.baselineFacts && state.baselineFacts.length > 0 && (
        <section className="card p-5">
          <h3 className="label">Field Notes · {answer.name}</h3>
          <ul className="mt-3 grid gap-2 font-body text-[0.95rem] text-ink">
            {state.baselineFacts.map((fact, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 select-none font-mono text-brass">✦</span>
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
