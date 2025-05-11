"use client";

import { useState } from "react";
import { FaFrown, FaSmile, FaThumbsDown, FaThumbsUp } from "react-icons/fa";

export default function ResultFeedback({ onFeedback }) {
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (value) => {
    setFeedback(value);

    if (onFeedback) {
      onFeedback(value);
    }

    setSubmitted(true);

    // Reset after 5 seconds so user can submit again if desired
    setTimeout(() => {
      setSubmitted(false);
    }, 5000);
  };

  if (submitted) {
    return (
      <div className="flex items-center text-sm text-gray-600">
        <span className="flex items-center">
          {feedback === "helpful" ? (
            <>
              <FaSmile className="text-verdict-true mr-2" />
              Thanks for your feedback!
            </>
          ) : (
            <>
              <FaFrown className="text-verdict-false mr-2" />
              We&apos;ll work to improve our results.
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <span>Was this result helpful?</span>
      <button
        onClick={() => handleFeedback("helpful")}
        className="p-1 hover:bg-green-100 rounded-full transition"
        title="Yes, this was helpful"
      >
        <FaThumbsUp className="text-verdict-true" />
      </button>
      <button
        onClick={() => handleFeedback("not-helpful")}
        className="p-1 hover:bg-red-100 rounded-full transition"
        title="No, this wasn't helpful"
      >
        <FaThumbsDown className="text-verdict-false" />
      </button>
    </div>
  );
}
