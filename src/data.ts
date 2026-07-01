import type { AppState, Inscription, LevelId, LexiconEntry, Puzzle } from "./types";

const level0Corpus: Inscription[] = [
  { id: "t01", words: [["guard"], ["watches"], ["prisoner"]] },
  { id: "t02", words: [["warden"], ["watches"], ["guard"]] },
  { id: "t03", words: [["warden"], ["strikes"], ["prisoner"]] },
  { id: "t04", words: [["child"], ["watches"], ["prisoner"]] },
  { id: "t05", words: [["guard"], ["watches"], ["child"]] },
  { id: "t06", words: [["guard"], ["frees"], ["prisoner"]] },
  { id: "t07", words: [["warden"], ["strikes"], ["guard"]] },
  { id: "t08", words: [["guard"], ["strikes"], ["warden"]] },
  { id: "t09", words: [["prisoner"], ["frees"], ["child"]] },
  { id: "t10", words: [["prisoner"], ["frees"], ["guard"]] },
  { id: "t11", words: [["child"], ["thanks"], ["guard"]] },
  { id: "t12", words: [["prisoner"], ["thanks"], ["guard"]] },
];

const level0Lexicon: LexiconEntry[] = [
  { english: "breaks", yot: "DO-ME", category: "verb" },
  { english: "chain", yot: "NO-ME", category: "noun" },
  { english: "child", yot: "MA-NA", category: "noun" },
  { english: "door", yot: "MO-KA", category: "noun" },
  { english: "frees", yot: "DO-MA", category: "verb" },
  { english: "guard", yot: "NA-MO", category: "noun" },
  { english: "hides", yot: "DE-NE", category: "verb" },
  { english: "key", yot: "KE-MO", category: "noun" },
  { english: "prisoner", yot: "KA-ME", category: "noun" },
  { english: "strikes", yot: "DE-NO", category: "verb" },
  { english: "thanks", yot: "DA-KO", category: "verb" },
  { english: "torch", yot: "MA-DO", category: "noun" },
  { english: "watches", yot: "DA-MA", category: "verb" },
  { english: "warden", yot: "KO-NE", category: "noun" },
];

const level0LogogramAnswerKey: Record<string, string> = {
  guard: "guard",
  prisoner: "prisoner",
  warden: "warden",
  child: "child",
  watches: "watches",
  strikes: "strikes",
  frees: "frees",
  thanks: "thanks",
};

const level1Corpus: Inscription[] = [
  { id: "i01", words: [["NE", "MA", "DO"], ["NE"], ["gate"]] },
  { id: "i02", words: [["workers"], ["carry"], ["stone"], ["DA"], ["upper"]] },
  { id: "i03", words: [["workers"], ["carry"], ["ME", "KO"], ["DA"], ["upper"]] },
  { id: "i04", words: [["NE", "MA", "DO"], ["DO", "NE"], ["stone"], ["NE"], ["upper"]] },
  { id: "i05", words: [["MO", "NE"], ["NE"], ["upper"]] },
  { id: "i06", words: [["NE", "MA", "DO"], ["NE"], ["lower"], ["gate"]] },
  { id: "i07", words: [["workers"], ["carry"], ["stone"], ["DA"], ["lower"]] },
  { id: "i08", words: [["workers"], ["carry"], ["ME", "KO"], ["DA"], ["lower"]] },
  { id: "i09", words: [["workers"], ["carry"], ["MO", "NE"], ["DA"], ["lower"]] },
  { id: "i10", words: [["MO", "NE"], ["NE"], ["lower"]] },
  { id: "i11", words: [["workers"], ["carry"], ["stone"], ["DA"], ["lower"], ["chamber"]] },
  { id: "i12", words: [["workers"], ["carry"], ["ME", "KO"], ["DA"], ["lower"], ["chamber"]] },
  { id: "i13", words: [["guard"], ["NE"], ["lower"], ["gate"]] },
  { id: "i14", words: [["MO", "NE"], ["NE"], ["lower"], ["chamber"]] },
  { id: "i15", words: [["guard"], ["NE"], ["lower"], ["chamber"]] },
  { id: "i16", words: [["guard"], ["ME"], ["DA", "NO", "ME"], ["workers"], ["DA"], ["DA", "KE"], ["lower"], ["chamber"]] },
  { id: "i17", words: [["workers"], ["ME"], ["DA", "KE"], ["lower"], ["chamber"]] },
  { id: "i18", words: [["NE", "MA", "DO"], ["DA", "KE"], ["lower"], ["chamber"]] },
  { id: "i19", words: [["workers"], ["carry"], ["stone"], ["DA"], ["lower"], ["gate"]] },
  { id: "i20", words: [["MO", "NE"], ["NE"], ["lower"], ["gate"]] },
  { id: "i21", words: [["NE", "MA", "DO"], ["DO", "NE"], ["stone"], ["NE"], ["lower"], ["chamber"]] },
  { id: "i22", words: [["workers"], ["DE", "KA"], ["ME", "KO"], ["NE"], ["upper"]] },
  { id: "i23", words: [["workers"], ["ME"], ["DA", "KE"], ["lower"]] },
  { id: "i24", words: [["NE", "MA", "DO"], ["NA", "DE", "KO"], ["NE"], ["upper"]] },
  { id: "i25", words: [["upper"], ["KO", "ME"]] },
  { id: "i26", words: [["guard"], ["DA", "NO", "ME"], ["workers"], ["DA"], ["DA", "KE"], ["lower"], ["chamber"]] },
  { id: "i27", words: [["workers"], ["DE", "KA"], ["ME", "KO"], ["NE"], ["lower"], ["chamber"]] },
  { id: "i28", words: [["guard"], ["ME"], ["DA", "NO", "ME"], ["workers"], ["DA"], ["DA", "KE"], ["lower"]] },
  { id: "i29", words: [["workers"], ["ME"], ["DA", "KE"], ["lower"]] },
  { id: "i30", words: [["guard"], ["NE"], ["lower"], ["gate"]] },
  { id: "i31", words: [["guard"], ["DA", "MO"], ["lower"], ["chamber"]] },
  { id: "i32", words: [["workers"], ["NA", "DE", "KO"], ["NE"], ["upper"]] },
  { id: "i33", words: [["guard"], ["DA", "MO"], ["lower"], ["gate"]] },
  { id: "i34", words: [["lower"], ["KO", "ME"]] },
];

const level1Lexicon: LexiconEntry[] = [
  { english: "absent", yot: "NA-DE-KO" },
  { english: "allow", yot: "DA-NO-ME" },
  { english: "at", yot: "NO" },
  { english: "carry", yot: "DO-KO" },
  { english: "chamber", yot: "KE-NA-DO" },
  { english: "complete", yot: "KO-ME" },
  { english: "cut", yot: "DE-KA" },
  { english: "enter", yot: "DA-KE" },
  { english: "food", yot: "MO-NE" },
  { english: "foreman", yot: "NE-MA-DO" },
  { english: "gate", yot: "MA-KE" },
  { english: "guard", yot: "NA-MO" },
  { english: "in", yot: "NE" },
  { english: "lower", yot: "DE-MO" },
  { english: "messenger", yot: "NA-ME-DO" },
  { english: "not", yot: "ME" },
  { english: "rope", yot: "NE-KO" },
  { english: "seal", yot: "DA-MO" },
  { english: "set", yot: "DO-NE" },
  { english: "stone", yot: "NO-KA" },
  { english: "throw", yot: "DO-NA" },
  { english: "to", yot: "DA" },
  { english: "upper", yot: "KO-DA" },
  { english: "wood", yot: "ME-KO" },
  { english: "workers", yot: "KA-NO" },
];

const level1SyllabicAnswerKey: Record<string, string> = {
  DA: "D-A",
  DE: "D-E",
  DO: "D-O",
  KA: "K-A",
  KE: "K-E",
  KO: "K-O",
  MA: "M-A",
  ME: "M-E",
  MO: "M-O",
  NA: "N-A",
  NE: "N-E",
  NO: "N-O",
};

const level1LogogramAnswerKey: Record<string, string> = {
  carry: "carry",
  chamber: "chamber",
  gate: "gate",
  guard: "guard",
  lower: "lower",
  stone: "stone",
  upper: "upper",
  workers: "workers",
};

export const puzzles: Record<LevelId, Puzzle> = {
  level0: {
    id: "level0",
    title: "Level 0",
    corpus: level0Corpus,
    lexicon: level0Lexicon,
    syllabicAnswerKey: {},
    logogramAnswerKey: level0LogogramAnswerKey,
    hasSyllabicSigns: false,
  },
  level1: {
    id: "level1",
    title: "Level 1",
    corpus: level1Corpus,
    lexicon: level1Lexicon,
    syllabicAnswerKey: level1SyllabicAnswerKey,
    logogramAnswerKey: level1LogogramAnswerKey,
    hasSyllabicSigns: true,
  },
};

export function getPuzzle(levelId: LevelId): Puzzle {
  return puzzles[levelId];
}

export function getActivePuzzle(state: AppState): Puzzle {
  return getPuzzle(state.activeLevelId);
}

export function getTotalCorrectSigns(puzzle: Puzzle): number {
  return Object.keys(puzzle.syllabicAnswerKey).length + Object.keys(puzzle.logogramAnswerKey).length;
}

export function getCorrectCount(state: AppState, puzzle = getActivePuzzle(state)): number {
  const progress = state.progressByLevel[puzzle.id];
  let count = 0;

  for (const [signId, correctCellId] of Object.entries(puzzle.syllabicAnswerKey)) {
    if (progress.syllabicMap[correctCellId] === signId) {
      count++;
    }
  }

  for (const [signId, correctWord] of Object.entries(puzzle.logogramAnswerKey)) {
    if (progress.logogramGuesses[signId] === correctWord) {
      count++;
    }
  }

  return count;
}

export function isSolved(state: AppState, puzzle = getActivePuzzle(state)): boolean {
  return getCorrectCount(state, puzzle) === getTotalCorrectSigns(puzzle);
}
