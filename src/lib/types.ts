export const MAX_GUESSES = 3;

export type GameStatus = "playing" | "won" | "lost";

/** Minimal country shape for the autocomplete list and guess/answer display. */
export type CountryOption = {
  cca3: string;
  cca2: string;
  name: string;
  flagEmoji: string;
};

export type GuessResult = {
  cca3: string;
  name: string;
  flagEmoji: string;
  correct: boolean;
};

/**
 * The only in-game hint is a community hint: the top-ranked surviving hint left
 * by solvers on the country's previous cycle. There are no auto-generated hints,
 * so if no community hint exists yet, none is shown.
 */
export type RevealedHint = {
  kind: "community";
  text: string;
  /** How many surviving hints exist to browse (the top one is shown here). */
  poolSize: number;
};

/** A community hint or fun fact with the viewer's own vote/flag state. */
export type CommunityItem = {
  id: string;
  text: string;
  upvotes: number;
  downvotes: number;
  score: number;
  flagCount: number;
  myVote: "up" | "down" | null;
  myFlagged: boolean;
  mine: boolean;
};

export type CommunitySection = {
  /** Solved this cycle → may submit/vote/flag hints. */
  canParticipateHints: boolean;
  /** Solved this cycle → may submit/vote/flag fun facts. */
  canParticipateFacts: boolean;
  hasSubmittedHint: boolean;
  hasSubmittedFact: boolean;
  /** All surviving community hints for this country (what feeds the in-game hint). */
  hintPool: CommunityItem[];
  /** All surviving community fun facts for this country. */
  facts: CommunityItem[];
};

export type Answer = {
  cca3: string;
  cca2: string;
  name: string;
  officialName: string;
  flagEmoji: string;
  region: string | null;
  subregion: string | null;
};

export type GameState = {
  cycleNumber: number;
  dayIndex: number;
  listLength: number;
  flagUrl: string;
  status: GameStatus;
  guesses: GuessResult[];
  maxGuesses: number;
  hints: RevealedHint[];
  /** Present once the puzzle is finished (won or lost). */
  answer?: Answer;
  baselineFacts?: string[];
  community?: CommunitySection;
};
