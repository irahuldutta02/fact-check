"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FaEraser, FaLightbulb, FaLink, FaSpinner } from "react-icons/fa";
import CopyToClipboard from "./components/CopyToClipboard";
import LoadingSkeleton from "./components/LoadingSkeleton";
import ResultFeedback from "./components/ResultFeedback";
import ScrapedDataInfo from "./components/ScrapedDataInfo";
import VerdictBadge from "./components/VerdictBadge";

const MAX_CHAR_COUNT = 500;
const EXAMPLE_STATEMENTS = [
  "The Great Wall of China is visible from space with the naked eye.",
  "Drinking eight glasses of water a day is essential for health.",
  "Albert Einstein failed math as a student.",
  "Humans only use 10% of their brains.",
  "Bulls are angered by the color red.",
];

export default function Home() {
  const [statement, setStatement] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackData, setFeedbackData] = useState({});
  const textareaRef = useRef(null);

  const verifyFact = async () => {
    if (!statement.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/verify-fact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statement }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to verify fact"
        );
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error verifying fact:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const clearStatement = () => {
    setStatement("");
    textareaRef.current?.focus();
  };

  const useExampleStatement = () => {
    // Use a more deterministic approach for selecting examples
    const index =
      (EXAMPLE_STATEMENTS.length +
        (statement.length % EXAMPLE_STATEMENTS.length)) %
      EXAMPLE_STATEMENTS.length;
    setStatement(EXAMPLE_STATEMENTS[index]);
    textareaRef.current?.focus();
  };

  const handleFeedback = (feedback) => {
    if (result) {
      // Store feedback for this result
      const resultId = `${statement}-${result.verdict}`;
      setFeedbackData((prev) => ({
        ...prev,
        [resultId]: feedback,
      }));

      // You could send this to an API endpoint to track user feedback
      console.log("User feedback:", {
        statement,
        verdict: result.verdict,
        feedback,
      });
    }
  };

  const charCount = statement.length;
  const isOverLimit = charCount > MAX_CHAR_COUNT;

  // Helper function for verdict color dots (keeping this function for potential future use)
  const getVerdictColor = (verdict) => {
    switch (verdict?.toUpperCase()) {
      case "TRUE":
        return "bg-verdict-true";
      case "FALSE":
        return "bg-verdict-false";
      case "PARTIALLY TRUE":
        return "bg-verdict-partial";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <main className="min-h-screen bg-primary-gray">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-64 h-24 mb-4">
            <Image
              src="/logo.png"
              alt="Fact Check AI"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>{" "}
          <h1 className="text-3xl font-bold text-primary-navy text-center">
            Fact Checker
          </h1>{" "}
          <p className="text-lg text-gray-600 text-center mt-2">
            Verify facts with the power of Google Gemini AI and real-time web
            data
          </p>
          <ScrapedDataInfo />
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="statement"
              className="block text-primary-navy font-medium"
            >
              Enter a statement to verify:
            </label>{" "}
            <div className="flex space-x-2">
              <button
                onClick={useExampleStatement}
                className="text-sm text-primary-blue hover:underline flex items-center"
              >
                <FaLightbulb className="mr-1" size={14} /> Try an example
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              id="statement"
              ref={textareaRef}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g., 'The Great Wall of China is visible from space'"
              className={`w-full p-3 pr-10 border ${
                isOverLimit ? "border-red-500" : "border-gray-300"
              } rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue resize-none min-h-[120px] bg-white text-primary-navy`}
              maxLength={MAX_CHAR_COUNT + 50} // Allow a bit over to show error but prevent huge inputs
            />
            <div className="absolute top-3 right-3">
              <button
                onClick={clearStatement}
                className="p-2 text-gray-500 hover:text-primary-navy focus:outline-none"
                title="Clear text"
                disabled={!statement}
              >
                <FaEraser />
              </button>
            </div>
            <div
              className={`text-xs mt-1 text-right ${
                isOverLimit ? "text-red-500 font-bold" : "text-gray-500"
              }`}
            >
              {charCount}/{MAX_CHAR_COUNT} characters
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={verifyFact}
              disabled={loading || !statement.trim() || isOverLimit}
              className={`px-6 py-3 rounded-md font-medium flex items-center justify-center ${
                loading || !statement.trim() || isOverLimit
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-navy text-white hover:bg-opacity-90"
              }`}
            >
              {" "}
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Scraping web data & verifying...
                </>
              ) : (
                "Verify with AI"
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Results Section - Loading State */}
        {loading && <LoadingSkeleton />}

        {/* Results Section - Data */}
        {result && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
            <div className="mb-6">
              <VerdictBadge verdict={result.verdict} />
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-primary-navy mb-3">
                Analysis
              </h2>
              <div className="text-gray-700 space-y-2">
                <p>{result.explanation}</p>
              </div>
            </div>
            {result.sources && result.sources.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-primary-navy mb-3">
                  Sources
                </h2>
                <ul className="space-y-2">
                  {result.sources.map((source, index) => (
                    <li key={index} className="flex items-start">
                      <FaLink className="text-primary-blue mt-1 mr-2 flex-shrink-0" />
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-blue hover:underline break-words"
                      >
                        {source.name || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}{" "}
            {/* Action bar - Copy, Feedback */}
            <div className="border-t pt-4 mt-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                {" "}
                <div className="flex space-x-2">
                  {" "}
                  <CopyToClipboard
                    text={`${statement}\n\nVerdict: ${result.verdict}\n\n${
                      result.explanation
                    }${
                      result.sources && result.sources.length > 0
                        ? "\n\nSources:\n" +
                          result.sources
                            .map(
                              (source, index) =>
                                `${index + 1}. ${source.name || "Source"}: ${
                                  source.url
                                }`
                            )
                            .join("\n")
                        : ""
                    }`}
                    label="Copy result"
                  />
                  {result.usedWebScraping !== undefined && (
                    <div className="text-xs text-gray-500 ml-2 flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-1 ${
                          result.usedWebScraping
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      ></div>
                      {result.usedWebScraping
                        ? "Fact checked with real-time web data"
                        : "Using trained knowledge (web scraping unavailable)"}
                    </div>
                  )}
                </div>
                <ResultFeedback onFeedback={handleFeedback} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
