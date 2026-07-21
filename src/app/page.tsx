import { getPlayerId } from "@/lib/identity";
import { getCountryOptions, getGameState } from "@/lib/game";
import { GameBoard } from "@/components/GameBoard";

// Always render fresh — the puzzle and the player's progress are per-request.
export const dynamic = "force-dynamic";

function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <circle cx="24" cy="24" r="21" stroke="var(--brass)" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="16" stroke="var(--edge)" strokeWidth="1" />
      {/* four-point star */}
      <path
        d="M24 6 L27 21 L42 24 L27 27 L24 42 L21 27 L6 24 L21 21 Z"
        fill="var(--teal)"
      />
      <path d="M24 10 L26 22 L24 24 Z M24 38 L22 26 L24 24 Z" fill="var(--brass)" />
      <circle cx="24" cy="24" r="2" fill="var(--paper)" stroke="var(--teal-strong)" />
    </svg>
  );
}

export default async function HomePage() {
  const cookieId = await getPlayerId();
  const [state, options] = await Promise.all([
    getGameState(cookieId),
    getCountryOptions(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-7">
      <header className="text-center">
        <div className="mb-3 flex justify-center">
          <CompassRose className="h-11 w-11" />
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-[0.02em] text-ink sm:text-5xl">
          Flag <span className="italic text-brass">a</span> Day
        </h1>
        <div className="mx-auto mt-3 flex max-w-xs items-center gap-3">
          <hr className="rule-double flex-1" />
          <span className="label !text-inkMuted whitespace-nowrap">Est. Daily</span>
          <hr className="rule-double flex-1" />
        </div>
        <p className="mt-3 font-body text-[1.05rem] text-ink">
          One flag, three guesses, a new flag every day.
        </p>
      </header>

      <GameBoard initialState={state} options={options} />

      <footer className="mt-auto pt-6 text-center font-body text-xs italic text-inkMuted">
        Every explorer gets the same flag each day · charts reset at UTC midnight
      </footer>
    </main>
  );
}
