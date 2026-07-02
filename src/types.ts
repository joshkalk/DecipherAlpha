export type Inscription = {
  id: string;
  words: string[][];
};

export type LevelId = "level0" | "level1";

export type LexiconEntry = {
  english: string;
  yot: string;
  category?: "noun" | "verb";
};

export type Puzzle = {
  id: LevelId;
  title: string;
  corpus: Inscription[];
  lexicon: LexiconEntry[];
  syllabicAnswerKey: Record<string, string>;
  logogramAnswerKey: Record<string, string>;
  hasSyllabicSigns: boolean;
};

export type RightPaneTab = "instructions" | "hypothesis" | "tools" | "lexicon";

export type LevelProgress = {
  // Map of CV cell ids to sign ids, e.g. { "N-E": "sign1", "M-O": "sign2" }
  syllabicMap: Record<string, string>;
  // Map of sign ids to guessed lexicon words for logogram hypotheses.
  logogramGuesses: Record<string, string>;
};

export type Level0TutorialState = {
  hasSelectedSign: boolean;
  hasMadeFirstGuess: boolean;
  guessChangeCount: number;
  bestCorrectCount: number;
  changesSinceBestCorrect: number;
  activeStuckHintBestCorrectCount: number | null;
  lastStuckHintBestCorrectCount: number | null;
  hasSelectedFirstSignGuideTarget: boolean;
  hasCompletedFirstSignGuide: boolean;
  firstSignMisclick: boolean;
};

export type AppState = {
  activeLevelId: LevelId;
  hasStartedLevel0: boolean;
  selectedTab: RightPaneTab;
  selectedSignId: string | null;
  progressByLevel: Record<LevelId, LevelProgress>;
  tutorialState: {
    level0: Level0TutorialState;
  };
  hasCompletedLevel0: boolean;
  arrivedFromLevel0: boolean;
};
