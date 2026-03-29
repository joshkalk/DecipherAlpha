import { corpus, getCorrectCount, isSolved, lexicon, totalCorrectSigns } from "./data";
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

function getSyllabicCellForSign(signId: string, syllabicMap: Record<string, string>): string | null {
  for (const [cellId, mappedSignId] of Object.entries(syllabicMap)) {
    if (mappedSignId === signId) {
      return cellId;
    }
  }

  return null;
}

function getEnglishForReading(reading: string): string {
  const entry = lexicon.find((item) => item.yot === reading);
  return entry?.english ?? "";
}

function getLexiconEntryForEnglish(english: string) {
  return lexicon.find((item) => item.english === english) ?? null;
}

function getSyllabicReadingParts(
  word: string[],
  syllabicMap: Record<string, string>,
): string[] {
  return word.map((signId) => {
    const cellId = getSyllabicCellForSign(signId, syllabicMap);
    return cellId ? cellId.replace("-", "") : "";
  });
}

function renderSyllabicLine(parts: string[]): string {
  const slotsMarkup = parts
    .map((part, index) => {
      const separator = index === 0 || !parts[index - 1] || !part ? "" : "-";
      return `
        ${index === 0 ? "" : `<span class="corpus-word-reading-separator">${separator}</span>`}
        <span class="corpus-word-reading-slot">${part}</span>
      `;
    })
    .join("");

  return `<span class="corpus-word-reading">${slotsMarkup}</span>`;
}

function renderCorpusWord(
  word: string[],
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
): string {
  const glyphsMarkup = word
    .map((signId) => renderSign(signId, signId === selectedSignId))
    .join("");
  const readingParts = getSyllabicReadingParts(word, syllabicMap);
  const fullReading = readingParts.every(Boolean) ? readingParts.join("-") : "";
  const englishFromReading = fullReading ? getEnglishForReading(fullReading) : "";
  const logogramGuess = word.length === 1 ? (logogramGuesses[word[0]] ?? "") : "";
  const logogramEntry = logogramGuess ? getLexiconEntryForEnglish(logogramGuess) : null;
  const englishLine = logogramGuess || englishFromReading;
  const syllabicLine = logogramEntry
    ? `<span class="corpus-word-reading corpus-word-reading-full">${logogramEntry.yot}</span>`
    : renderSyllabicLine(readingParts);

  return `
    <span class="corpus-word-stack">
      <span class="corpus-word-glyphs">${glyphsMarkup}</span>
      ${syllabicLine}
      <span class="corpus-word-english">${englishLine}</span>
    </span>
  `;
}

function renderInscription(
  inscription: Inscription,
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
): string {
  const wordsMarkup = inscription.words
    .map((word, index) => {
      const separatorMarkup = index === 0 ? "" : `<span class="word-separator" aria-hidden="true"></span>`;
      return `${separatorMarkup}<span class="word" aria-label="word">${renderCorpusWord(word, selectedSignId, syllabicMap, logogramGuesses)}</span>`;
    })
    .join("");

  const displayId = parseInt(inscription.id.slice(1)).toString();

  return `
    <article class="inscription-row" aria-label="Inscription ${inscription.id}">
      <span class="inscription-id">${displayId}</span>
      <div class="inscription-content">
        <div class="inscription-labels" aria-hidden="true">
          <span class="inscription-label inscription-label-script">Script</span>
          <span class="inscription-label inscription-label-yot">Yot</span>
          <span class="inscription-label inscription-label-english">English</span>
        </div>
        <div class="inscription-words">${wordsMarkup}</div>
      </div>
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

// Extract all unique signs from corpus in first-appearance order.
function getAllSigns(): string[] {
  const signs = new Set<string>();
  corpus.forEach((inscription) => {
    inscription.words.forEach((word) => {
      word.forEach((signId) => {
        signs.add(signId);
      });
    });
  });
  return Array.from(signs);
}

// Get all signs as a flat stream for an inscription
function getSignStream(inscription: Inscription): string[] {
  return inscription.words.flat();
}

// Count occurrences of each sign at each position (first/middle/last)
function getPositionalFrequency(): Record<string, { first: number; middle: number; last: number }> {
  const freq: Record<string, { first: number; middle: number; last: number }> = {};

  getAllSigns().forEach((sign) => {
    freq[sign] = { first: 0, middle: 0, last: 0 };
  });

  corpus.forEach((inscription) => {
    const stream = getSignStream(inscription);
    if (stream.length === 0) return;

    const firstSign = stream[0];
    const lastSign = stream[stream.length - 1];

    freq[firstSign].first++;
    freq[lastSign].last++;

    // All middle signs (everything except first and last, or if only 1 sign, it's just first)
    for (let i = 1; i < stream.length - 1; i++) {
      freq[stream[i]].middle++;
    }
  });

  return freq;
}

// Count unigram occurrences
function getUnigramFrequency(): Array<{ sign: string; count: number }> {
  const freq: Record<string, number> = {};

  corpus.forEach((inscription) => {
    getSignStream(inscription).forEach((sign) => {
      freq[sign] = (freq[sign] ?? 0) + 1;
    });
  });

  return Object.entries(freq)
    .map(([sign, count]) => ({ sign, count }))
    .sort((a, b) => {
      // Sort by count descending, then alphabetically
      if (b.count !== a.count) return b.count - a.count;
      return a.sign.localeCompare(b.sign);
    });
}

// Count bigrams (adjacent sign pairs)
function getBigramFrequency(): Array<{ left: string; right: string; count: number }> {
  const freq: Record<string, number> = {};

  corpus.forEach((inscription) => {
    const stream = getSignStream(inscription);
    for (let i = 0; i < stream.length - 1; i++) {
      const key = `${stream[i]}|${stream[i + 1]}`;
      freq[key] = (freq[key] ?? 0) + 1;
    }
  });

  return Object.entries(freq)
    .map(([key, count]) => {
      const [left, right] = key.split("|");
      return { left, right, count };
    })
    .sort((a, b) => {
      // Sort by count descending, then alphabetically
      if (b.count !== a.count) return b.count - a.count;
      if (a.left !== b.left) return a.left.localeCompare(b.left);
      return a.right.localeCompare(b.right);
    });
}

function renderSignInventory(selectedSignId: string | null): string {
  const signs = getAllSigns();
  const signsMarkup = signs
    .map((sign) => {
      const isHighlighted = sign === selectedSignId;
      return renderSign(sign, isHighlighted);
    })
    .join("");

  return `
    <div class="tools-section">
      <h3>Sign Inventory</h3>
      <div class="sign-inventory-grid">
        ${signsMarkup}
      </div>
    </div>
  `;
}

function renderUnigramFrequency(selectedSignId: string | null): string {
  const unigrams = getUnigramFrequency();
  const rows = unigrams
    .map((entry, index) => {
      const isHighlighted = entry.sign === selectedSignId;
      return `
      <tr>
        <td class="freq-col-rank">${index + 1}</td>
        <td class="freq-col-sign">${renderSign(entry.sign, isHighlighted)}</td>
        <td class="freq-col-count">${entry.count}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="tools-section">
      <h3>Unigram Frequency</h3>
      <table class="frequency-table">
        <thead>
          <tr>
            <th class="freq-col-rank">Rank</th>
            <th class="freq-col-sign">Sign</th>
            <th class="freq-col-count">Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderPositionalFrequency(selectedSignId: string | null): string {
  const positional = getPositionalFrequency();
  const signs = getAllSigns();

  const rows = signs
    .map((sign) => {
      const isHighlighted = sign === selectedSignId;
      const counts = positional[sign];
      return `
      <tr>
        <td class="freq-col-sign">${renderSign(sign, isHighlighted)}</td>
        <td class="freq-col-count">${counts.first}</td>
        <td class="freq-col-count">${counts.middle}</td>
        <td class="freq-col-count">${counts.last}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="tools-section">
      <h3>Positional Frequency</h3>
      <table class="frequency-table">
        <thead>
          <tr>
            <th class="freq-col-sign">Sign</th>
            <th class="freq-col-count">First</th>
            <th class="freq-col-count">Middle</th>
            <th class="freq-col-count">Last</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderBigramFrequency(selectedSignId: string | null): string {
  const bigrams = getBigramFrequency();
  const rows = bigrams
    .map((entry) => {
      const leftHighlighted = entry.left === selectedSignId;
      const rightHighlighted = entry.right === selectedSignId;
      return `
      <tr>
        <td class="freq-col-bigram">${renderSign(entry.left, leftHighlighted)}${renderSign(entry.right, rightHighlighted)}</td>
        <td class="freq-col-count">${entry.count}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="tools-section">
      <h3>Bigram Frequency</h3>
      <table class="frequency-table">
        <thead>
          <tr>
            <th class="freq-col-bigram">Bigram</th>
            <th class="freq-col-count">Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderSelectedSignHeader(
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
): string {
  if (!selectedSignId) {
    return `
      <div class="selected-sign-header">
        <h3>Selected sign</h3>
        <div class="selected-sign-display">
          <div class="selected-sign-placeholder"></div>
        </div>
        <p class="selected-sign-status">No sign selected</p>
      </div>
    `;
  }

  const imagePath = signImagePath(selectedSignId);
  const imageMarkup = imagePath
    ? `<img class="selected-sign-image" src="${imagePath}" alt="${selectedSignId}" />`
    : `<span class="selected-sign-image-missing">${selectedSignId}</span>`;

  let status = "No guess";
  for (const [cellId, signId] of Object.entries(syllabicMap)) {
    if (signId === selectedSignId) {
      status = `Syllabic: ${cellId}`;
      break;
    }
  }

  const logogramGuess = logogramGuesses[selectedSignId];
  if (logogramGuess) {
    status = `Logogram: ${logogramGuess}`;
  }

  return `
    <div class="selected-sign-header">
      <h3>Selected sign</h3>
      <div class="selected-sign-display">
        ${imageMarkup}
      </div>
      <p class="selected-sign-status">${status}</p>
      <button class="clear-syllabic-btn" type="button" data-action="clear-hypothesis">Clear assignment</button>
    </div>
  `;
}

function renderInstructions(): string {
  return `
    <div class="instructions-panel">
      <h3>Instructions</h3>

      <div class="instructions-section">
        <h4>Goal</h4>
        <p>Decipher the 20 symbols of the Yot writing system.</p>
      </div>

      <div class="instructions-section">
        <h4>What you are looking at</h4>
        <ul class="instructions-list">
          <li><strong>Corpus:</strong> the full set of inscriptions you are trying to decipher</li>
          <li><strong>Logogram:</strong> one symbol that stands for a whole word</li>
          <li><strong>Syllabic sign:</strong> one symbol that stands for a syllable</li>
          <li><strong>CV grid:</strong> a chart where you assign a symbol to a consonant-vowel syllable such as NE or DO</li>
          <li><strong>Unigram:</strong> a single symbol counted across the corpus</li>
          <li><strong>Bigram:</strong> a pair of neighboring symbols counted across the corpus</li>
        </ul>
      </div>

      <div class="instructions-section">
        <h4>How to Play</h4>
        <ol class="instructions-list instructions-list-numbered">
          <li>Click a symbol in the corpus or in the Tools tab to highlight it.</li>
          <li>Look for where it repeats.</li>
          <li>Use the Tools tab to study how often it appears, where it appears, and which symbols appear next to it.</li>
          <li>Go to the Hypothesis tab.</li>
          <li>If you think the symbol is syllabic, place it in the CV grid.</li>
          <li>If you think the symbol is a logogram, choose a word from the dropdown.</li>
          <li>Watch the corpus update with your current guesses.</li>
          <li>Revise your guesses as you learn more.</li>
        </ol>
      </div>

      <div class="instructions-section">
        <h4>Useful reminders</h4>
        <ul class="instructions-list">
          <li>Vertical lines separate words in the corpus</li>
          <li>This script mixes logograms and syllabic signs</li>
          <li>Not every word in the lexicon is used in the corpus</li>
          <li>You can change your guesses at any time</li>
          <li>The puzzle is solved when all 20 symbols are correctly identified</li>
        </ul>
      </div>
    </div>
  `;
}

function renderCVGrid(syllabicMap: Record<string, string>): string {
  const rows = ["N", "M", "D", "K"];
  const cols = ["E", "O", "A"];

  // Build column header with labels
  const colHeaders = cols.map((col) => `<div class="cv-col-header">${col}</div>`).join("");

  // Build grid cells
  const cellRows = rows
    .map((row) => {
      const cells = cols
        .map((col) => {
          const cellId = `${row}-${col}`;
          const assignedSign = syllabicMap[cellId];
          const imageMarkup = assignedSign
            ? `<img class="cv-cell-image" src="${signImagePath(assignedSign)}" alt="${cellId}" />`
            : "";

          return `<div class="cv-cell" data-cv-cell="${cellId}">${imageMarkup}<span class="cv-cell-label">${cellId}</span></div>`;
        })
        .join("");

      return `
        <div class="cv-row">
          <div class="cv-row-header">${row}</div>
          ${cells}
        </div>
      `;
    })
    .join("");

  return `
    <div class="cv-grid-container">
      <div class="cv-grid-header">
        <div class="cv-corner">CV</div>
        ${colHeaders}
      </div>
      ${cellRows}
    </div>
  `;
}

function renderLogogramGuessSection(
  selectedSignId: string | null,
  logogramGuesses: Record<string, string>,
): string {
  const selectedWord = selectedSignId ? (logogramGuesses[selectedSignId] ?? "") : "";
  const options = lexicon
    .map((entry) => {
      const isSelected = entry.english === selectedWord ? ' selected' : "";
      return `<option value="${entry.english}"${isSelected}>${entry.english}</option>`;
    })
    .join("");
  const guessRows = Object.entries(logogramGuesses)
    .sort(([leftSignId], [rightSignId]) => leftSignId.localeCompare(rightSignId))
    .map(([signId, word]) => {
      const isHighlighted = signId === selectedSignId;
      return `
        <div class="logogram-guess-item">
          <div class="logogram-guess-sign">${renderSign(signId, isHighlighted)}</div>
          <span class="logogram-guess-word">${word}</span>
        </div>
      `;
    })
    .join("");
  const guessesMarkup = guessRows
    ? `<div class="logogram-guess-list" aria-label="Active logogram guesses">${guessRows}</div>`
    : "";

  return `
    <div class="logogram-guess-section">
      <label class="logogram-guess-label" for="logogram-guess-select">Logogram guess</label>
      <select
        id="logogram-guess-select"
        class="logogram-guess-select"
        data-logogram-select
        ${selectedSignId ? "" : "disabled"}
      >
        <option value="">-- no guess --</option>
        ${options}
      </select>
      ${guessesMarkup}
    </div>
  `;
}

function renderTabButton(tabName: "instructions" | "hypothesis" | "tools" | "lexicon", isActive: boolean): string {
  const label = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const activeClass = isActive ? " is-active" : "";
  const ariaAttr = isActive ? ' aria-current="page"' : "";

  return `<button class="tab${activeClass}" type="button" data-tab="${tabName}"${ariaAttr}>${label}</button>`;
}

function renderCorpusHeader(correctCount: number): string {
  let bannerText = "";

  if (correctCount === totalCorrectSigns) {
    bannerText = "Decipherment Complete!";
  } else if (correctCount >= 16) {
    bannerText = `You are close: ${correctCount} of ${totalCorrectSigns} correct`;
  }

  return `
    <header class="pane-header pane-header-corpus">
      <div class="pane-header-copy">
        <h1 id="corpus-heading">Yot Corpus</h1>
      </div>
      <div class="corpus-banner"${bannerText ? "" : ' aria-hidden="true"'}>
        ${bannerText}
      </div>
    </header>
  `;
}

export function renderApp(state: AppState): string {
  const correctCount = getCorrectCount(state);
  const solved = isSolved(state);
  const selectedSignId = solved ? null : state.selectedSignId;
  const corpusMarkup = corpus
    .map((inscription) =>
      renderInscription(
        inscription,
        selectedSignId,
        state.syllabicMap,
        state.logogramGuesses,
      ),
    )
    .join("");

  const instructionsActive = state.selectedTab === "instructions";
  const toolsActive = state.selectedTab === "tools";
  const hypothesisActive = state.selectedTab === "hypothesis";
  const lexiconActive = state.selectedTab === "lexicon";

  return `
    <main class="app-shell${solved ? " is-solved" : ""}" aria-label="Decipherment alpha layout">
      <section class="pane pane-corpus${solved ? " is-solved" : ""}" aria-labelledby="corpus-heading">
        ${renderCorpusHeader(correctCount)}

        <div class="pane-body pane-body-corpus">
          ${corpusMarkup}
        </div>
      </section>

      <section class="pane pane-workbench" aria-labelledby="workbench-heading">
        <header class="pane-header">
          <h2 id="workbench-heading">Workbench</h2>
        </header>

        <nav class="tab-row" aria-label="Workbench tabs">
          ${renderTabButton("instructions", instructionsActive)}
          ${renderTabButton("hypothesis", hypothesisActive)}
          ${renderTabButton("tools", toolsActive)}
          ${renderTabButton("lexicon", lexiconActive)}
        </nav>

        <div class="tab-panels">
          <section class="panel${instructionsActive ? " is-active" : ""}" aria-label="Instructions panel"${instructionsActive ? ' role="tabpanel"' : ""}>
            ${renderInstructions()}
          </section>

          <section class="panel${hypothesisActive ? " is-active" : ""}" aria-label="Hypothesis panel"${hypothesisActive ? ' role="tabpanel"' : ""}>
            ${renderSelectedSignHeader(selectedSignId, state.syllabicMap, state.logogramGuesses)}
            ${renderCVGrid(state.syllabicMap)}
            ${renderLogogramGuessSection(selectedSignId, state.logogramGuesses)}
          </section>

          <section class="panel${toolsActive ? " is-active" : ""}" aria-label="Tools panel"${toolsActive ? ' role="tabpanel"' : ""}>
            ${renderSignInventory(selectedSignId)}
            ${renderUnigramFrequency(selectedSignId)}
            ${renderPositionalFrequency(selectedSignId)}
            ${renderBigramFrequency(selectedSignId)}
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
