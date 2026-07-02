import { getActivePuzzle, getCorrectCount, getTotalCorrectSigns, isSolved } from "./data";
import { getActiveProgress, getLevel0TutorialState } from "./state";
import type { AppState, Inscription, Level0TutorialState, LexiconEntry, Puzzle } from "./types";

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

const level0FirstGuideTarget = {
  signId: "guard",
  inscriptionId: "t01",
  wordIndex: 0,
  signIndex: 0,
};

type CorpusSignContext = {
  inscriptionId: string;
  wordIndex: number;
  signIndex: number;
  isFirstGuideTarget: boolean;
};

type Level0TutorialCopy = {
  banner: string;
  title: string;
  text: string;
};

function signImagePath(signId: string): string | null {
  return signImageById[signId] ?? null;
}

function renderSign(signId: string, isHighlighted: boolean, context?: CorpusSignContext): string {
  const imagePath = signImagePath(signId);
  const highlightClass = isHighlighted ? " is-highlighted" : "";
  const guideClass = context?.isFirstGuideTarget ? " is-guide-target" : "";
  const contextAttrs = context
    ? ` data-inscription-id="${context.inscriptionId}" data-word-index="${context.wordIndex}" data-sign-index="${context.signIndex}"`
    : "";

  
  if (!imagePath) {
    // Fallback text keeps corpus rows readable if an unexpected sign id appears.
    return `<span class="sign sign-missing${highlightClass}${guideClass}" data-sign-id="${signId}"${contextAttrs} aria-label="missing sign ${signId}">${signId}</span>`;
  }

  return `<img class="sign${highlightClass}${guideClass}" data-sign-id="${signId}"${contextAttrs} src="${imagePath}" alt="${signId}" loading="lazy" decoding="async" />`;
}

function getSyllabicCellForSign(signId: string, syllabicMap: Record<string, string>): string | null {
  for (const [cellId, mappedSignId] of Object.entries(syllabicMap)) {
    if (mappedSignId === signId) {
      return cellId;
    }
  }

  return null;
}

function getEnglishForReading(reading: string, lexicon: LexiconEntry[]): string {
  const entry = lexicon.find((item) => item.yot === reading);
  return entry?.english ?? "";
}

function getLexiconEntryForEnglish(english: string, lexicon: LexiconEntry[]) {
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
  puzzle: Puzzle,
  inscriptionId: string,
  wordIndex: number,
  word: string[],
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
  emphasizeFirstGuideTarget: boolean,
): string {
  const glyphsMarkup = word
    .map((signId, signIndex) => {
      const isFirstGuideTarget = emphasizeFirstGuideTarget
        && signId === level0FirstGuideTarget.signId
        && inscriptionId === level0FirstGuideTarget.inscriptionId
        && wordIndex === level0FirstGuideTarget.wordIndex
        && signIndex === level0FirstGuideTarget.signIndex;

      return renderSign(signId, signId === selectedSignId, {
        inscriptionId,
        wordIndex,
        signIndex,
        isFirstGuideTarget,
      });
    })
    .join("");
  const readingParts = getSyllabicReadingParts(word, syllabicMap);
  const fullReading = readingParts.every(Boolean) ? readingParts.join("-") : "";
  const englishFromReading = fullReading ? getEnglishForReading(fullReading, puzzle.lexicon) : "";
  const logogramGuess = word.length === 1 ? (logogramGuesses[word[0]] ?? "") : "";
  const logogramEntry = logogramGuess ? getLexiconEntryForEnglish(logogramGuess, puzzle.lexicon) : null;
  const englishLine = logogramGuess || englishFromReading;
  const syllabicLine = logogramEntry && logogramEntry.yot
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
  puzzle: Puzzle,
  inscription: Inscription,
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
  emphasizeFirstGuideTarget: boolean,
): string {
  const wordsMarkup = inscription.words
    .map((word, index) => {
      const separatorMarkup = index === 0 ? "" : `<span class="word-separator" aria-hidden="true"></span>`;
      return `${separatorMarkup}<span class="word" aria-label="word">${renderCorpusWord(puzzle, inscription.id, index, word, selectedSignId, syllabicMap, logogramGuesses, emphasizeFirstGuideTarget)}</span>`;
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

function renderLexicon(puzzle: Puzzle): string {
  const rows = puzzle.lexicon
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
function getAllSigns(corpus: Inscription[]): string[] {
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
function getPositionalFrequency(corpus: Inscription[]): Record<string, { first: number; middle: number; last: number }> {
  const freq: Record<string, { first: number; middle: number; last: number }> = {};

  getAllSigns(corpus).forEach((sign) => {
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
function getUnigramFrequency(corpus: Inscription[]): Array<{ sign: string; count: number }> {
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
function getBigramFrequency(corpus: Inscription[]): Array<{ left: string; right: string; count: number }> {
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

function renderSignInventory(puzzle: Puzzle, selectedSignId: string | null): string {
  const signs = getAllSigns(puzzle.corpus);
  const signsMarkup = signs
    .map((sign) => {
      const isHighlighted = sign === selectedSignId;
      return renderSign(sign, isHighlighted);
    })
    .join("");

  return `
    <div class="tools-section">
      <p class="section-helper-text">Use these tools to compare repetition, position, and neighboring signs.</p>
      <h3>Sign Inventory</h3>
      <div class="sign-inventory-grid">
        ${signsMarkup}
      </div>
    </div>
  `;
}

function renderUnigramFrequency(puzzle: Puzzle, selectedSignId: string | null): string {
  const unigrams = getUnigramFrequency(puzzle.corpus);
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
      <h3>Single-Sign Frequency</h3>
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

function renderPositionalFrequency(puzzle: Puzzle, selectedSignId: string | null): string {
  const positional = getPositionalFrequency(puzzle.corpus);
  const signs = getAllSigns(puzzle.corpus);

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
      <h3>Position in Inscription</h3>
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

function renderBigramFrequency(puzzle: Puzzle, selectedSignId: string | null): string {
  const bigrams = getBigramFrequency(puzzle.corpus);
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
      <h3>Neighbor Pairs</h3>
      <table class="frequency-table">
        <thead>
          <tr>
            <th class="freq-col-bigram">Pair</th>
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
        <p class="selected-sign-status">Select a sign to begin.</p>
      </div>
    `;
  }

  const imagePath = signImagePath(selectedSignId);
  const imageMarkup = imagePath
    ? `<img class="selected-sign-image" src="${imagePath}" alt="${selectedSignId}" />`
    : `<span class="selected-sign-image-missing">${selectedSignId}</span>`;

  let status = "No guess yet";
  let hasGuess = false;
  for (const [cellId, signId] of Object.entries(syllabicMap)) {
    if (signId === selectedSignId) {
      status = `Syllable: ${cellId}`;
      hasGuess = true;
      break;
    }
  }

  const logogramGuess = logogramGuesses[selectedSignId];
  if (logogramGuess) {
    status = `Logogram: ${logogramGuess}`;
    hasGuess = true;
  }
  const clearButtonMarkup = hasGuess
    ? `<button class="clear-syllabic-btn" type="button" data-action="clear-hypothesis">Clear guess</button>`
    : "";

  return `
    <div class="selected-sign-header">
      <h3>Selected sign</h3>
      <div class="selected-sign-display">
        ${imageMarkup}
      </div>
      <p class="selected-sign-status">${status}</p>
      ${clearButtonMarkup}
    </div>
  `;
}

function renderLevel1BridgeMessage(): string {
  return `
    <div class="bridge-message" aria-label="Level 1 bridge">
      <p>The next tablet is harder. Some signs are whole word logograms, and some signs are syllables. One sign is familiar from the tutorial: guard. Use that foothold, then use the tools to look for broader patterns.</p>
    </div>
  `;
}

function renderInstructions(puzzle: Puzzle, showLevel1Bridge: boolean): string {
  if (!puzzle.hasSyllabicSigns) {
    return `
      <div class="instructions-panel">
        <h3>Instructions</h3>

        <div class="instructions-section">
          <p>This tutorial tablet uses only logograms. Each sign stands for a whole word.</p>
          <p>Click a sign in the tablet, then choose a possible meaning in the Hypothesis tab. Your guesses are temporary. If the evidence changes, you can change them.</p>
          <p>Use repeated signs and sentence position to test your guesses. First and last signs are often people or things. Middle signs are often actions.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="instructions-panel">
      <h3>Instructions</h3>

      ${showLevel1Bridge ? renderLevel1BridgeMessage() : ""}

      <div class="instructions-section">
        <h4>Goal</h4>
        <p>Decipher all 20 symbols in the Yot writing system.</p>
      </div>

      <div class="instructions-section">
        <h4>The basic idea</h4>
        <ul class="instructions-list">
          <li>The inscriptions on the left are your evidence.</li>
          <li>This script mixes <strong>logograms</strong> (one symbol = one whole word) and <strong>syllabic signs</strong> (one symbol = one syllable).</li>
          <li>Use repetition, word position, neighboring signs, and the lexicon to form hypotheses.</li>
        </ul>
      </div>

      <div class="instructions-section">
        <h4>What to do</h4>
        <ol class="instructions-list instructions-list-numbered">
          <li>Click any symbol in the corpus or Tools tab to highlight it.</li>
          <li>Look for where it repeats and what signs appear around it.</li>
          <li>Use the Tools tab to study frequency, position, and neighboring pairs.</li>
          <li>Go to the Hypothesis tab to assign the selected symbol.</li>
          <li>If you think it is syllabic, place it in the syllable grid.</li>
          <li>If you think the symbol is a logogram, choose a word from the dropdown.</li>
          <li>The corpus will update with your current guesses.</li>
          <li>Change your guesses whenever you want.</li>
        </ol>
      </div>

      <div class="instructions-section">
        <h4>Remember</h4>
        <ul class="instructions-list">
          <li>Vertical lines in the corpus separate words.</li>
          <li>Not every word in the lexicon appears in the corpus.</li>
          <li>You do not need to get everything right immediately.</li>
          <li>You will get a signal when you are close.</li>
          <li>The puzzle is complete when all 20 symbols are identified correctly.</li>
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
    <div class="cv-grid-section">
      <p class="section-helper-text">Place the selected sign in the syllable you think it represents.</p>
      <div class="cv-grid-container">
        <div class="cv-grid-header">
          <div class="cv-corner">Syllables</div>
          ${colHeaders}
        </div>
        ${cellRows}
      </div>
    </div>
  `;
}

function renderLogogramGuessSection(
  puzzle: Puzzle,
  selectedSignId: string | null,
  logogramGuesses: Record<string, string>,
): string {
  const selectedWord = selectedSignId ? (logogramGuesses[selectedSignId] ?? "") : "";
  const renderOption = (entry: LexiconEntry): string => {
      const isSelected = entry.english === selectedWord ? ' selected' : "";
      return `<option value="${entry.english}"${isSelected}>${entry.english}</option>`;
  };
  const sortByEnglish = (entries: LexiconEntry[]): LexiconEntry[] =>
    [...entries].sort((left, right) => left.english.localeCompare(right.english));
  const nouns = sortByEnglish(puzzle.lexicon.filter((entry) => entry.category === "noun"));
  const verbs = sortByEnglish(puzzle.lexicon.filter((entry) => entry.category === "verb"));
  const options = nouns.length || verbs.length
    ? `
        <optgroup label="Nouns">
          ${nouns.map(renderOption).join("")}
        </optgroup>
        <optgroup label="Verbs">
          ${verbs.map(renderOption).join("")}
        </optgroup>
      `
    : sortByEnglish(puzzle.lexicon).map(renderOption).join("");
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
      ${puzzle.hasSyllabicSigns ? `<p class="section-helper-text">If you think the selected sign is a whole word, choose it here.</p>` : ""}
      <label class="logogram-guess-label" for="logogram-guess-select">Whole word guess</label>
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

function getLevel0TutorialCopy(
  tutorialState: Level0TutorialState,
  selectedSignId: string | null,
  correctCount: number,
  totalCorrectSigns: number,
): Level0TutorialCopy {
  if (correctCount === totalCorrectSigns) {
    return {
      banner: "Tablet solved. You matched every sign in this tutorial tablet.",
      title: "Tablet solved",
      text: "Every sign in this tutorial tablet has a matching meaning.",
    };
  }

  if (!tutorialState.hasCompletedFirstSignGuide) {
    if (tutorialState.hasSelectedFirstSignGuideTarget) {
      return {
        banner: "Open Hypothesis and choose a possible meaning for the selected sign.",
        title: "First clue",
        text: `This sign appears in the same position in more than one line. Repeated signs in repeated positions are strong candidates for the same word.<br /><span class="tutorial-emphasis">Use the Whole word guess menu to choose what you think this sign means.</span>`,
      };
    }

    if (tutorialState.firstSignMisclick) {
      return {
        banner: "Start by clicking the first sign in line 1.",
        title: "How to read this tablet",
        text: "For this first step, click the first sign in the first line.",
      };
    }

    return {
      banner: "Start by clicking the first sign in line 1.",
      title: "How to read this tablet",
      text: "The blue outlined sign appears more than once. Click it to highlight every matching sign.",
      };
    }

  if (
    correctCount < 4
    && tutorialState.activeStuckHintBestCorrectCount === tutorialState.bestCorrectCount
  ) {
    return {
      banner: "A useful next step is to solve a repeated middle sign.",
      title: "How to read this tablet",
      text: "A useful next step is to solve a repeated middle sign. Middle signs usually describe actions, so test one action word across every line where that sign appears.",
    };
  }

  if (tutorialState.hasMadeFirstGuess && selectedSignId && selectedSignId !== level0FirstGuideTarget.signId) {
    return {
      banner: "Choose a possible meaning for this sign, or click another sign to gather more evidence.",
      title: "Compare positions",
      text: "Look at where this sign appears. First and last signs are often people or things. Middle signs are often actions. Use that pattern to choose a possible meaning.",
    };
  }

  if (tutorialState.hasMadeFirstGuess) {
    return {
      banner: "Click another repeated sign. Its position can help you guess what kind of word it is.",
      title: "Testing a guess",
      text: "Your guess now appears under every matching sign. It does not need to be final. You can revise guesses as new evidence appears. Repeated position can help you decide whether a sign is a person, thing, or action.",
    };
  }

  if (correctCount >= 6) {
    return {
      banner: "You are close.",
      title: "Compare positions",
      text: "Look for signs that appear in more than one sentence and test whether your guesses fit every line.",
    };
  }

  if (correctCount >= 4) {
    return {
      banner: "You have enough evidence to solve most of this tablet.",
      title: "Compare positions",
      text: "Try solving repeated middle signs before changing more guesses.",
    };
  }

  if (correctCount > 0) {
    return {
      banner: "Keep testing guesses across multiple lines.",
      title: "Compare positions",
      text: "First and last signs are often people or things. Middle signs are often actions.",
    };
  }

  return {
    banner: "Open Hypothesis and choose a possible meaning for the selected sign.",
    title: "First clue",
    text: `This sign appears in the same position in more than one line. Repeated signs in repeated positions are strong candidates for the same word.<br /><span class="tutorial-emphasis">Use the Whole word guess menu to choose what you think this sign means.</span>`,
  };
}

function renderLevel0TutorialPanel(
  tutorialState: Level0TutorialState,
  selectedSignId: string | null,
  correctCount: number,
  totalCorrectSigns: number,
): string {
  const copy = getLevel0TutorialCopy(tutorialState, selectedSignId, correctCount, totalCorrectSigns);
  const continueMarkup = correctCount === totalCorrectSigns
    ? `<button class="tutorial-continue-btn" type="button" data-action="continue-level1">Continue to Level 1</button>`
    : "";

  return `
    <aside class="tutorial-card" aria-label="Level 0 tutorial guidance">
      <h3>${copy.title}</h3>
      <p>${copy.text}</p>
      ${continueMarkup}
    </aside>
  `;
}

function renderLevel0OpeningScreen(): string {
  return `
    <main class="opening-screen" aria-labelledby="opening-title">
      <section class="opening-panel">
        <h1 id="opening-title">The Yot Tablet</h1>
        <p>You have been handed a tablet written in the ancient Yot script.</p>
        <p>You can speak Yot, but you have never seen the language written down. The words are familiar. The signs are not.</p>
        <p>This first tablet uses logograms: signs that stand for whole words.<br />If the same sign appears in more than one place, it means the same word each time.</p>
        <p><strong>Goal:</strong> Decipher the tablet by figuring out what each sign means.</p>
        <button class="opening-begin-btn" type="button" data-action="begin-level0">Begin decipherment</button>
      </section>
    </main>
  `;
}

function getVisibleTabs(
  puzzle: Puzzle,
  level0TutorialState: Level0TutorialState,
): Array<"instructions" | "hypothesis" | "tools" | "lexicon"> {
  if (puzzle.id === "level0" && !level0TutorialState.hasCompletedFirstSignGuide) {
    return ["hypothesis", "lexicon"];
  }

  return puzzle.hasSyllabicSigns
    ? ["instructions", "hypothesis", "tools", "lexicon"]
    : ["instructions", "hypothesis", "lexicon"];
}

function getRenderableTab(
  state: AppState,
  puzzle: Puzzle,
  level0TutorialState: Level0TutorialState,
): "instructions" | "hypothesis" | "tools" | "lexicon" {
  const visibleTabs = getVisibleTabs(puzzle, level0TutorialState);
  return visibleTabs.includes(state.selectedTab) ? state.selectedTab : visibleTabs[0];
}

function renderTabButton(tabName: "instructions" | "hypothesis" | "tools" | "lexicon", isActive: boolean): string {
  const label = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const activeClass = isActive ? " is-active" : "";
  const ariaAttr = isActive ? ' aria-current="page"' : "";

  return `<button class="tab${activeClass}" type="button" data-tab="${tabName}"${ariaAttr}>${label}</button>`;
}

function getBannerText(
  puzzle: Puzzle,
  correctCount: number,
  totalCorrectSigns: number,
  level0TutorialState: Level0TutorialState,
  selectedSignId: string | null,
): string {
  if (!puzzle.hasSyllabicSigns) {
    return getLevel0TutorialCopy(level0TutorialState, selectedSignId, correctCount, totalCorrectSigns).banner;
  }

  if (correctCount === totalCorrectSigns) {
    return "Decipherment Complete!";
  }

  if (correctCount >= Math.max(totalCorrectSigns - 4, 1)) {
    return `You are close: ${correctCount} of ${totalCorrectSigns} correct`;
  }

  return `${correctCount} of ${totalCorrectSigns} correct`;
}

function renderCorpusHeader(
  puzzle: Puzzle,
  correctCount: number,
  level0TutorialState: Level0TutorialState,
  selectedSignId: string | null,
): string {
  const totalCorrectSigns = getTotalCorrectSigns(puzzle);
  const bannerText = getBannerText(puzzle, correctCount, totalCorrectSigns, level0TutorialState, selectedSignId);
  const tutorialHeaderClass = puzzle.hasSyllabicSigns ? "" : " pane-header-corpus-tutorial";
  const bannerMarkup = puzzle.id === "level0" && !level0TutorialState.hasCompletedFirstSignGuide
    ? ""
    : `
      <div class="corpus-banner">
        ${bannerText}
      </div>
    `;

  return `
    <header class="pane-header pane-header-corpus${tutorialHeaderClass}">
      <div class="pane-header-copy">
        <h1 id="corpus-heading">Yot Inscriptions</h1>
        <div class="pane-helper-text">
          <p>Click a sign to highlight matching signs across the inscriptions.</p>
          <p>Vertical lines mark word breaks.</p>
        </div>
      </div>
      ${bannerMarkup}
    </header>
  `;
}

export function renderApp(state: AppState): string {
  const puzzle = getActivePuzzle(state);
  if (puzzle.id === "level0" && !state.hasStartedLevel0) {
    return renderLevel0OpeningScreen();
  }

  const progress = getActiveProgress(state);
  const level0TutorialState = getLevel0TutorialState(state);
  const correctCount = getCorrectCount(state, puzzle);
  const totalCorrectSigns = getTotalCorrectSigns(puzzle);
  const solved = isSolved(state, puzzle);
  const selectedSignId = solved ? null : state.selectedSignId;
  const activeTab = getRenderableTab(state, puzzle, level0TutorialState);
  const emphasizeFirstGuideTarget = puzzle.id === "level0"
    && !solved
    && !level0TutorialState.hasCompletedFirstSignGuide
    && !level0TutorialState.hasSelectedFirstSignGuideTarget;
  const tutorialPanelMarkup = puzzle.id === "level0"
    ? renderLevel0TutorialPanel(level0TutorialState, selectedSignId, correctCount, totalCorrectSigns)
    : "";
  const corpusMarkup = puzzle.corpus
    .map((inscription) =>
      renderInscription(
        puzzle,
        inscription,
        selectedSignId,
        progress.syllabicMap,
        progress.logogramGuesses,
        emphasizeFirstGuideTarget,
      ),
    )
    .join("");

  const visibleTabs = getVisibleTabs(puzzle, level0TutorialState);
  const instructionsActive = activeTab === "instructions";
  const toolsActive = activeTab === "tools";
  const hypothesisActive = activeTab === "hypothesis";
  const lexiconActive = activeTab === "lexicon";

  return `
    <main class="app-shell${solved ? " is-solved" : ""}" aria-label="Decipherment alpha layout">
      <section class="pane pane-corpus${solved ? " is-solved" : ""}" aria-labelledby="corpus-heading">
        ${renderCorpusHeader(puzzle, correctCount, level0TutorialState, selectedSignId)}

        <div class="pane-body pane-body-corpus">
          ${corpusMarkup}
        </div>
      </section>

      <section class="pane pane-workbench" aria-labelledby="workbench-heading">
        <header class="pane-header">
          <h2 id="workbench-heading">Workbench</h2>
        </header>

        <nav class="tab-row" aria-label="Workbench tabs">
          ${visibleTabs.map((tab) => renderTabButton(tab, activeTab === tab)).join("")}
        </nav>

        ${tutorialPanelMarkup}

        <div class="tab-panels">
          <section class="panel${instructionsActive ? " is-active" : ""}" aria-label="Instructions panel"${instructionsActive ? ' role="tabpanel"' : ""}>
            ${renderInstructions(puzzle, state.arrivedFromLevel0)}
          </section>

          <section class="panel${hypothesisActive ? " is-active" : ""}" aria-label="Hypothesis panel"${hypothesisActive ? ' role="tabpanel"' : ""}>
            ${renderSelectedSignHeader(selectedSignId, progress.syllabicMap, progress.logogramGuesses)}
            ${puzzle.hasSyllabicSigns ? renderCVGrid(progress.syllabicMap) : ""}
            ${renderLogogramGuessSection(puzzle, selectedSignId, progress.logogramGuesses)}
          </section>

          ${puzzle.hasSyllabicSigns ? `
            <section class="panel${toolsActive ? " is-active" : ""}" aria-label="Tools panel"${toolsActive ? ' role="tabpanel"' : ""}>
              ${renderSignInventory(puzzle, selectedSignId)}
              ${renderUnigramFrequency(puzzle, selectedSignId)}
              ${renderPositionalFrequency(puzzle, selectedSignId)}
              ${renderBigramFrequency(puzzle, selectedSignId)}
            </section>
          ` : ""}

          <section class="panel${lexiconActive ? " is-active" : ""}" aria-label="Lexicon panel"${lexiconActive ? ' role="tabpanel"' : ""}>
            <h3>Lexicon</h3>
            <p class="section-helper-text">These are possible Yot words. Not all of them appear in the inscriptions.</p>
            ${renderLexicon(puzzle)}
          </section>
        </div>
      </section>
    </main>
  `;
}
