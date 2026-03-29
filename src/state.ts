import type { AppState } from "./types";

export const initialState: AppState = {
  selectedTab: "instructions",
  selectedSignId: null,
  syllabicMap: {},
  logogramGuesses: {},
};
