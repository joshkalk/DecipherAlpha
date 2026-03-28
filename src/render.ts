import { corpus, lexicon } from "./data";
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

function renderSign(signId: string, isHighlighted: boolean): string {
  const imagePath = signImagePath(signId);
  const highlightClass = isHighlighted ? " is-highlighted" : "";

  
  if (!imagePath) {
    // Fallback text keeps corpus rows readable if an unexpected sign id appears.
    return `<span class="sign sign-missing${highlightClass}" data-sign-id="${signId}" aria-label="missing sign ${signId}">${signId}</span>`;
  }

  return `<img class="sign${highlightClass}" data-sign-id="${signId}" src="${imagePath}" alt="${signId}" loading="lazy" decoding="async" />`;
}

function renderInscription(inscription: Inscription, selectedSignId: string | null): string {
  const wordsMarkup = inscription.words
    .map((word) => {
      const signsMarkup = word.map((signId) => renderSign(signId, signId === selectedSignId)).join("");
      return `<span class="word" aria-label="word">${signsMarkup}</span>`;
    })
    .join("");

  const displayId = parseInt(inscription.id.slice(1)).toString();

  return `
    <article class="inscription-row" aria-label="Inscription ${inscription.id}">
      <span class="inscription-id">${displayId}</span>
      <div class="inscription-words">${wordsMarkup}</div>
    </article>
  `;
}

function renderLexicon(): string {
  const rows = lexicon
    .map(
      (entry) => `
      <tr>
        <td class="lex-col-english">${entry.english}</td>
        <td class="lex-col-yot">${entry.yot}</td>
      </tr>
    `
    )
    .join("");

  return `
    <table class="lexicon-table">
      <thead>
        <tr>
          <th class="lex-col-english">English</th>
          <th class="lex-col-yot">Yot</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTabButton(tabName: "tools" | "hypothesis" | "lexicon", isActive: boolean): string {
  const label = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const activeClass = isActive ? " is-active" : "";
  const ariaAttr = isActive ? ' aria-current="page"' : "";

  return `<button class="tab${activeClass}" type="button" data-tab="${tabName}"${ariaAttr}>${label}</button>`;
}

export function renderApp(state: AppState): string {
  const corpusMarkup = corpus.map((inscription) => renderInscription(inscription, state.selectedSignId)).join("");

  const toolsActive = state.selectedTab === "tools";
  const hypothesisActive = state.selectedTab === "hypothesis";
  const lexiconActive = state.selectedTab === "lexicon";

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
        </header>

        <nav class="tab-row" aria-label="Workbench tabs">
          ${renderTabButton("tools", toolsActive)}
          ${renderTabButton("hypothesis", hypothesisActive)}
          ${renderTabButton("lexicon", lexiconActive)}
        </nav>

        <div class="tab-panels">
          <section class="panel${toolsActive ? " is-active" : ""}" aria-label="Tools panel"${toolsActive ? ' role="tabpanel"' : ""}>
            <h3>Tools</h3>
            <p>Placeholder for filters, inspectors, and utility controls.</p>
          </section>

          <section class="panel${hypothesisActive ? " is-active" : ""}" aria-label="Hypothesis panel"${hypothesisActive ? ' role="tabpanel"' : ""}>
            <h3>Hypothesis</h3>
            <p>Placeholder for candidate mappings and notes.</p>
          </section>

          <section class="panel${lexiconActive ? " is-active" : ""}" aria-label="Lexicon panel"${lexiconActive ? ' role="tabpanel"' : ""}>
            <h3>Lexicon</h3>
            ${renderLexicon()}
          </section>
        </div>
      </section>
    </main>
  `;
}
