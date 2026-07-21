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

export type RevealedHint =
  | { level: 1; kind: "region"; text: string }
  | {
      level: 2;
      kind: "community" | "auto";
      text: string;
      /** Present for community hints: how many other surviving hints exist to browse. */
      poolSize?: number;
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
  /** Finished this cycle (won or lost) → may submit/vote/flag fun facts. */
  canParticipateFacts: boolean;
  hasSubmittedHint: boolean;
  hasSubmittedFact: boolean;
  /** Previous cycle's surviving hint pool (what fed this cycle's Hint 2). */
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
