"use client";

import { useCallback, useState } from "react";
import type { CountryOption, GameState } from "@/lib/types";
import { GuessInput } from "./GuessInput";
import { HintList } from "./HintList";
import { ResultView } from "./ResultView";
import { Countdown } from "./Countdown";

export function GameBoard({
  initialState,
  options,
}: {
  initialState: GameState;
  options: CountryOption[];
}) {
  const [state, setState] = useState(initialState);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** POST to an API route; on success swap in the returned game state. */
  const post = useCallback(
    async (url: string, body: unknown): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setState(data.state as GameState);
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Something went wrong." };
      } catch {
        return { ok: false, error: "Network error — please try again." };
      }
    },
    [],
  );

  const onGuess = useCallback(
    async (cca3: string) => {
      setBanner(null);
      setPending(true);
      const res = await post("/api/guess", { cca3 });
      setPending(false);
      if (!res.ok) setBanner(res.error ?? "Something went wrong.");
    },
    [post],
  );

  const finished = state.status !== "playing";
  const guessedCodes = state.guesses.map((g) => g.cca3);

  return (
    <div className="flex flex-col gap-5">
      {/* Flag */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-center bg-slate-100 p-6 dark:bg-slate-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.flagUrl}
            alt="Flag to guess"
            className="max-h-48 w-auto rounded-md shadow-md ring-1 ring-black/10"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Day #{state.dayIndex}</span>
          <span>
            Next flag in <Countdown />
          </span>
        </div>
      </div>

      {/* Guesses so far */}
      {state.guesses.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.guesses.map((g, i) => (
            <li
              key={`${g.cca3}-${i}`}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${
                g.correct
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
            >
              <span className="text-xl leading-none">{g.flagEmoji}</span>
              <span className="flex-1">{g.name}</span>
              <span className={g.correct ? "text-emerald-500" : "text-rose-400"}>
                {g.correct ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <HintList hints={state.hints} />

      {!finished ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Guess {state.guesses.length + 1} of {state.maxGuesses}
            </span>
          </div>
          <GuessInput
            options={options}
            guessedCca3={guessedCodes}
            pending={pending}
            disabled={pending}
            onSelect={onGuess}
          />
          {banner && (
            <p className="animate-shake rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {banner}
            </p>
          )}
        </div>
      ) : (
        <ResultView state={state} post={post} />
      )}
    </div>
  );
}
