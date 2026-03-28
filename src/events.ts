import type { AppState } from "./types";

export function setupEvents(
  root: HTMLElement,
  state: AppState,
  render: () => void
): void {
  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
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
}
