import { corpus } from "./data";
import type { AppState } from "./types";

export function renderApp(state: AppState): string {
  const firstIds = corpus
    .slice(0, 6)
    .map((inscription) => inscription.id)
    .join(", ");

  return `
    <main class="app-shell" aria-label="Decipherment alpha layout">
      <section class="pane pane-corpus" aria-labelledby="corpus-heading">
        <header class="pane-header">
          <h1 id="corpus-heading">Corpus</h1>
          <p class="muted">Left pane reserved for inscription content.</p>
        </header>

        <div class="pane-body">
          <p>This is a static scaffold only. Symbol rendering is not wired yet.</p>
          <p>Total inscriptions loaded: <strong>${corpus.length}</strong></p>
          <p class="muted">Example rows: ${firstIds}</p>
        </div>
      </section>

      <section class="pane pane-workbench" aria-labelledby="workbench-heading">
        <header class="pane-header">
          <h2 id="workbench-heading">Workbench</h2>
          <p class="muted">Right pane with static tabs.</p>
        </header>

        <nav class="tab-row" aria-label="Workbench tabs">
          <button class="tab is-active" type="button" aria-current="true">Tools</button>
          <button class="tab" type="button">Hypothesis</button>
          <button class="tab" type="button">Lexicon</button>
        </nav>

        <div class="tab-panels">
          <section class="panel" aria-label="Tools panel">
            <h3>Tools</h3>
            <p>Placeholder for filters, inspectors, and utility controls.</p>
          </section>

          <section class="panel" aria-label="Hypothesis panel">
            <h3>Hypothesis</h3>
            <p>Placeholder for candidate mappings and notes.</p>
          </section>

          <section class="panel" aria-label="Lexicon panel">
            <h3>Lexicon</h3>
            <p>Placeholder for discovered sign/group meanings.</p>
          </section>
        </div>

        <p class="muted small">Selected tab in state: ${state.selectedTab}</p>
      </section>
    </main>
  `;
}
