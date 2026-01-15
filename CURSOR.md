## Flashcard game – English–Czech learning helper (Cursor Instructions)

This document summarizes how the current flashcard generator works so Cursor (and future you) can safely modify it.

### Project location
- This `README` is stored under: `Flashcard creator/flashcard-generator-README.md` because of environment write restrictions.

### Stack and entry point
- **Stack**: Plain browser app using React 18 and ReactDOM from CDN, compiled with in-browser Babel.
- **Main file**: `index.html`.
- **React component**: `FlashcardApp` is declared inline inside a `<script type="text/babel">` tag.
- **Storage / sharing**: Encodes the source text into the URL hash so decks are shareable by link. Also stores card order mode and mix settings in the URL.
- **Auto-translate prevention**: The HTML element and card content have `translate="no"` to prevent browser auto-translation.

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
- `randomMixCards: boolean` – controlled by a checkbox (default: `true`); when `true`, the card order is shuffled randomly.
- `cardOrderMode: string` – controls which side shows first: `"questionFirst"` (default), `"answerFirst"`, or `"randomizes"` (randomly picks which side shows first for each card).
- `isMobile: boolean` – simple flag derived from `window.innerWidth` to tweak layout for small screens.
- `touchStart: { x: number, y: number } | null` – tracks the starting position of touch gestures for swipe detection.
- `deviceOrientation: { beta: number, gamma: number }` – tracks device tilt angles for dynamic 3D shadow effects (beta: front-to-back, gamma: left-to-right).

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
  - Shuffles cards if `randomMixCards` is enabled.
  - Sets initial display based on `cardOrderMode` (respects the mode's rules for which side shows first).
  - Updates the URL hash (including order and mixCards settings) with the new text.
  - Collapses the creator (`showCreator = false`) and updates `sourceInfo` with how many cards were loaded.

#### 5. URL-based sharing
- Helper `updateUrlFromSpreadsheet(text)`:
  - Uses **LZString compression** (from CDN) to compress the `spreadsheet` string.
  - Stores the compressed data in `window.location.hash` as `#lz=...` (much shorter than raw encoding).
  - Falls back to `#data=...` format if compression is unavailable.
  - Adds `&order=<mode>` to the URL if `cardOrderMode` is not the default (`"questionFirst"`).
  - Adds `&mixCards=0` to the URL if `randomMixCards` is `false` (default is `true`, so only stored when disabled).
  - Clears the hash when the input is emptied.
- On first render, a `useEffect` hook:
  - Reads `window.location.hash`.
  - If it matches `#lz=...`, decompresses using `LZString.decompressFromEncodedURIComponent`.
  - If it matches `#data=...`, uses `decodeURIComponent` (backward compatibility).
  - Extracts `order` parameter to set `cardOrderMode` (supports legacy `"keep"` and `"randomize"` for backward compatibility).
  - Extracts `mixCards` parameter to set `randomMixCards` (defaults to `true` if not specified).
  - Immediately parses the decoded text into `flashcards`, shuffles if `randomMixCards` is enabled, sets initial display based on `cardOrderMode`, and updates `sourceInfo` to indicate the deck came from URL.
  - Automatically opens the Play & Share tab when loading from a shared URL.

#### 6. Generate / clear controls and card ordering
- In the creator panel, below the textarea:
  - A **"Randomly mix cards"** checkbox (checked by default):
    - Binds to `randomMixCards`.
    - When enabled, the card order is shuffled randomly when generating or loading flashcards.
    - When disabled, cards maintain their original order.
  - A **"Card order"** dropdown with three options:
    - **"Question first"** (default): Always shows the question (front) side first for each card.
    - **"Answer first"**: Always shows the answer (back) side first for each card.
    - **"Randomizes"**: Randomly picks which side (question or answer) shows first for each card.
  - A **horizontal button group**:
    - **Clear inputs** (gray):
      - Sets `spreadsheet` to empty, clears `flashcards`, index, flip state and `isReversed`.
      - Resets `sourceInfo` to an "inputs cleared" message.
      - Clears the URL hash as well.
    - **Generate flashcards** (blue, CTA):
      - Calls `handleGenerate()`.
      - If the textarea is empty, automatically uses a **sample placeholder deck** (`apple, jablko` / `car, auto`) and writes it into `spreadsheet`.
      - Uses `parseSpreadsheet()` to build the `flashcards` array.
      - Shuffles the cards if `randomMixCards` is enabled.
      - Sets initial display based on `cardOrderMode`:
        - `"questionFirst"`: Shows question (front) side, `isReversed = false`.
        - `"answerFirst"`: Shows answer (back) side, `isReversed = false`.
        - `"randomizes"`: Randomly picks which side, sets `isReversed` accordingly.
      - Updates the URL hash from the chosen source text (including order and mixCards settings).
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
    - Cards are **shuffled into a random order** when they are created if `randomMixCards` is enabled (from pasted text, XLSX upload, or shared URL).
    - The card surface uses **Apple Liquid Glass design** (glassmorphism):
      - **Frosted glass effect**: `backdrop-filter: blur(20px) saturate(180%)` creates a translucent, blurred background.
      - **Semi-transparent gradients**: White gradient backgrounds with varying opacity (35% for question, 25% for answer).
      - **Subtle borders**: Thin white border with 40% opacity (`rgba(255, 255, 255, 0.4)`).
      - **Light reflection overlay**: A gradient overlay on the top half simulates light reflection.
      - **Dynamic 3D shadow**: Shadow direction and intensity adjust based on device orientation:
        - Uses Device Orientation API to track phone tilt (`beta` for front-to-back, `gamma` for left-to-right).
        - Shadow offset calculated from tilt angles: `shadowX = gamma * 0.3`, `shadowY = beta * 0.2`.
        - Shadow blur increases with tilt magnitude for depth effect.
        - Smoothly transitions as the phone moves (0.3s ease transition).
        - Falls back to static shadow if orientation API is unavailable or permission denied.
      - **Layered shadows**: Multiple shadow layers including dynamic shadow, inset border highlight, and ambient glow.
      - **Rounded corners**: 28px border radius for modern, soft appearance.
      - A small **"Question" / "Answer"** pill in the top-right corner with glassmorphic styling (backdrop blur, gradient background, inset border).
      - Card content has `translate="no"` attribute to prevent browser auto-translation.
      - **Swipe gestures for mobile**: 
        - Swipe **left** → Next card (calls `handleNext()`).
        - Swipe **right** → Previous card (calls `handlePrev()`).
        - Minimum swipe distance: 50px to trigger navigation.
        - Allows up to 100px vertical movement to still count as horizontal swipe.
        - Prevents default scrolling only when clearly a horizontal swipe gesture.
    - Card content shows either **question** or **answer** depending on `showAnswer` and `isReversed`.
    - The initial side shown for each card is determined by `cardOrderMode`:
      - `"questionFirst"`: Always shows question (front) side first.
      - `"answerFirst"`: Always shows answer (back) side first.
      - `"randomizes"`: Randomly picks which side shows first for each card.
    - When the answer is shown:
      - It stays visible for ~10 seconds.
      - After ~2 seconds it **gradually shrinks** (using `shrinkScale`) down to about 70% size and slightly fades, signaling that the card will disappear.
      - At the end of the 10 seconds the game automatically:
        - Advances to the next card,
        - Sets the initial display based on `cardOrderMode` (respecting the mode's rules for which side shows first).
    - Sequences of repeated letters (e.g., `ll`, `tt`) are wrapped in a `<span>` with a light yellow background via `highlightDoubleLetters()`.
    - Controls: **Prev**, **Next**, **Show Question / Show Answer**.
    - **Navigation methods**:
      - **Clicking** **Next** or **Prev** buttons immediately displays the new card (no delay).
      - **Swipe gestures** on mobile: swipe left for next, swipe right for previous (same behavior as button clicks).
    - When navigating (via button or swipe):
      - Resets `shrinkScale` to 1.0,
      - Changes to the new card index,
      - Sets initial display based on `cardOrderMode`:
        - `"questionFirst"`: Shows question side, `isReversed = false`.
        - `"answerFirst"`: Shows answer side, `isReversed = false`.
        - `"randomizes"`: Randomly picks which side, sets `isReversed` accordingly.

#### 8. Device orientation and touch gestures
- **Device orientation tracking**:
  - A `useEffect` hook listens to `deviceorientation` events.
  - On iOS 13+, requests permission via `DeviceOrientationEvent.requestPermission()`.
  - Tracks `beta` (front-to-back tilt) and `gamma` (left-to-right tilt) angles.
  - Updates `deviceOrientation` state which drives the dynamic shadow calculation.
  - Falls back gracefully if the API is unavailable or permission is denied.
- **Touch gesture handlers**:
  - `handleTouchStart`: Records initial touch position in `touchStart` state.
  - `handleTouchMove`: Prevents default scrolling when a horizontal swipe is detected.
  - `handleTouchEnd`: Calculates swipe direction and distance, calls `handleNext()` or `handlePrev()` accordingly.
  - Minimum swipe distance: 50px horizontal movement.
  - Maximum vertical tolerance: 100px (swipes with more vertical movement are ignored).

### Things to be careful about in future edits
- `index.html` mixes **layout**, **logic**, and **state** in one file; large structural refactors should first split the script into a separate `.js` file.
- Changing the shape of `flashcards` or how `front`/`back` are constructed requires syncing:
  - Text parsing, XLSX parsing,
  - URL sharing logic,
  - Card rendering and random direction logic.
- The **dynamic shadow calculation** depends on `deviceOrientation` state; ensure it updates reactively when orientation changes.
- **Swipe gesture detection** uses touch events; be careful when modifying touch handlers to maintain swipe functionality.
- **Device Orientation API** requires user permission on iOS 13+; the code handles permission requests gracefully.
- If you update CDN URLs (React / ReactDOM / xlsx / Babel / LZString), make sure versions are compatible and still expose the same globals (`React`, `ReactDOM`, `XLSX`, `Babel`, `LZString`).
