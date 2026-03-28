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
  appRoot.innerHTML = renderApp(state);
}

setupEvents(appRoot, state, render);
render();
