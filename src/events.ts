import { getActivePuzzle, getCorrectCount, isSolved } from "./data";
import { getActiveProgress, getLevel0TutorialState, getLevel1GuidanceState } from "./state";
import type { AppState, LevelId, RightPaneTab } from "./types";

const level0FirstGuideTarget = {
  signId: "guard",
  inscriptionId: "t01",
  wordIndex: "0",
  signIndex: "0",
};
const level0StuckHintGuessThreshold = 5;
const level0StuckHintCorrectLimit = 4;
const level1StuckHintGuessThreshold = 10;
const level1StuckHintCorrectLimit = 4;
const level1StuckHintChangesSinceBestThreshold = 5;

function isTabVisibleForActiveLevel(state: AppState, tabName: RightPaneTab): boolean {
  if (!getActivePuzzle(state).hasSyllabicSigns && tabName === "tools") {
    return false;
  }

  return state.activeLevelId !== "level0"
    || tabName !== "instructions"
    || getLevel0TutorialState(state).hasCompletedFirstSignGuide;
}

function moveHiddenTabToVisibleTab(state: AppState): void {
  if (!isTabVisibleForActiveLevel(state, state.selectedTab)) {
    state.selectedTab = isTabVisibleForActiveLevel(state, "instructions") ? "instructions" : "hypothesis";
  }
}

function markLevel0SignSelected(state: AppState): void {
  if (state.activeLevelId !== "level0") {
    return;
  }

  getLevel0TutorialState(state).hasSelectedSign = true;
}

function isLevel0FirstGuideActive(state: AppState): boolean {
  const puzzle = getActivePuzzle(state);
  return state.activeLevelId === "level0"
    && !isSolved(state, puzzle)
    && !getLevel0TutorialState(state).hasCompletedFirstSignGuide;
}

function isFirstGuideTargetSign(signElement: HTMLElement): boolean {
  return signElement.getAttribute("data-sign-id") === level0FirstGuideTarget.signId
    && signElement.getAttribute("data-inscription-id") === level0FirstGuideTarget.inscriptionId
    && signElement.getAttribute("data-word-index") === level0FirstGuideTarget.wordIndex
    && signElement.getAttribute("data-sign-index") === level0FirstGuideTarget.signIndex;
}

function selectFirstGuideTarget(state: AppState): void {
  const tutorialState = getLevel0TutorialState(state);
  state.selectedSignId = level0FirstGuideTarget.signId;
  tutorialState.hasSelectedSign = true;
  tutorialState.hasSelectedFirstSignGuideTarget = true;
  tutorialState.firstSignMisclick = false;
}

function blockFirstGuideMisclick(state: AppState): void {
  getLevel0TutorialState(state).firstSignMisclick = true;
}

function trackLevel0GuessChange(state: AppState): void {
  if (state.activeLevelId !== "level0") {
    return;
  }

  const tutorialState = getLevel0TutorialState(state);
  const correctCount = getCorrectCount(state);

  tutorialState.guessChangeCount++;
  tutorialState.hasMadeFirstGuess = true;
  tutorialState.activeStuckHintBestCorrectCount = null;

  if (correctCount > tutorialState.bestCorrectCount) {
    tutorialState.bestCorrectCount = correctCount;
    tutorialState.changesSinceBestCorrect = 0;
  } else {
    tutorialState.changesSinceBestCorrect++;
  }

  const shouldShowStuckHint = state.hasStartedLevel0
    && tutorialState.hasCompletedFirstSignGuide
    && !isSolved(state)
    && correctCount < level0StuckHintCorrectLimit
    && tutorialState.guessChangeCount >= level0StuckHintGuessThreshold
    && tutorialState.changesSinceBestCorrect >= level0StuckHintGuessThreshold
    && tutorialState.lastStuckHintBestCorrectCount !== tutorialState.bestCorrectCount;

  if (shouldShowStuckHint) {
    tutorialState.activeStuckHintBestCorrectCount = tutorialState.bestCorrectCount;
    tutorialState.lastStuckHintBestCorrectCount = tutorialState.bestCorrectCount;
  }

  if (isSolved(state)) {
    state.hasCompletedLevel0 = true;
  }
}

function trackLevel1GuessChange(state: AppState): void {
  if (state.activeLevelId !== "level1") {
    return;
  }

  const guidanceState = getLevel1GuidanceState(state);
  const correctCount = getCorrectCount(state);

  guidanceState.guessChangeCount++;
  guidanceState.activeStuckHintBestCorrectCount = null;

  if (correctCount > guidanceState.bestCorrectCount) {
    guidanceState.bestCorrectCount = correctCount;
    guidanceState.changesSinceBestCorrect = 0;
  } else {
    guidanceState.changesSinceBestCorrect++;
  }

  const shouldShowStuckHint = state.activeLevelId === "level1"
    && !isSolved(state)
    && correctCount < level1StuckHintCorrectLimit
    && guidanceState.guessChangeCount >= level1StuckHintGuessThreshold
    && guidanceState.changesSinceBestCorrect >= level1StuckHintChangesSinceBestThreshold
    && guidanceState.lastStuckHintBestCorrectCount !== guidanceState.bestCorrectCount;

  if (shouldShowStuckHint) {
    guidanceState.activeStuckHintBestCorrectCount = guidanceState.bestCorrectCount;
    guidanceState.lastStuckHintBestCorrectCount = guidanceState.bestCorrectCount;
  }
}

function completeFirstGuideIfNeeded(state: AppState): void {
  if (state.activeLevelId !== "level0") {
    return;
  }

  const tutorialState = getLevel0TutorialState(state);
  if (!tutorialState.hasSelectedFirstSignGuideTarget || tutorialState.hasCompletedFirstSignGuide) {
    return;
  }

  tutorialState.hasCompletedFirstSignGuide = true;
}

function resetLevel1Progress(state: AppState): void {
  state.progressByLevel.level1 = {
    syllabicMap: {},
    logogramGuesses: {},
  };
}

function resetLevel1GuidanceState(state: AppState): void {
  const guidanceState = getLevel1GuidanceState(state);
  guidanceState.hasOpenedLexicon = false;
  guidanceState.hasOpenedTools = false;
  guidanceState.guessChangeCount = 0;
  guidanceState.bestCorrectCount = getCorrectCount(state);
  guidanceState.changesSinceBestCorrect = 0;
  guidanceState.activeStuckHintBestCorrectCount = null;
  guidanceState.lastStuckHintBestCorrectCount = null;
}

function showLevel1Transition(state: AppState): void {
  state.hasCompletedLevel0 = true;
  state.isShowingLevel1Transition = true;
}

function beginLevel1(state: AppState): void {
  state.isShowingLevel1Transition = false;
  state.arrivedFromLevel0 = true;
  state.activeLevelId = "level1";
  resetLevel1Progress(state);
  state.progressByLevel.level1.logogramGuesses.guard = "guard";
  resetLevel1GuidanceState(state);
  state.selectedTab = "hypothesis";
  state.selectedSignId = "guard";
}

export function setupEvents(
  root: HTMLElement,
  state: AppState,
  render: () => void
): void {
  function clearSelectedSignFromSyllabicMap(): void {
    const progress = getActiveProgress(state);

    if (!state.selectedSignId) {
      return;
    }

    for (const cellId of Object.keys(progress.syllabicMap)) {
      if (progress.syllabicMap[cellId] === state.selectedSignId) {
        delete progress.syllabicMap[cellId];
      }
    }
  }

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const puzzle = getActivePuzzle(state);
    const progress = getActiveProgress(state);
    const solved = isSolved(state, puzzle);

    const beginButton = target.closest("[data-action='begin-level0']");
    if (beginButton instanceof HTMLElement && state.activeLevelId === "level0") {
      state.hasStartedLevel0 = true;
      moveHiddenTabToVisibleTab(state);
      render();
      return;
    }

    const beginLevel1Button = target.closest("[data-action='begin-level1']");
    if (beginLevel1Button instanceof HTMLElement && state.isShowingLevel1Transition) {
      beginLevel1(state);
      render();
      return;
    }

    // Handle tab switching
    const tabButton = target.closest("[data-tab]");
    if (tabButton instanceof HTMLElement) {
      const tabName = tabButton.getAttribute("data-tab") as RightPaneTab;
      if (tabName && isTabVisibleForActiveLevel(state, tabName)) {
        state.selectedTab = tabName;
        if (state.activeLevelId === "level1") {
          const guidanceState = getLevel1GuidanceState(state);
          if (tabName === "lexicon") {
            guidanceState.hasOpenedLexicon = true;
          }
          if (tabName === "tools") {
            guidanceState.hasOpenedTools = true;
          }
        }
        render();
      }
      return;
    }

    const levelButton = target.closest("[data-level-id]");
    if (levelButton instanceof HTMLElement) {
      const levelId = levelButton.getAttribute("data-level-id") as LevelId | null;
      if (levelId === "level0") {
        state.isShowingLevel1Transition = false;
        state.activeLevelId = "level0";
        state.hasStartedLevel0 = false;
        state.selectedSignId = null;
        moveHiddenTabToVisibleTab(state);
        render();
        return;
      }
      if (levelId === "level1") {
        state.isShowingLevel1Transition = true;
        state.selectedSignId = null;
        render();
        return;
      }
      if (levelId && levelId !== state.activeLevelId) {
        state.activeLevelId = levelId;
        state.selectedSignId = null;
        moveHiddenTabToVisibleTab(state);
        render();
      }
      return;
    }

    const continueButton = target.closest("[data-action='continue-level1']");
    if (continueButton instanceof HTMLElement && puzzle.id === "level0" && solved) {
      showLevel1Transition(state);
      render();
      return;
    }

    if (solved) {
      return;
    }

    // Clear whichever hypothesis is active for the selected sign.
    const clearBtn = target.closest("[data-action='clear-hypothesis']");
    if (clearBtn instanceof HTMLElement && state.selectedSignId) {
      const hadLogogramGuess = Boolean(progress.logogramGuesses[state.selectedSignId]);
      const hadSyllabicGuess = Object.values(progress.syllabicMap).includes(state.selectedSignId);
      clearSelectedSignFromSyllabicMap();
      delete progress.logogramGuesses[state.selectedSignId];
      if (hadLogogramGuess || hadSyllabicGuess) {
        trackLevel0GuessChange(state);
        trackLevel1GuessChange(state);
      }
      render();
      return;
    }

    // Handle CV cell clicks
    const cvCell = target.closest("[data-cv-cell]");
    if (cvCell instanceof HTMLElement) {
      if (!puzzle.hasSyllabicSigns) {
        return;
      }

      const cellId = cvCell.getAttribute("data-cv-cell");
      if (cellId) {
        const currentSign = progress.syllabicMap[cellId];

        // If no sign selected and cell is occupied, select that sign
        if (!state.selectedSignId && currentSign) {
          state.selectedSignId = currentSign;
          render();
          return;
        }

        // If a sign is selected, assign/overwrite it to this cell
        if (state.selectedSignId) {
          const selectedSignId = state.selectedSignId;
          const previousCellForSelected = Object.entries(progress.syllabicMap)
            .find(([, signId]) => signId === selectedSignId)?.[0] ?? null;
          const hadLogogramGuess = Boolean(progress.logogramGuesses[selectedSignId]);
          const hasMeaningfulChange = previousCellForSelected !== cellId
            || currentSign !== selectedSignId
            || hadLogogramGuess;

          if (!hasMeaningfulChange) {
            return;
          }

          clearSelectedSignFromSyllabicMap();
          delete progress.logogramGuesses[selectedSignId];

          // Assign the selected sign to this cell (overwrites if occupied)
          progress.syllabicMap[cellId] = selectedSignId;
          trackLevel1GuessChange(state);
          render();
        }
      }
      return;
    }

    // Handle sign selection (from corpus and tools)
    const signElement = target.closest(".sign[data-sign-id]");
    if (signElement instanceof HTMLElement) {
      const signId = signElement.getAttribute("data-sign-id");
      if (signId) {
        if (isLevel0FirstGuideActive(state)) {
          if (isFirstGuideTargetSign(signElement)) {
            selectFirstGuideTarget(state);
          } else {
            blockFirstGuideMisclick(state);
          }
          render();
          return;
        }

        // Toggle selection: clicking same sign again to deselect
        state.selectedSignId =
          state.selectedSignId === signId ? null : signId;
        if (state.selectedSignId) {
          markLevel0SignSelected(state);
        }
        render();
      }
    }
  });

  root.addEventListener("change", (event) => {
    const puzzle = getActivePuzzle(state);
    const progress = getActiveProgress(state);

    if (isSolved(state, puzzle)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches("[data-logogram-select]")) {
      return;
    }

    if (!state.selectedSignId) {
      return;
    }

    const previousGuess = progress.logogramGuesses[state.selectedSignId] ?? "";
    if (target.value === previousGuess) {
      return;
    }

    clearSelectedSignFromSyllabicMap();

    if (target.value) {
      progress.logogramGuesses[state.selectedSignId] = target.value;
    } else {
      delete progress.logogramGuesses[state.selectedSignId];
    }

    if (state.activeLevelId === "level0") {
      trackLevel0GuessChange(state);
    }
    if (state.activeLevelId === "level1") {
      trackLevel1GuessChange(state);
    }

    if (target.value) {
      completeFirstGuideIfNeeded(state);
    }

    render();
  });
}
