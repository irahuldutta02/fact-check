"use client";

import { useEffect, useState } from "react";
import { FaChartLine, FaSearch, FaSpinner } from "react-icons/fa";

// Fallback topics in case the API fails
const FALLBACK_TOPICS = [
  "Is climate change real?",
  "Did NASA fake the moon landing?",
  "Do vaccines cause autism?",
  "Is the Earth flat?",
  "Does 5G cause health problems?",
  "Is AI dangerous for humanity?",
  "Are GMO foods safe to eat?",
  "Does drinking water cure dehydration?",
  "Is coronavirus lab-made?",
];

export default function TrendingSuggestions({ onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingTopics, setTrendingTopics] = useState(FALLBACK_TOPICS);
  const [filteredTopics, setFilteredTopics] = useState(FALLBACK_TOPICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Reusable function to fetch trending topics or search suggestions
  const fetchTrendingTopics = async (query = null) => {
    setLoading(true);
    setError(null);

    try {
      const url = query
        ? `/api/trending-topics?query=${encodeURIComponent(query)}`
        : "/api/trending-topics";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Server error (${response.status}): ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Check if we have valid topics data
      if (data.topics && Array.isArray(data.topics)) {
        if (data.topics.length === 0) {
          throw new Error(
            query
              ? "No AI suggestions found for this search"
              : "No trending topics available right now"
          );
        }

        if (query) {
          // For search queries, update filtered topics
          setFilteredTopics(data.topics);
        } else {
          // For trending topics, update both
          setTrendingTopics(data.topics);
          setFilteredTopics(data.topics);
        }

        // Clear search query when refreshing trending topics
        if (!query) {
          setSearchQuery("");
        }

        return true;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error(
        `Error fetching ${query ? "search suggestions" : "trending topics"}:`,
        err
      );

      setError(
        query
          ? `Could not get AI suggestions: ${err.message}`
          : `Could not load trending topics: ${err.message}`
      );

      // Keep using fallback topics for initial load
      if (!query && (!trendingTopics || trendingTopics.length === 0)) {
        setTrendingTopics(FALLBACK_TOPICS);
        setFilteredTopics(FALLBACK_TOPICS);
      }

      // For search failures, keep the basic filtered results
      if (query && searchQuery.trim()) {
        const basicFiltered = trendingTopics.filter((topic) =>
          topic.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTopics(basicFiltered);
      }

      return false;
    } finally {
      setLoading(false);
    }
  };
  // Fetch trending topics on initial load
  useEffect(() => {
    fetchTrendingTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Handle search query changes with AI suggestions
  useEffect(() => {
    // Clear any pending timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchQuery.trim()) {
      setFilteredTopics(trendingTopics);
      return;
    }

    // Basic filtering for immediate feedback
    const query = searchQuery.toLowerCase();
    const basicFiltered = trendingTopics.filter((topic) =>
      topic.toLowerCase().includes(query)
    );
    setFilteredTopics(basicFiltered);

    // Debounce AI search to avoid too many API calls
    const timeout = setTimeout(() => {
      // Only fetch from API if query is at least 3 characters
      if (searchQuery.trim().length >= 3) {
        fetchTrendingTopics(searchQuery);
      }
    }, 800); // Increased debounce time for better UX

    setSearchTimeout(timeout);

    // Cleanup timeout on unmount
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, trendingTopics]);

  const handleSelect = (topic) => {
    if (onSelect) {
      onSelect(topic);
    }
    setExpanded(false);
    setSearchQuery("");

    // Clear search timeout if any
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center text-sm text-primary-blue hover:underline"
        >
          <FaChartLine className="mr-1" size={14} />
          {expanded ? "Hide trending topics" : "Show trending topics"}
        </button>
        {expanded && (
          <button
            onClick={() => fetchTrendingTopics()}
            className="text-xs text-primary-blue hover:underline flex items-center"
            disabled={loading}
          >
            {" "}
            {loading && !searchQuery ? "Refreshing..." : "Refresh topics"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="bg-white rounded-md shadow-md p-3 mb-3 transition-all">
          <div className="relative mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trending topics..."
              className="w-full p-2 pl-8 border border-gray-300 rounded text-sm bg-white text-primary-navy"
              disabled={loading && searchQuery.trim().length >= 3}
            />
            {loading && searchQuery.trim().length >= 3 ? (
              <FaSpinner
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-blue animate-spin"
                size={12}
              />
            ) : (
              <FaSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={12}
              />
            )}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {loading && !searchQuery.trim() ? (
              <div className="text-center p-4">
                <FaSpinner className="animate-spin mx-auto text-primary-blue" />
                <p className="text-sm text-gray-500 mt-2">
                  Loading trending topics...
                </p>
              </div>
            ) : error && !searchQuery.trim() ? (
              <div className="text-center p-2">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={() => fetchTrendingTopics()}
                  className="text-xs text-primary-blue hover:underline mt-1"
                >
                  Try again
                </button>
              </div>
            ) : filteredTopics.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">
                No matching topics found
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {filteredTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(topic)}
                    className="text-left p-2 text-sm hover:bg-gray-100 rounded transition-colors truncate"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 3 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <p className="text-xs text-gray-500 italic">
                  {loading
                    ? "Getting AI suggestions..."
                    : "AI-powered search results"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
