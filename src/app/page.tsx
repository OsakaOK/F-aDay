import { getPlayerId } from "@/lib/identity";
import { getCountryOptions, getGameState } from "@/lib/game";
import { GameBoard } from "@/components/GameBoard";

// Always render fresh — the puzzle and the player's progress are per-request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieId = await getPlayerId();
  const [state, options] = await Promise.all([
    getGameState(cookieId),
    getCountryOptions(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Flag <span className="text-blue-600 dark:text-blue-400">a</span> Day
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          One flag. Three guesses. A new country every day.
        </p>
      </header>

      <GameBoard initialState={state} options={options} />

      <footer className="mt-auto pt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Everyone gets the same flag each day · resets at UTC midnight
      </footer>
    </main>
  );
}
