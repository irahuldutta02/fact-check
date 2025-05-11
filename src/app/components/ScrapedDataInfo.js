"use client";

import { useState } from "react";
import { FaInfoCircle } from "react-icons/fa";

export default function ScrapedDataInfo() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="text-center mt-2">
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="text-sm text-gray-500 hover:text-primary-blue flex items-center mx-auto"
      >
        <FaInfoCircle className="mr-1" size={14} />
        Powered by real-time web data
      </button>

      {showInfo && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded-md max-w-lg mx-auto">
          <p>
            This fact checker uses web scraping to gather real-time information
            from the internet, which is then analyzed by Google Gemini AI to
            provide accurate fact-checking results. Unlike traditional AI models
            that rely solely on training data, this approach uses current web
            content to verify facts.
          </p>
          <p className="mt-2">
            <strong>How it works:</strong>
          </p>
          <ol className="list-decimal list-inside mt-1">
            <li>
              Your statement is used to search the web for relevant information
            </li>
            <li>
              Multiple web pages are scraped in real-time to gather current data
            </li>
            <li>All this data is provided to Google Gemini AI for analysis</li>
            <li>
              The AI delivers a fact-check verdict based on current information
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
