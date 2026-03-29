import { isSolved } from "./data";
import type { AppState, RightPaneTab } from "./types";

export function setupEvents(
  root: HTMLElement,
  state: AppState,
  render: () => void
): void {
  function clearSelectedSignFromSyllabicMap(): void {
    if (!state.selectedSignId) {
      return;
    }

    for (const cellId of Object.keys(state.syllabicMap)) {
      if (state.syllabicMap[cellId] === state.selectedSignId) {
        delete state.syllabicMap[cellId];
      }
    }
  }

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const solved = isSolved(state);

    // Handle tab switching
    const tabButton = target.closest("[data-tab]");
    if (tabButton instanceof HTMLElement) {
      const tabName = tabButton.getAttribute("data-tab") as RightPaneTab;
      if (tabName) {
        state.selectedTab = tabName;
        render();
      }
      return;
    }

    if (solved) {
      return;
    }

    // Clear whichever hypothesis is active for the selected sign.
    const clearBtn = target.closest("[data-action='clear-hypothesis']");
    if (clearBtn instanceof HTMLElement && state.selectedSignId) {
      clearSelectedSignFromSyllabicMap();
      delete state.logogramGuesses[state.selectedSignId];
      render();
      return;
    }

    // Handle CV cell clicks
    const cvCell = target.closest("[data-cv-cell]");
    if (cvCell instanceof HTMLElement) {
      const cellId = cvCell.getAttribute("data-cv-cell");
      if (cellId) {
        const currentSign = state.syllabicMap[cellId];

        // If no sign selected and cell is occupied, select that sign
        if (!state.selectedSignId && currentSign) {
          state.selectedSignId = currentSign;
          render();
          return;
        }

        // If a sign is selected, assign/overwrite it to this cell
        if (state.selectedSignId) {
          clearSelectedSignFromSyllabicMap();
          delete state.logogramGuesses[state.selectedSignId];

          // Assign the selected sign to this cell (overwrites if occupied)
          state.syllabicMap[cellId] = state.selectedSignId;
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
        // Toggle selection: clicking same sign again to deselect
        state.selectedSignId =
          state.selectedSignId === signId ? null : signId;
        render();
      }
    }
  });

  root.addEventListener("change", (event) => {
    if (isSolved(state)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches("[data-logogram-select]")) {
      return;
    }

    if (!state.selectedSignId) {
      return;
    }

    clearSelectedSignFromSyllabicMap();

    if (target.value) {
      state.logogramGuesses[state.selectedSignId] = target.value;
    } else {
      delete state.logogramGuesses[state.selectedSignId];
    }

    render();
  });
}
