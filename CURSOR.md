## Flashcard Generator (English–Czech) – Cursor Instructions

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

### Core behaviors

#### 1. Wizard layout & overall look
- The page background is a **soft multi-stop gradient**; the main content is a **white card** centered on the page, with rounded corners and drop shadow.
- At the top of the card is a **3-step wizard header** implemented via a small `Step` component:
  - **Step 1 – "Upload / paste"**
  - **Step 2 – "Review & generate"**
  - **Step 3 – "Play & share"**
- Each step shows a numbered circle and label; active/done states change color.
- Steps are **clickable buttons**:
  - Clicking **step 1** calls a restart handler that:
    - Reopens the creator (`showCreator = true`).
    - Clears `flashcards`, index, flip state, and URL hash.
    - Resets `sourceInfo` to the initial helper text.
  - Clicking **step 2** reopens the creator for editing but **keeps existing text and cards**.
  - Clicking **step 3** switches to play/share view if there are any flashcards.
- The active step (`currentStep`) is derived from state:
  - `1` when creator is open and there is no source.
  - `2` when creator is open but there is some source text.
  - `3` when creator is collapsed and there are flashcards.

#### 2. Data model
- `spreadsheet: string` – full textarea contents.
- `flashcards: Array<{ front: string; back: string }>` – normalized cards.
- `currentIndex: number` – index in `flashcards`.
- `showAnswer: boolean` – whether we currently show the answer side.
- `isReversed: boolean` – random toggle that decides which side is question vs answer for the current card.
- `sourceInfo: string` – status message under the heading.
- `showCreator: boolean` – whether the upload/paste panel is visible.

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
  - Encodes the full `spreadsheet` string using `encodeURIComponent` and stores it in `window.location.hash` as `#data=...`.
  - Clears the hash when the input is emptied.
- On first render, a `useEffect` hook:
  - Reads `window.location.hash`.
  - If it matches `#data=...`, decodes the payload and uses it to seed `spreadsheet`.
  - Immediately parses it into `flashcards`, randomizes `isReversed`, resets index/flip state, and updates `sourceInfo` to indicate the deck came from URL.

#### 6. Generate / clear buttons
- Under the textarea in the creator panel there is a **horizontal button group**:
  - **Clear inputs** (gray):
    - Sets `spreadsheet` to empty, clears `flashcards`, index, flip state and `isReversed`.
    - Resets `sourceInfo` to a “inputs cleared” message.
    - Clears the URL hash as well.
  - **Generate flashcards** (blue, CTA):
    - Calls `handleGenerate()`.
    - Uses `parseSpreadsheet()` to build the `flashcards` array.
    - Resets index and flip state, randomizes `isReversed`.
    - Updates URL hash from `spreadsheet`.
    - Collapses the creator to show play/share state on success.

#### 7. Play & share panel and card view
- When `showCreator === false` and `flashcards.length > 0`:
  - A rounded **top panel** contains:
    - `+ Create new flashcards` button – simply sets `showCreator = true` (keeps data).
    - Center text: “Your flashcards game!”.
    - **share** button – calls `handleShare()` which:
      - Ensures URL hash is up to date.
      - Attempts to copy `window.location.href` to clipboard.
      - Falls back to messaging that the address bar has the link.
      - When you open the shared link, automatically open it on play tab
  - Below that is the **active card** and controls:
    - Cards are **shuffled into a random order** when they are created (from pasted text, XLSX upload, or shared URL), so each game run feels a bit different.
    - The card surface is a playful, rounded rectangle with:
      - A light gradient background, pink accent border, drop shadow, and subtle 3D-style rotation that changes on hover.
      - A small **“Question” / “Answer”** pill in the top-right corner that reflects the current side.
    - Card content shows either **question** or **answer** depending on `showAnswer` and `isReversed`.
    - Sequences of repeated letters (e.g., `ll`, `tt`) are wrapped in a `<span>` with a light yellow background via `highlightDoubleLetters()`.
    - Controls: **Prev**, **Next**, **Show Question / Show Answer**.
    - Moving between cards re-randomizes `isReversed` and always hides the answer first.

### Things to be careful about in future edits
- `index.html` mixes **layout**, **logic**, and **state** in one file; large structural refactors should first split the script into a separate `.js` file.
- Changing the shape of `flashcards` or how `front`/`back` are constructed requires syncing:
  - Text parsing, XLSX parsing,
  - URL sharing logic,
  - Card rendering and random direction logic.
- If you update CDN URLs (React / ReactDOM / xlsx / Babel), make sure versions are compatible and still expose the same globals (`React`, `ReactDOM`, `XLSX`, `Babel`).
