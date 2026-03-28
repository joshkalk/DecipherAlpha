import { corpus } from "./data";
import type { AppState, Inscription } from "./types";

const glyphModules = import.meta.glob<string>("./assets/Glyphs/*.png", {
  eager: true,
  import: "default",
});

const signImageById: Record<string, string> = Object.fromEntries(
  Object.entries(glyphModules)
    .map(([path, url]) => {
      const filename = path.split("/").pop();
      if (!filename) {
        return null;
      }

      const signId = filename.replace(/\.png$/i, "");
      return [signId, url] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null),
);

function signImagePath(signId: string): string | null {
  return signImageById[signId] ?? null;
}

function renderSign(signId: string): string {
  const imagePath = signImagePath(signId);
  if (!imagePath) {
    // Fallback text keeps corpus rows readable if an unexpected sign id appears.
    return `<span class="sign sign-missing" aria-label="missing sign ${signId}">${signId}</span>`;
  }

  return `<img class="sign" src="${imagePath}" alt="${signId}" loading="lazy" decoding="async" />`;
}

function renderInscription(inscription: Inscription): string {
  const wordsMarkup = inscription.words
    .map((word) => {
      const signsMarkup = word.map(renderSign).join("");
      return `<span class="word" aria-label="word">${signsMarkup}</span>`;
    })
    .join("");

  return `
    <article class="inscription-row" aria-label="Inscription ${inscription.id}">
      <span class="inscription-id">${inscription.id}</span>
      <div class="inscription-words">${wordsMarkup}</div>
    </article>
  `;
}

export function renderApp(state: AppState): string {
  const corpusMarkup = corpus.map(renderInscription).join("");

  return `
    <main class="app-shell" aria-label="Decipherment alpha layout">
      <section class="pane pane-corpus" aria-labelledby="corpus-heading">
        <header class="pane-header">
          <h1 id="corpus-heading">Corpus</h1>
          <p class="muted">${corpus.length} inscriptions</p>
        </header>

        <div class="pane-body pane-body-corpus">
          ${corpusMarkup}
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
