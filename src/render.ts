import { getActivePuzzle, getCorrectCount, getTotalCorrectSigns, isSolved } from "./data";
import { getActiveProgress, getLevel0TutorialState } from "./state";
import type { AppState, Inscription, Level0TutorialState, Level1GuidanceState, LexiconEntry, Puzzle, RightPaneTab } from "./types";

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
const level1FirstSyllableTarget = {
  signId: "NE",
  inscriptionId: "i01",
  wordIndex: 0,
  signIndex: 0,
};

type CorpusSignContext = {
  inscriptionId: string;
  wordIndex: number;
  signIndex: number;
  isFirstGuideTarget: boolean;
};

type GuidedWordTarget = {
  inscriptionId: string;
  wordIndex: number;
};

type Level0TutorialCopy = {
  banner: string;
  title: string;
  text: string;
};

type GuidanceCopy = {
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
  isGuidedWordTarget: boolean,
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
    <span class="corpus-word-stack${isGuidedWordTarget ? " is-guided-word-target" : ""}">
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
  guidedWordTargets: GuidedWordTarget[],
): string {
  const wordsMarkup = inscription.words
    .map((word, index) => {
      const separatorMarkup = index === 0 ? "" : `<span class="word-separator" aria-hidden="true"></span>`;
      const isGuidedWordTarget = guidedWordTargets.some((target) =>
        target.inscriptionId === inscription.id && target.wordIndex === index,
      );
      return `${separatorMarkup}<span class="word" aria-label="word">${renderCorpusWord(puzzle, inscription.id, index, word, selectedSignId, syllabicMap, logogramGuesses, emphasizeFirstGuideTarget, isGuidedWordTarget)}</span>`;
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

function renderLexicon(puzzle: Puzzle, highlightedSyllable: string | null = null): string {
  const groups = new Map<number, LexiconEntry[]>();

  puzzle.lexicon.forEach((entry) => {
    const syllableCount = entry.yot.split("-").length;
    const entries = groups.get(syllableCount) ?? [];
    entries.push(entry);
    groups.set(syllableCount, entries);
  });

  return Array.from(groups.entries())
    .sort(([countA], [countB]) => countA - countB)
    .map(([syllableCount, entries]) => {
      const rows = entries
        .sort((entryA, entryB) => entryA.english.localeCompare(entryB.english))
        .map(
          (entry) => `
      <tr>
        <td class="lex-col-english">${entry.english}</td>
        <td class="lex-col-yot">${renderYotSyllableChips(entry.yot, highlightedSyllable)}</td>
      </tr>
    `
        )
        .join("");

      return `
        <section class="lexicon-group" aria-labelledby="lexicon-group-${syllableCount}">
          <h4 id="lexicon-group-${syllableCount}">${syllableCount}-syllable words</h4>
          <p class="lexicon-group-cue">${getLexiconGroupCue(syllableCount)}</p>
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
        </section>
      `;
    })
    .join("");
}

function getLexiconGroupCue(syllableCount: number): string {
  if (syllableCount === 1) {
    return "These can match short one-sign Yot words, but a single sign may also be a whole word sign.";
  }

  if (syllableCount === 2) {
    return "These are useful candidates when you see a two-sign word in the stele.";
  }

  if (syllableCount === 3) {
    return "These are useful candidates when you see a three-sign word in the stele.";
  }

  return "These are useful candidates when you see a word with this many signs in the stele.";
}

function renderYotSyllableChips(yot: string, highlightedSyllable: string | null = null): string {
  const chips = yot
    .split("-")
    .map((syllable) => {
      const highlightClass = syllable === highlightedSyllable ? " is-highlighted-syllable" : "";
      return `<span class="syllable-chip${highlightClass}" aria-hidden="true">${syllable}</span>`;
    })
    .join("");

  return `<span class="syllable-chip-list" aria-label="${yot}">${chips}</span>`;
}

function getLexiconHelperText(puzzle: Puzzle): string {
  if (!puzzle.hasSyllabicSigns) {
    return "These are possible Yot words. The tutorial tablet uses whole word signs, so you may not need this tab yet.";
  }

  return "The Lexicon lists possible Yot words and their syllable spellings. Hyphens separate syllables. Use this tab to compare multi-sign words in the stele against possible Yot spellings. Not every word listed here appears in the stele.";
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
      <p class="section-helper-text">Use these tools to compare which signs appear, how often they repeat, and where they tend to sit in an inscription.</p>
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

function formatSyllableForDisplay(cellId: string): string {
  return cellId.replace("-", "");
}

function getCorpusObjectName(puzzle: Puzzle): string {
  return puzzle.id === "level0" ? "tutorial tablet" : "stele";
}

function renderHypothesisIntro(puzzle: Puzzle): string {
  if (puzzle.hasSyllabicSigns) {
    return "";
  }

  return `
    <div class="hypothesis-intro">
      <h3>Test the selected sign</h3>
      <p>This tutorial tablet uses whole word signs. Select a sign, choose a possible meaning, then revise if the evidence changes.</p>
    </div>
  `;
}

function renderSelectedSignHeader(
  puzzle: Puzzle,
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
        <p class="selected-sign-status">Select a sign in the ${getCorpusObjectName(puzzle)} to make a guess.</p>
      </div>
    `;
  }

  const imagePath = signImagePath(selectedSignId);
  const imageMarkup = imagePath
    ? `<img class="selected-sign-image" src="${imagePath}" alt="${selectedSignId}" />`
    : `<span class="selected-sign-image-missing">${selectedSignId}</span>`;

  let status = "No guess yet.";
  let hasGuess = false;
  for (const [cellId, signId] of Object.entries(syllabicMap)) {
    if (signId === selectedSignId) {
      status = `Syllable guess: ${formatSyllableForDisplay(cellId)}`;
      hasGuess = true;
      break;
    }
  }

  const logogramGuess = logogramGuesses[selectedSignId];
  if (logogramGuess) {
    status = `Whole word guess: ${logogramGuess}`;
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
      <p>The <strong>guard</strong> sign carried over from the tutorial tablet. Use that foothold, then compare repeated signs and word positions before making new guesses.</p>
    </div>
  `;
}

function renderInstructions(puzzle: Puzzle, showLevel1Bridge: boolean): string {
  if (!puzzle.hasSyllabicSigns) {
    return `
      <div class="instructions-panel">
        <h3>Instructions</h3>

        <div class="instructions-section">
          <p>This tutorial tablet uses only whole word signs. Each sign stands for a whole word.</p>
          <p>Click a sign in the tutorial tablet, then choose a possible meaning in the Whole words tab. Your guesses are temporary. If the evidence changes, you can change them.</p>
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
        <p>Decipher all 20 signs in the Yot stele.</p>
      </div>

      <div class="instructions-section">
        <h4>The basic idea</h4>
        <ul class="instructions-list">
          <li>The stele text on the left is your evidence.</li>
          <li>This script mixes <strong>whole word signs</strong> (one sign = one word) and <strong>syllable signs</strong> (one sign = one syllable).</li>
          <li>Use repetition, word position, and the Lexicon to form guesses.</li>
        </ul>
      </div>

      <div class="instructions-section">
        <h4>What to do</h4>
        <ol class="instructions-list instructions-list-numbered">
          <li>Click any sign in the corpus or Tools tab to highlight it.</li>
          <li>Look for where it repeats and where it appears in each inscription.</li>
          <li>Use the Tools tab to study the sign inventory, frequency, and position.</li>
          <li>Go to the Whole words tab to assign a selected whole word sign.</li>
          <li>If you think it is a syllable sign, place it in the syllable grid in the Syllables tab.</li>
          <li>If you think it is a whole word sign, choose a word from the dropdown.</li>
          <li>Each sign can hold one kind of guess at a time: syllable or whole word. Choosing one clears the other.</li>
          <li>The corpus will update with your current guesses.</li>
          <li>Change your guesses whenever you want.</li>
        </ol>
      </div>

      <div class="instructions-section">
        <h4>Remember</h4>
        <ul class="instructions-list">
          <li>Vertical lines in the corpus separate words.</li>
          <li>Not every word in the Lexicon appears in the corpus.</li>
          <li>You do not need to get everything right immediately.</li>
          <li>You will get a signal when you are close.</li>
          <li>The puzzle is complete when all 20 signs are identified correctly.</li>
        </ul>
      </div>
    </div>
  `;
}

function renderCVGrid(
  puzzle: Puzzle,
  selectedSignId: string | null,
  syllabicMap: Record<string, string>,
): string {
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
          const displaySyllable = formatSyllableForDisplay(cellId);
          const assignedSign = syllabicMap[cellId];
          const imageMarkup = assignedSign
            ? `<img class="cv-cell-image" src="${signImagePath(assignedSign)}" alt="${displaySyllable}" />`
            : "";

          return `<div class="cv-cell" data-cv-cell="${cellId}" aria-label="Syllable ${displaySyllable}">${imageMarkup}<span class="cv-cell-label">${displaySyllable}</span></div>`;
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
      <h3>Syllable guess</h3>
      <p class="section-helper-text">Use for signs inside longer Yot words.</p>
      ${selectedSignId ? "" : `<p class="empty-state-text">Select a sign in the ${getCorpusObjectName(puzzle)} to assign it here.</p>`}
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
  requiredWord: string | null = null,
): string {
  const selectedWord = selectedSignId ? (logogramGuesses[selectedSignId] ?? "") : "";
  const renderOption = (entry: LexiconEntry): string => {
      const isSelected = entry.english === selectedWord ? ' selected' : "";
      const disabledAttr = requiredWord && entry.english !== requiredWord ? " disabled" : "";
      const requiredClass = requiredWord === entry.english ? ' class="is-required-option"' : "";
      return `<option value="${entry.english}"${isSelected}${disabledAttr}${requiredClass}>${entry.english}</option>`;
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
  const helperText = requiredWord === "guard"
    ? "Choose guard to carry over the known sign from the tutorial."
    : "Use for signs that stand alone as whole words.";

  return `
    <div class="logogram-guess-section">
      <label class="logogram-guess-label" for="logogram-guess-select">Whole word guess</label>
      <p class="section-helper-text">${helperText}</p>
      ${selectedSignId ? "" : `<p class="empty-state-text">Select a sign in the ${getCorpusObjectName(puzzle)} to assign it here.</p>`}
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
        banner: "Open Whole words and choose a possible meaning for the selected sign.",
        title: "First clue",
        text: `This sign appears in the same position in more than one line. Repeated signs in repeated positions are strong candidates for the same word.<br /><span class="tutorial-emphasis">Use the whole word guess menu to choose what you think this sign means.</span>`,
      };
    }

    if (tutorialState.firstSignMisclick) {
      return {
        banner: "Start by clicking the first sign in line 1.",
        title: "How to read this tutorial tablet",
        text: "For this first step, click the first sign in the first line.",
      };
    }

    return {
      banner: "Start by clicking the first sign in line 1.",
      title: "How to read this tutorial tablet",
      text: "The blue outlined sign appears more than once. Click it to highlight every matching sign.",
      };
    }

  if (
    correctCount < 4
    && tutorialState.activeStuckHintBestCorrectCount === tutorialState.bestCorrectCount
  ) {
    return {
      banner: "A useful next step is to solve a repeated middle sign.",
      title: "How to read this tutorial tablet",
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
      banner: "You have enough evidence to solve most of this tutorial tablet.",
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
    banner: "Open Whole words and choose a possible meaning for the selected sign.",
    title: "First clue",
    text: `This sign appears in the same position in more than one line. Repeated signs in repeated positions are strong candidates for the same word.<br /><span class="tutorial-emphasis">Use the whole word guess menu to choose what you think this sign means.</span>`,
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
        <h1 id="opening-title">The Tutorial Tablet</h1>
        <p>You have been handed a tutorial tablet written in the ancient Yot script.</p>
        <p>You can speak Yot, but you have never seen the language written down. The words are familiar. The signs are not.</p>
        <p>This tutorial tablet uses whole word signs: signs that stand for whole words.<br />If the same sign appears in more than one place, it means the same word each time.</p>
        <p><strong>Before you begin, open the game in full screen mode. The tablet and workbench are easier to use when both panels fit on screen.</strong></p>
        <p><strong>Goal:</strong> Decipher the tutorial tablet by figuring out what each sign means.</p>
        <button class="opening-begin-btn" type="button" data-action="begin-level0">Begin decipherment</button>
      </section>
    </main>
  `;
}

function renderLevel1TransitionScreen(): string {
  return `
    <main class="opening-screen" aria-labelledby="level1-transition-title">
      <section class="opening-panel transition-panel">
        <h1 id="level1-transition-title">Level 1: The Stele</h1>
        <p>You solved the tutorial tablet. One sign carries forward: <strong>guard</strong>.</p>
        <p>The next inscription is a <strong>stele</strong>, a carved monument with a longer, more complex text.</p>
        <p><strong>Some signs are whole word signs. Other signs are syllables.</strong> Syllables combine into words in the Yot language. Vertical lines separate words.</p>
        <p>The <strong>Lexicon</strong> tab matters more now. Use it to compare multi-sign words in the stele against Yot spellings like <strong>NA-MO</strong>, <strong>DA-KE</strong>, or <strong>KO-ME</strong>.</p>
        <p>Your guesses are still temporary. Test one idea, check how it changes the stele, then revise when the evidence points elsewhere.</p>
        <button class="opening-begin-btn" type="button" data-action="begin-level1">Begin Level 1</button>
      </section>
    </main>
  `;
}

function doesSignAppearInMultiSignWord(puzzle: Puzzle, signId: string | null): boolean {
  if (!signId) {
    return false;
  }

  return puzzle.corpus.some((inscription) =>
    inscription.words.some((word) => word.length > 1 && word.includes(signId)),
  );
}

function isLevel1FirstSyllableBridgeActive(
  guidanceState: Level1GuidanceState,
  logogramGuesses: Record<string, string>,
): boolean {
  return logogramGuesses.guard === "guard"
    && (
      guidanceState.firstSyllableBridgeStep === "select-first-sign"
      || guidanceState.firstSyllableBridgeStep === "open-lexicon"
      || guidanceState.firstSyllableBridgeStep === "place-ne"
    );
}

function getLevel1GuidanceCopy(
  puzzle: Puzzle,
  guidanceState: Level1GuidanceState,
  selectedSignId: string | null,
  correctCount: number,
  totalCorrectSigns: number,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
): GuidanceCopy {
  if (logogramGuesses.guard !== "guard") {
    return {
      title: "Carry over the known sign",
      text: "You saw this sign in the tutorial. It means guard. Choose guard in Whole words to mark it on the stele.",
    };
  }

  if (guidanceState.firstSyllableBridgeStep === "select-first-sign") {
    if (guidanceState.firstSyllableMisclick) {
      return {
        title: "Select the first syllable sign",
        text: "Click the first sign in the highlighted word. We will use the Lexicon to test one syllable at a time.",
      };
    }

    return {
      title: "Some words are built from syllables",
      text: "This highlighted word has three signs. That means it is not a single whole word sign. Each sign is working as a syllable.<br />Click the first sign in the highlighted word. We will use the Lexicon to test one syllable at a time.",
    };
  }

  if (guidanceState.firstSyllableBridgeStep === "open-lexicon") {
    return {
      title: "Check the Lexicon for a syllable",
      text: "Open the Lexicon tab to test this sign against the word patterns in the stele.",
    };
  }

  if (guidanceState.firstSyllableBridgeStep === "place-ne") {
    return {
      title: "Check the Lexicon for a syllable",
      text: "This sign appears in several places: at the start of a three-sign word, inside shorter words, and once by itself. In the Lexicon, NE fits that pattern. Open the Syllables tab to place this sign in the NE cell.",
    };
  }

  if (guidanceState.firstSyllableBridgeStep === "ne-payoff") {
    return {
      title: "Syllable guesses update the whole stele",
      text: "You placed this sign as NE. The same sign now updates everywhere it appears. Because NE is also a complete Yot word on line 5, the stele can show its English meaning: in.",
    };
  }

  if (correctCount === totalCorrectSigns) {
    return {
      title: "Stele deciphered",
      text: "Every sign now has a working reading. The mixed system is resolved.",
    };
  }

  if (correctCount >= Math.max(totalCorrectSigns - 4, 1)) {
    return {
      title: "Finish by checking conflicts",
      text: "You are close. Look for signs with competing guesses, short words that might be one-syllable Yot words, and repeated multi-sign words that almost match the Lexicon.",
    };
  }

  if (correctCount === 1) {
    return {
      title: "Use guard as your foothold",
      text: "Guard is identified. Now look nearby: click a repeated sign, or check possible Yot words in the Lexicon.",
    };
  }

  if (guidanceState.changesSinceBestCorrect >= 8 && !guidanceState.hasOpenedTools) {
    return {
      title: "Use the Lexicon if you are stuck",
      text: "Look for a repeated multi-sign word in the stele. Compare its partial Yot reading with the Lexicon, then return here to test one sign.",
    };
  }

  if (guidanceState.changesSinceBestCorrect >= 5) {
    return {
      title: "Pause and compare evidence",
      text: "You may be changing guesses faster than the evidence supports. Pick one repeated multi-sign word, compare it with the Lexicon, and test one syllable at a time.",
    };
  }

  if (correctCount >= 6) {
    return {
      title: "You have enough evidence now",
      text: "Use your confirmed signs to attack repeated word shapes. The strongest path is usually: corpus pattern, Lexicon spelling, Syllables tab guess, then revision.",
    };
  }

  if (Object.keys(syllabicMap).length > 0) {
    return {
      title: "Compare partial readings",
      text: "Your syllable guesses now appear under matching signs in the corpus. Look for multi-sign words that are starting to resemble a Lexicon spelling, then revise one sign at a time.",
    };
  }

  if (doesSignAppearInMultiSignWord(puzzle, selectedSignId)) {
    return {
      title: "Test this sign as a syllable",
      text: "This sign appears inside a longer word. Try comparing the full word pattern against the Lexicon, then place the sign in the Syllables tab if a Yot spelling seems to fit.",
    };
  }

  if (!guidanceState.hasOpenedLexicon && guidanceState.guessChangeCount > 0) {
    return {
      title: "Check the Lexicon",
      text: "Multi-sign words are the key to the syllabic layer. Open the Lexicon tab and compare words in the stele against Yot spellings like NA-MO, DA-KE, and KO-ME.",
    };
  }

  return {
    title: "Use guard as your foothold",
    text: "Guard is identified. Now look nearby: click a repeated sign, or check possible Yot words in the Lexicon.",
  };
}

function renderLevel1GuidanceCard(
  puzzle: Puzzle,
  guidanceState: Level1GuidanceState,
  selectedSignId: string | null,
  correctCount: number,
  totalCorrectSigns: number,
  syllabicMap: Record<string, string>,
  logogramGuesses: Record<string, string>,
): string {
  const copy = getLevel1GuidanceCopy(
    puzzle,
    guidanceState,
    selectedSignId,
    correctCount,
    totalCorrectSigns,
    syllabicMap,
    logogramGuesses,
  );

  return `
    <aside class="level1-guidance-card" aria-label="Level 1 guidance">
      <h3>${copy.title}</h3>
      <p>${copy.text}</p>
    </aside>
  `;
}

function getVisibleTabs(
  puzzle: Puzzle,
  level0TutorialState: Level0TutorialState,
): Array<RightPaneTab> {
  if (puzzle.id === "level0" && !level0TutorialState.hasCompletedFirstSignGuide) {
    return ["hypothesis", "lexicon"];
  }

  return puzzle.hasSyllabicSigns
    ? ["instructions", "hypothesis", "syllables", "tools", "lexicon"]
    : ["instructions", "hypothesis", "lexicon"];
}

function getRenderableTab(
  state: AppState,
  puzzle: Puzzle,
  level0TutorialState: Level0TutorialState,
): RightPaneTab {
  const visibleTabs = getVisibleTabs(puzzle, level0TutorialState);
  return visibleTabs.includes(state.selectedTab) ? state.selectedTab : visibleTabs[0];
}

function renderTabButton(tabName: RightPaneTab, isActive: boolean): string {
  const label = tabName === "hypothesis" ? "Whole words" : tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const activeClass = isActive ? " is-active" : "";
  const ariaAttr = isActive ? ' aria-current="page"' : "";

  return `<button class="tab${activeClass}" type="button" data-tab="${tabName}"${ariaAttr}>${label}</button>`;
}

function getBannerText(
  puzzle: Puzzle,
  correctCount: number,
  totalCorrectSigns: number,
  level0TutorialState: Level0TutorialState,
  level1GuidanceState: Level1GuidanceState,
  selectedSignId: string | null,
): string {
  if (!puzzle.hasSyllabicSigns) {
    return getLevel0TutorialCopy(level0TutorialState, selectedSignId, correctCount, totalCorrectSigns).banner;
  }

  if (correctCount === totalCorrectSigns) {
    return "Stele deciphered.";
  }

  if (correctCount >= Math.max(totalCorrectSigns - 4, 1)) {
    return `You are close: ${correctCount} of ${totalCorrectSigns} correct`;
  }

  if (
    level1GuidanceState.activeStuckHintBestCorrectCount !== null
    && level1GuidanceState.activeStuckHintBestCorrectCount === level1GuidanceState.bestCorrectCount
  ) {
    return "Stuck? Compare one repeated multi-sign word with the Lexicon.";
  }

  if (correctCount === 1) {
    return "Guard identified. Use it as your foothold.";
  }

  if (correctCount < 6) {
    return "Keep separating whole word signs from syllable signs.";
  }

  return "Use confirmed signs to test repeated word shapes.";
}

function renderCorpusHeader(
  puzzle: Puzzle,
  correctCount: number,
  level0TutorialState: Level0TutorialState,
  level1GuidanceState: Level1GuidanceState,
  selectedSignId: string | null,
): string {
  const totalCorrectSigns = getTotalCorrectSigns(puzzle);
  const bannerText = getBannerText(
    puzzle,
    correctCount,
    totalCorrectSigns,
    level0TutorialState,
    level1GuidanceState,
    selectedSignId,
  );
  const tutorialHeaderClass = puzzle.hasSyllabicSigns ? "" : " pane-header-corpus-tutorial";
  const corpusTitle = puzzle.id === "level1" ? "Yot Stele" : "Tutorial Tablet";
  const bannerMarkup = puzzle.id === "level0" && !level0TutorialState.hasCompletedFirstSignGuide
    ? ""
    : `
      <div class="corpus-banner">
        ${bannerText}
      </div>
    `;
  const levelSwitcherMarkup = `
    <div class="level-switcher" aria-label="Level selection">
      <button class="level-switch-btn${puzzle.id === "level0" ? " is-active" : ""}" type="button" data-level-id="level0">Tutorial Tablet</button>
      <button class="level-switch-btn${puzzle.id === "level1" ? " is-active" : ""}" type="button" data-level-id="level1">Level 1 Stele</button>
    </div>
  `;

  return `
    <header class="pane-header pane-header-corpus${tutorialHeaderClass}">
      <div class="pane-header-copy">
        <h1 id="corpus-heading">${corpusTitle}</h1>
        <div class="pane-helper-text">
          <p>Click a sign to highlight matching signs across the inscriptions.</p>
          <p>Vertical lines mark word breaks.</p>
          ${levelSwitcherMarkup}
        </div>
      </div>
      ${bannerMarkup}
    </header>
  `;
}

export function renderApp(state: AppState): string {
  if (state.isShowingLevel1Transition) {
    return renderLevel1TransitionScreen();
  }

  const puzzle = getActivePuzzle(state);
  if (puzzle.id === "level0" && !state.hasStartedLevel0) {
    return renderLevel0OpeningScreen();
  }

  const progress = getActiveProgress(state);
  const level0TutorialState = getLevel0TutorialState(state);
  const level1GuidanceState = state.tutorialState.level1;
  const correctCount = getCorrectCount(state, puzzle);
  const totalCorrectSigns = getTotalCorrectSigns(puzzle);
  const solved = isSolved(state, puzzle);
  const selectedSignId = solved ? null : state.selectedSignId;
  const activeTab = getRenderableTab(state, puzzle, level0TutorialState);
  const emphasizeFirstGuideTarget = puzzle.id === "level0"
    && !solved
    && !level0TutorialState.hasCompletedFirstSignGuide
    && !level0TutorialState.hasSelectedFirstSignGuideTarget;
  const guidedWordTargets: GuidedWordTarget[] = [];
  if (puzzle.id === "level1" && isLevel1FirstSyllableBridgeActive(level1GuidanceState, progress.logogramGuesses)) {
    guidedWordTargets.push({
      inscriptionId: level1FirstSyllableTarget.inscriptionId,
      wordIndex: level1FirstSyllableTarget.wordIndex,
    });
  }
  if (puzzle.id === "level1" && level1GuidanceState.firstSyllableBridgeStep === "ne-payoff") {
    guidedWordTargets.push({ inscriptionId: "i05", wordIndex: 3 });
  }
  const tutorialPanelMarkup = puzzle.id === "level0"
    ? renderLevel0TutorialPanel(level0TutorialState, selectedSignId, correctCount, totalCorrectSigns)
    : renderLevel1GuidanceCard(
        puzzle,
        level1GuidanceState,
        selectedSignId,
        correctCount,
        totalCorrectSigns,
        progress.syllabicMap,
        progress.logogramGuesses,
      );
  const corpusMarkup = puzzle.corpus
    .map((inscription) =>
      renderInscription(
        puzzle,
        inscription,
        selectedSignId,
        progress.syllabicMap,
        progress.logogramGuesses,
        emphasizeFirstGuideTarget,
        guidedWordTargets,
      ),
    )
    .join("");

  const visibleTabs = getVisibleTabs(puzzle, level0TutorialState);
  const instructionsActive = activeTab === "instructions";
  const toolsActive = activeTab === "tools";
  const hypothesisActive = activeTab === "hypothesis";
  const syllablesActive = activeTab === "syllables";
  const lexiconActive = activeTab === "lexicon";
  const highlightedLexiconSyllable = puzzle.id === "level1"
    && level1GuidanceState.isShowingLexiconSyllableHighlight
    ? "NE"
    : null;

  return `
    <main class="app-shell${solved ? " is-solved" : ""}" aria-label="Decipherment alpha layout">
      <section class="pane pane-corpus${solved ? " is-solved" : ""}" aria-labelledby="corpus-heading">
        ${renderCorpusHeader(puzzle, correctCount, level0TutorialState, level1GuidanceState, selectedSignId)}

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

          <section class="panel${hypothesisActive ? " is-active" : ""}" aria-label="Whole words panel"${hypothesisActive ? ' role="tabpanel"' : ""}>
            ${renderHypothesisIntro(puzzle)}
            ${renderSelectedSignHeader(puzzle, selectedSignId, progress.syllabicMap, progress.logogramGuesses)}
            ${renderLogogramGuessSection(
              puzzle,
              selectedSignId,
              progress.logogramGuesses,
              puzzle.id === "level1" && progress.logogramGuesses.guard !== "guard" ? "guard" : null,
            )}
          </section>

          ${puzzle.hasSyllabicSigns ? `
            <section class="panel${syllablesActive ? " is-active" : ""}" aria-label="Syllables panel"${syllablesActive ? ' role="tabpanel"' : ""}>
              ${renderSelectedSignHeader(puzzle, selectedSignId, progress.syllabicMap, progress.logogramGuesses)}
              ${renderCVGrid(puzzle, selectedSignId, progress.syllabicMap)}
            </section>

            <section class="panel${toolsActive ? " is-active" : ""}" aria-label="Tools panel"${toolsActive ? ' role="tabpanel"' : ""}>
              ${renderSignInventory(puzzle, selectedSignId)}
              ${renderUnigramFrequency(puzzle, selectedSignId)}
              ${renderPositionalFrequency(puzzle, selectedSignId)}
            </section>
          ` : ""}

          <section class="panel${lexiconActive ? " is-active" : ""}" aria-label="Lexicon panel"${lexiconActive ? ' role="tabpanel"' : ""}>
            <h3>Lexicon</h3>
            <p class="section-helper-text">${getLexiconHelperText(puzzle)}</p>
            ${renderLexicon(puzzle, highlightedLexiconSyllable)}
          </section>
        </div>
      </section>
    </main>
  `;
}
