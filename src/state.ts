import type { AppState, Level0TutorialState, Level1GuidanceState, LevelProgress } from "./types";

function createEmptyProgress(): LevelProgress {
  return {
    syllabicMap: {},
    logogramGuesses: {},
  };
}

function createLevel0TutorialState(): Level0TutorialState {
  return {
    hasSelectedSign: false,
    hasMadeFirstGuess: false,
    guessChangeCount: 0,
    bestCorrectCount: 0,
    changesSinceBestCorrect: 0,
    activeStuckHintBestCorrectCount: null,
    lastStuckHintBestCorrectCount: null,
    hasSelectedFirstSignGuideTarget: false,
    hasCompletedFirstSignGuide: false,
    firstSignMisclick: false,
  };
}

function createLevel1GuidanceState(): Level1GuidanceState {
  return {
    hasOpenedLexicon: false,
    hasOpenedTools: false,
    guessChangeCount: 0,
    bestCorrectCount: 0,
    changesSinceBestCorrect: 0,
    activeStuckHintBestCorrectCount: null,
    lastStuckHintBestCorrectCount: null,
  };
}

export const initialState: AppState = {
  activeLevelId: "level0",
  hasStartedLevel0: false,
  isShowingLevel1Transition: false,
  selectedTab: "instructions",
  selectedSignId: null,
  progressByLevel: {
    level0: createEmptyProgress(),
    level1: createEmptyProgress(),
  },
  tutorialState: {
    level0: createLevel0TutorialState(),
    level1: createLevel1GuidanceState(),
  },
  hasCompletedLevel0: false,
  arrivedFromLevel0: false,
};

export function getActiveProgress(state: AppState): LevelProgress {
  return state.progressByLevel[state.activeLevelId];
}

export function getLevel0TutorialState(state: AppState): Level0TutorialState {
  return state.tutorialState.level0;
}

export function getLevel1GuidanceState(state: AppState): Level1GuidanceState {
  return state.tutorialState.level1;
}
