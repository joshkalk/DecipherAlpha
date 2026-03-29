import "./styles.css";
import { setupEvents } from "./events";
import { renderApp } from "./render";
import { initialState } from "./state";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("#app root element was not found.");
}

const appRoot = root;

let state = { ...initialState };

function render(): void {
  const corpusScrollTop =
    appRoot.querySelector<HTMLElement>(".pane-body-corpus")?.scrollTop ?? 0;
  const workbenchScrollTop =
    appRoot.querySelector<HTMLElement>(".tab-panels")?.scrollTop ?? 0;

  appRoot.innerHTML = renderApp(state);

  const corpusPane = appRoot.querySelector<HTMLElement>(".pane-body-corpus");
  const workbenchPane = appRoot.querySelector<HTMLElement>(".tab-panels");

  if (corpusPane) {
    corpusPane.scrollTop = corpusScrollTop;
  }

  if (workbenchPane) {
    workbenchPane.scrollTop = workbenchScrollTop;
  }
}

setupEvents(appRoot, state, render);
render();
