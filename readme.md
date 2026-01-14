# Flashcard Generator

A tiny web app for quickly turning a simple spreadsheet (or Excel file) into interactive flashcards, optimized for English–Czech vocabulary practice.

You paste or upload your data, review the pairs, and then flip through the generated flashcards in your browser.

---

## Purpose

- **Create vocabulary flashcards fast**: Copy from Excel, Google Sheets, or any text table and instantly get flashcards.
- **Support multiple formats**:
  - Text input with **CSV** or **tab-separated** values.
  - Upload an **Excel `.xlsx` file**.
- **Flexible card front/back**:
  - Works well for `word + IPA → translation` style data.
  - Automatically combines multiple columns into a single “front” where appropriate.
- **Shareable**:
  - The app can encode your data in the URL, so you can share a link with the same deck.

---

## Input Format

### Text / CSV / Tab input

Each line should contain one flashcard pair:

- **Comma-separated**:  
  `hello, ahoj`
- **Tab-separated**:  
  `apple<TAB>jablko`

You can paste many lines at once, e.g.:

hello, ahoj
car, auto
apple, jablkoThe app will parse each line into:

- **Front**: English word (and optionally IPA)
- **Back**: Czech translation

### Excel `.xlsx` input

When you upload an `.xlsx` file, the app:

- Reads the **first sheet**.
- Looks at each row and collects **non-empty cells**.
- If there are **3+ cells**:
  - Treats `cell[0]` and `cell[1]` as front (e.g. `word + IPA`)
  - Uses the **last cell** as the translation (back).
- If there are **exactly 2 cells**:
  - First cell = front (question)
  - Second cell = back (answer)

So a recommended Excel layout is:

| Word | IPA       | Translation |
| ---- | --------- | ----------- |
| apple | ˈæp.əl   | jablko      |
| car   | kɑːr     | auto        |

---

## How to Run

The app is a single HTML file that uses React from a CDN (no build step needed).

### Option 1 – Simple local HTTP server (recommended)

1. Open a terminal and go to the project folder:

  
   cd "/Users/vladimir.pindura/Dev/poc/Flashcard creator"
   2. Start a simple HTTP server (Python 3):

  
   python3 -m http.server 8000
   3. Open this URL in your browser:

  
   http://localhost:8000/index.html
   You should now see the Flashcard Generator UI.

### Option 2 – Open the file directly

On macOS:

open "/Users/vladimir.pindura/Dev/poc/Flashcard creator/index.html"Or use Finder to double-click `index.html` in the project folder.

---

## Basic Usage

1. **Load your data**
   - Either **upload an `.xlsx` file**, or
   - Paste your **CSV/tab-separated** text into the big textarea.
2. **Generate cards**
   - Click **“Generate Flashcards”** (or the equivalent button in the UI).
3. **Practice**
   - Click the card to flip between **question** and **answer**.
   - Use **Next/Prev** buttons to move through your deck.
4. **Share (optional)**
   - Use the **Share** button (if available in your version) to copy a link that encodes your deck in the URL.

---

## Notes

- Best suited for **language learning**, especially **English–Czech**.
- All data is handled locally in your browser; nothing is sent to a server.
- You can customize or extend the UI by editing `index.html`.