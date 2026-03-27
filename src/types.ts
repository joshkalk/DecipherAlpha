export type Inscription = {
  id: string;
  words: string[][];
};

export type RightPaneTab = "tools" | "hypothesis" | "lexicon";

export type AppState = {
  selectedTab: RightPaneTab;
};
