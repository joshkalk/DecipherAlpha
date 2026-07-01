import { getActivePuzzle, getCorrectCount, isSolved } from "./data";
import { getActiveProgress, getLevel0TutorialState } from "./state";
import type { AppState, LevelId, RightPaneTab } from "./types";

const level0FirstGuideTarget = {
  signId: "guard",
  inscriptionId: "t01",
  wordIndex: "0",
  signIndex: "0",
};

function isTabVisibleForActiveLevel(state: AppState, tabName: RightPaneTab): boolean {
  return getActivePuzzle(state).hasSyllabicSigns || tabName !== "tools";
}

function moveHiddenTabToVisibleTab(state: AppState): void {
  if (!isTabVisibleForActiveLevel(state, state.selectedTab)) {
    state.selectedTab = "instructions";
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

  if (correctCount > tutorialState.bestCorrectCount) {
    tutorialState.bestCorrectCount = correctCount;
    tutorialState.changesSinceBestCorrect = 0;
  } else {
    tutorialState.changesSinceBestCorrect++;
  }

  if (isSolved(state)) {
    state.hasCompletedLevel0 = true;
  }
}

function completeFirstGuideIfNeeded(state: AppState, guessedWord: string): void {
  if (state.activeLevelId !== "level0" || guessedWord !== "guard") {
    return;
  }

  const tutorialState = getLevel0TutorialState(state);
  if (!tutorialState.hasSelectedFirstSignGuideTarget || tutorialState.hasCompletedFirstSignGuide) {
    return;
  }

  tutorialState.hasCompletedFirstSignGuide = true;
  tutorialState.firstGuessMisstep = false;
}

function resetLevel1Progress(state: AppState): void {
  state.progressByLevel.level1 = {
    syllabicMap: {},
    logogramGuesses: {},
  };
}

function continueToLevel1(state: AppState): void {
  state.hasCompletedLevel0 = true;
  state.arrivedFromLevel0 = true;
  state.activeLevelId = "level1";
  state.selectedTab = "instructions";
  state.selectedSignId = null;
  resetLevel1Progress(state);
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

    // Handle tab switching
    const tabButton = target.closest("[data-tab]");
    if (tabButton instanceof HTMLElement) {
      const tabName = tabButton.getAttribute("data-tab") as RightPaneTab;
      if (tabName && isTabVisibleForActiveLevel(state, tabName)) {
        state.selectedTab = tabName;
        render();
      }
      return;
    }

    const levelButton = target.closest("[data-level-id]");
    if (levelButton instanceof HTMLElement) {
      const levelId = levelButton.getAttribute("data-level-id") as LevelId | null;
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
      continueToLevel1(state);
      render();
      return;
    }

    if (solved) {
      return;
    }

    // Clear whichever hypothesis is active for the selected sign.
    const clearBtn = target.closest("[data-action='clear-hypothesis']");
    if (clearBtn instanceof HTMLElement && state.selectedSignId) {
      clearSelectedSignFromSyllabicMap();
      delete progress.logogramGuesses[state.selectedSignId];
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
          clearSelectedSignFromSyllabicMap();
          delete progress.logogramGuesses[state.selectedSignId];

          // Assign the selected sign to this cell (overwrites if occupied)
          progress.syllabicMap[cellId] = state.selectedSignId;
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

    if (isLevel0FirstGuideActive(state)) {
      const tutorialState = getLevel0TutorialState(state);
      if (state.selectedSignId !== level0FirstGuideTarget.signId || target.value !== "guard") {
        tutorialState.firstGuessMisstep = true;
        render();
        return;
      }
    }

    clearSelectedSignFromSyllabicMap();

    if (target.value) {
      progress.logogramGuesses[state.selectedSignId] = target.value;
    } else {
      delete progress.logogramGuesses[state.selectedSignId];
    }

    if (target.value) {
      trackLevel0GuessChange(state);
      completeFirstGuideIfNeeded(state, target.value);
    }

    render();
  });
}
