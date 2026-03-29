export type Inscription = {
  id: string;
  words: string[][];
};

export type LexiconEntry = {
  english: string;
  yot: string;
};

export type RightPaneTab = "instructions" | "hypothesis" | "tools" | "lexicon";

export type AppState = {
  selectedTab: RightPaneTab;
  selectedSignId: string | null;
  // Map of CV cell ids to sign ids, e.g. { "N-E": "sign1", "M-O": "sign2" }
  syllabicMap: Record<string, string>;
  // Map of sign ids to guessed lexicon words for logogram hypotheses.
  logogramGuesses: Record<string, string>;
};
