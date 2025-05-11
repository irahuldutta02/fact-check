"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";

export default function CopyToClipboard({ text, label = "Copy to clipboard" }) {
  const [copied, setCopied] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-3 py-1 rounded text-sm ${
        copied
          ? "bg-green-100 text-verdict-true"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      title={label}
    >
      {copied ? (
        <>
          <FaCheck className="mr-1" size={12} />
          Copied!
        </>
      ) : (
        <>
          <FaCopy className="mr-1" size={12} />
          {label}
        </>
      )}
    </button>
  );
}
