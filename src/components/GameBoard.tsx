"use client";

import { useCallback, useState } from "react";
import type { CountryOption, GameState } from "@/lib/types";
import { GuessInput } from "./GuessInput";
import { HintList } from "./HintList";
import { ResultView } from "./ResultView";
import { Countdown } from "./Countdown";
import { formatPuzzleDate } from "@/lib/time";

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
      {/* Flag — mounted like a specimen on the map */}
      <div className="card overflow-hidden">
        <div className="p-5">
          <div className="map-frame flex items-center justify-center p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.flagUrl}
              alt="Flag to guess"
              className="max-h-44 w-auto rounded-sm shadow-[0_6px_18px_-8px_rgba(43,32,18,0.6)] ring-1 ring-black/10"
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-edge px-4 py-2.5 font-mono text-xs text-inkMuted">
          <span>{formatPuzzleDate(state.dayIndex)}</span>
          <span>
            next chart in <Countdown />
          </span>
        </div>
      </div>

      {/* Guesses logged so far */}
      {state.guesses.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.guesses.map((g, i) => (
            <li
              key={`${g.cca3}-${i}`}
              className={`flex items-center gap-3 rounded-md border px-4 py-2.5 ${
                g.correct
                  ? "border-correct bg-correctBg"
                  : "border-edge bg-paper2"
              }`}
            >
              <span className="text-xl leading-none">{g.flagEmoji}</span>
              <span className="flex-1 font-body text-ink">{g.name}</span>
              <span
                className={`font-mono text-sm ${g.correct ? "text-correct" : "text-wrong"}`}
              >
                {g.correct ? "✓ found" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <HintList hints={state.hints} />

      {!finished ? (
        <div className="flex flex-col gap-2">
          <div className="label !text-inkMuted">
            Attempt {state.guesses.length + 1} of {state.maxGuesses}
          </div>
          <GuessInput
            options={options}
            guessedCca3={guessedCodes}
            pending={pending}
            disabled={pending}
            onSelect={onGuess}
          />
          {banner && (
            <p className="animate-shake rounded-md border border-wrong bg-wrongBg px-3 py-2 font-body text-sm text-wrong">
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
