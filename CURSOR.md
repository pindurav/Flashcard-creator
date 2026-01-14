## Flashcard game – English–Czech learning helper (Cursor Instructions)

This document summarizes how the current flashcard generator works so Cursor (and future you) can safely modify it.

### Project location
- This `README` is stored under: `Flashcard creator/flashcard-generator-README.md` because of environment write restrictions.

### Stack and entry point
- **Stack**: Plain browser app using React 18 and ReactDOM from CDN, compiled with in-browser Babel.
- **Main file**: `index.html`.
- **React component**: `FlashcardApp` is declared inline inside a `<script type="text/babel">` tag.
- **Storage / sharing**: Encodes the source text into the URL hash so decks are shareable by link.

### Running the app
- From a terminal in Cursor:
  1. `cd "/Users/vladimir.pindura/Dev/poc/Flashcard creator"`
  2. `python3 -m http.server 4174`
  3. Open `http://localhost:4174` in a browser.
- You can also open `index.html` directly without a server, but some browsers may restrict clipboard APIs.

### Core behaviors (Flashcard game)

#### 1. Wizard layout & overall look
- The page background is a **soft multi-stop gradient**; the main content is a **white card** centered on the page, with rounded corners and drop shadow.
- At the top of the card is a **2-step wizard header** implemented via a small `Step` component:
  - **Step 1 – "Create Flashcard"**
  - **Step 2 – "Play & Share"**
- Each step shows a numbered circle and label; the **current step** is visually highlighted:
  - Larger, glowing number circle.
  - Bolder label color.
  - A connecting progress bar between steps that fills as you reach step 2.
- Steps are **clickable buttons**:
  - Clicking **step 1** calls a restart handler that:
    - Reopens the creator (`showCreator = true`).
    - Clears `flashcards`, index, flip state, and URL hash.
    - Resets `sourceInfo` to the initial helper text.
- The active step (`currentStep`) is derived from state:
  - `1` when the creator is open.
  - `2` when the creator is collapsed and there are flashcards.
- Under the main heading (“Flashcard game generator”) there is a **context sentence** that changes by step:
  - Step 1: “Create new flashcards from your spreadsheet or Excel file.”
  - Step 2: “Your game is ready! Click to share or start playing.”
- The layout is **mobile-friendly**:
  - The main card width, paddings, and font sizes shrink on small viewports.
  - The wizard header wraps nicely on narrow screens.

#### 2. Data model
- `spreadsheet: string` – full textarea contents.
- `flashcards: Array<{ front: string; back: string }>` – normalized cards.
- `currentIndex: number` – index in `flashcards`.
- `showAnswer: boolean` – whether we currently show the answer side.
- `isReversed: boolean` – whether the **back** is currently treated as the question (`true`) or the front (`false`).
- `sourceInfo: string` – status message under the heading.
- `showCreator: boolean` – whether the upload/paste panel is visible.
- `shrinkScale: number` – scale factor used to gradually shrink the card before auto-advancing.
- `randomMixEnabled: boolean` – controlled by a checkbox; when `true`, question/answer sides are randomized each card, otherwise they are fixed (front = question, back = answer).
- `isMobile: boolean` – simple flag derived from `window.innerWidth` to tweak layout for small screens.

#### 3. Parsing pasted text (`parseSpreadsheet`)
- For each non-empty line:
  1. Try to split on comma or tab, trim, and drop empties.
  2. If fewer than 2 parts, fall back to whitespace splitting:
     - Last token becomes **back** (answer).
     - All preceding tokens joined with spaces become **front** (question).
- Lines that produce both `front` and `back` produce a card.

#### 4. Parsing XLSX files (`parseXlsxToFlashcards`)
- Uses `xlsx.full.min.js` from CDN.
- Reads the **first sheet** only, with `sheet_to_json(sheet, { header: 1 })` (row arrays).
- For each row:
  - Collect all **non-empty cells**, trimming whitespace.
  - If `< 2` cells are non-empty, skip the row.
  - When there are **≥ 3 cells**:
    - `front = cells[0] + "  " + cells[1]` (word + IPA, double-space in between).
    - `back = last cell` (Czech translation or overall answer).
  - When there are **exactly 2 cells**:
    - `front = cells[0]`.
    - `back = cells[1]`.
- The file-upload handler:
  - Converts parsed cards back into text: `front + "\t" + back` per line.
  - Updates `spreadsheet`, `flashcards`, and navigation state.
  - Randomizes `isReversed`, resets `showAnswer` to `false`, sets `currentIndex` to `0`.
  - Updates the URL hash (`#data=...`) with the new text.
  - Collapses the creator (`showCreator = false`) and updates `sourceInfo` with how many cards were loaded.

#### 5. URL-based sharing
- Helper `updateUrlFromSpreadsheet(text)`:
  - Uses **LZString compression** (from CDN) to compress the `spreadsheet` string.
  - Stores the compressed data in `window.location.hash` as `#lz=...` (much shorter than raw encoding).
  - Falls back to `#data=...` format if compression is unavailable.
  - Clears the hash when the input is emptied.
- On first render, a `useEffect` hook:
  - Reads `window.location.hash`.
  - If it matches `#lz=...`, decompresses using `LZString.decompressFromEncodedURIComponent`.
  - If it matches `#data=...`, uses `decodeURIComponent` (backward compatibility).
  - Immediately parses the decoded text into `flashcards`, randomizes `isReversed`, resets index/flip state, and updates `sourceInfo` to indicate the deck came from URL.
  - Automatically opens the Play & Share tab when loading from a shared URL.

#### 6. Generate / clear controls and randomization toggle
- In the creator panel, below the textarea:
  - A **“Randomly mix question/answers”** checkbox (checked by default):
    - Binds to `randomMixEnabled`.
    - When enabled, new cards and navigation will randomly flip which side is the question.
    - When disabled, the **front** side is always shown as the question.
  - A **horizontal button group**:
    - **Clear inputs** (gray):
      - Sets `spreadsheet` to empty, clears `flashcards`, index, flip state and `isReversed`.
      - Resets `sourceInfo` to an “inputs cleared” message.
      - Clears the URL hash as well.
    - **Generate flashcards** (blue, CTA):
      - Calls `handleGenerate()`.
      - If the textarea is empty, automatically uses a **sample placeholder deck** (`apple, jablko` / `car, auto`) and writes it into `spreadsheet`.
      - Uses `parseSpreadsheet()` to build the `flashcards` array and shuffles them.
      - Resets index and flip state; sets `isReversed` based on `randomMixEnabled`.
      - Updates the URL hash from the chosen source text.
      - Collapses the creator to show the Play & Share state on success.

#### 7. Play & share panel and card view
- When `showCreator === false` and `flashcards.length > 0`:
  - A rounded **top panel** contains:
    - A heading on the left: “Your flashcards game”.
    - A **share** button on the right – calls `handleShare()` which:
      - Ensures URL hash is up to date (using compressed `#lz=...` format for shorter URLs).
      - Attempts to copy `window.location.href` to clipboard.
      - Always shows the message: **"The URL copied!"** in `sourceInfo`.
      - When you open the shared link, automatically opens it on the Play & Share tab.
  - Below that is the **active card** and controls:
    - Cards are **shuffled into a random order** when they are created (from pasted text, XLSX upload, or shared URL), so each game run feels a bit different.
    - The card surface is a playful, rounded rectangle with:
      - A light gradient background, pink accent border, drop shadow, and subtle 3D-style rotation that changes on hover.
      - A small **“Question” / “Answer”** pill in the top-right corner that reflects the current side.
    - Card content shows either **question** or **answer** depending on `showAnswer` and `isReversed`.
    - When the answer is shown:
      - It stays visible for ~10 seconds.
      - After ~2 seconds it **gradually shrinks** (using `shrinkScale`) down to about 70% size and slightly fades, signaling that the card will disappear.
      - At the end of the 10 seconds the game automatically:
        - Advances to the next card,
        - Hides the answer again,
        - Picks a new `isReversed` value according to `randomMixEnabled`.
    - Sequences of repeated letters (e.g., `ll`, `tt`) are wrapped in a `<span>` with a light yellow background via `highlightDoubleLetters()`.
    - Controls: **Prev**, **Next**, **Show Question / Show Answer**.
    - Clicking **Next** or **Prev** immediately displays the new card (no delay):
      - Resets `shrinkScale` to 1.0,
      - Hides the answer (`showAnswer = false`),
      - Changes to the new card index,
      - Randomizes `isReversed` (subject to `randomMixEnabled`).

### Things to be careful about in future edits
- `index.html` mixes **layout**, **logic**, and **state** in one file; large structural refactors should first split the script into a separate `.js` file.
- Changing the shape of `flashcards` or how `front`/`back` are constructed requires syncing:
  - Text parsing, XLSX parsing,
  - URL sharing logic,
  - Card rendering and random direction logic.
- If you update CDN URLs (React / ReactDOM / xlsx / Babel), make sure versions are compatible and still expose the same globals (`React`, `ReactDOM`, `XLSX`, `Babel`).
