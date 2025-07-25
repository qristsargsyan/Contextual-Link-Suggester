/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";

interface Suggestion {
  anchorText: string;
  link: string;
  context: string;
}

function App() {
  const [pageContent, setPageContent] = useState("");
  const [availableLinks, setAvailableLinks] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSuggestions = async () => {
    if (!pageContent.trim() || !availableLinks.trim()) {
      setError("Please fill in both the page content and available links.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = `
        You are an SEO expert specializing in contextual internal linking.
        Analyze the following webpage content and the list of available internal links.
        Your task is to identify the best opportunities to add internal links to the content.

        - The anchor text must be an exact phrase from the content.
        - The link must be from the provided list of available links.
        - Choose placements that are natural and provide value to the reader.
        - For each suggestion, provide the exact anchor text, the corresponding link, and the surrounding sentence or short paragraph for context.

        Webpage Content:
        ---
        ${pageContent}
        ---

        Available Links (one per line):
        ---
        ${availableLinks}
        ---
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                description: "A list of link insertion suggestions.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    anchorText: {
                      type: Type.STRING,
                      description: "The exact phrase from the content to be used as anchor text.",
                    },
                    link: {
                      type: Type.STRING,
                      description: "The internal link to be placed from the available list.",
                    },
                    context: {
                      type: Type.STRING,
                      description: "The sentence or paragraph where the anchor text is found.",
                    },
                  },
                  required: ["anchorText", "link", "context"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      });

      const result = JSON.parse(response.text);
      setSuggestions(result.suggestions || []);
      if (!result.suggestions || result.suggestions.length === 0) {
        setError("No link suggestions could be generated. Try refining your content or link list.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred while generating suggestions. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSuggestionContext = (context: string, anchorText: string) => {
    if (!context || !anchorText) return context;
    const parts = context.split(new RegExp(`(${anchorText})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === anchorText.toLowerCase() ? (
            <strong key={index}>{part}</strong>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  return (
    <div className="app-container">
      <header>
        <h1>Contextual Link Suggester</h1>
        <p>Paste your content and links to get AI-powered contextual link suggestions.</p>
      </header>

      <main>
        <div className="input-section">
          <div className="input-group">
            <label htmlFor="page-content">Page Content</label>
            <textarea
              id="page-content"
              value={pageContent}
              onChange={(e) => setPageContent(e.target.value)}
              placeholder="Paste the full text content of your webpage here..."
              disabled={isLoading}
              aria-label="Page Content"
            />
          </div>
          <div className="input-group">
            <label htmlFor="available-links">Available Links</label>
            <textarea
              id="available-links"
              value={availableLinks}
              onChange={(e) => setAvailableLinks(e.target.value)}
              placeholder="https://example.com/page-one&#10;https://example.com/page-two"
              disabled={isLoading}
              aria-label="Available Links"
            />
          </div>
        </div>

        <button
          className="submit-button"
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Analyzing..." : "Generate Suggestions"}
        </button>

        <section className="results-section" aria-live="polite">
          {isLoading && (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <p>Gemini is analyzing your content...</p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {!isLoading && suggestions.length > 0 &&
            suggestions.map((suggestion, index) => (
              <article key={index} className="suggestion-card">
                <p>
                  {renderSuggestionContext(suggestion.context, suggestion.anchorText)}
                </p>
                <div className="link-display">
                  <span>Link to:</span>
                  <a href={suggestion.link} target="_blank" rel="noopener noreferrer">
                    {suggestion.link}
                  </a>
                </div>
              </article>
            ))}
        </section>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
