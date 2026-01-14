import React, { useState } from "react";

// Simple flashcard generator webapp
function FlashcardApp() {
  const [spreadsheet, setSpreadsheet] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Parse spreadsheet text (CSV: English, Czech per line)
  function parseSpreadsheet(text) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.map((line) => {
      // Allow both CSV and tab separated
      const parts = line.split(/,|\t/);
      return {
        front: parts[0]?.trim() || "",
        back: parts[1]?.trim() || "",
      };
    }).filter(card => card.front && card.back);
  }

  function handleGenerate() {
    const cards = parseSpreadsheet(spreadsheet);
    setFlashcards(cards);
    setCurrentIndex(0);
    setShowAnswer(false);
  }

  function handleNext() {
    if (flashcards.length > 0) {
      setCurrentIndex((idx) => (idx + 1) % flashcards.length);
      setShowAnswer(false);
    }
  }

  function handlePrev() {
    if (flashcards.length > 0) {
      setCurrentIndex((idx) => (idx - 1 + flashcards.length) % flashcards.length);
      setShowAnswer(false);
    }
  }

  function handleFlip() {
    setShowAnswer((s) => !s);
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>Flashcard Generator (English - Czech)</h2>
      <p>
        Paste or type your spreadsheet here using CSV or tab: <br />
        <small>Format: <code>hello, ahoj</code> (one pair per line)</small>
      </p>
      <textarea
        rows={8}
        cols={40}
        value={spreadsheet}
        onChange={(e) => setSpreadsheet(e.target.value)}
        placeholder="apple, jablko&#10;car, auto"
        style={{ width: "100%", fontFamily: "monospace", fontSize: "1rem" }}
      ></textarea>
      <div style={{ margin: "1rem 0" }}>
        <button onClick={handleGenerate}>Generate Flashcards</button>
      </div>

      {flashcards.length > 0 && (
        <div>
          <div style={{
            border: "2px solid #333",
            minHeight: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            background: "#f9f9f9",
            cursor: "pointer",
            marginBottom: 16
          }} onClick={handleFlip}
          title="Click to flip">
            {showAnswer ? flashcards[currentIndex].back : flashcards[currentIndex].front}
          </div>
          <div>
            <button onClick={handlePrev}>&larr; Prev</button>
            <span style={{ margin: "0 1rem" }}>
              Card {currentIndex + 1} / {flashcards.length}
            </span>
            <button onClick={handleNext}>Next &rarr;</button>
          </div>
          <p>
            <button onClick={handleFlip}>
              {showAnswer ? "Show Question" : "Show Answer"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default FlashcardApp;
