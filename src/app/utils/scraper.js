// Web scraping utility functions
import axios from "axios";
import { load } from "cheerio";
import https from "https"; // Import https module

// Create an https agent to ignore SSL certificate errors
const agent = new https.Agent({
  rejectUnauthorized: false,
});

// Helper to extract last updated date from HTML
function extractLastUpdated($) {
  // Try common meta tags and selectors
  const metaDate =
    $("meta[itemprop='dateModified']").attr("content") ||
    $("meta[property='article:modified_time']").attr("content") ||
    $("meta[name='last-modified']").attr("content") ||
    $("meta[name='Last-Modified']").attr("content") ||
    $("time[datetime]").attr("datetime") ||
    $(
      ".last-updated, .lastModified, .date-modified, .updated, .mod-date"
    ).text();
  if (metaDate && typeof metaDate === "string") {
    // Try to parse as date
    const d = new Date(metaDate.trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // Try to find a date in text
  const bodyText = $("body").text();
  const dateMatch = bodyText.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    const d = new Date(dateMatch[0]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * Scrape search results for a given query from Google
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of scraped results
 */
async function scrapeGoogleSearchResults(query, maxResults = 5) {
  let response;
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}&hl=en`;
    response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent: agent,
      timeout: 10000,
    });
    if (response.data && typeof response.data === "string") {
      if (response.data.toLowerCase().includes("captcha")) {
        // CAPTCHA detected
      }
      if (response.data.toLowerCase().includes("before you continue")) {
        // Consent/CAPTCHA page detected
      }
    }
    const $ = load(response.data);
    const results = [];
    $(".tF2Cxc").each((index, element) => {
      if (index >= maxResults) return false;
      const titleElement = $(element).find(".DKV0Md");
      const linkElement = $(element).find(".yuRUbf a");
      const snippetElement = $(element).find(".VwiC3b");
      const title = titleElement.text().trim();
      const url = linkElement.attr("href");
      const snippet = snippetElement.text().trim();
      results.push({
        title,
        url,
        snippet,
        source: "Google",
      });
    });
    return results;
  } catch (error) {
    if (error && error.response) {
      console.error(
        "[GoogleScraper] Error response status:",
        error.response.status
      );
      console.error(
        "[GoogleScraper] Error response data (first 500 chars):",
        String(error.response.data).substring(0, 500)
      );
    }
    if (response && response.data) {
      console.error(
        "[GoogleScraper] Last received HTML (first 500 chars):",
        String(response.data).substring(0, 500)
      );
    }
    console.error(
      "[GoogleScraper] ERROR:",
      error && error.toString ? error.toString() : error
    );
    return [];
  }
}

/**
 * Scrape search results for a given query from DuckDuckGo
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of scraped results
 */
async function scrapeDuckDuckGoSearchResults(query, maxResults = 5) {
  let response;
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query
    )}`;
    response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent: agent,
      timeout: 10000,
    });
    if (response.data && typeof response.data === "string") {
      // Response HTML snippet
    }
    const $ = load(response.data);
    const results = [];
    $(".result").each((index, element) => {
      if (index >= maxResults) return false;
      const titleElement = $(element).find(".result__title");
      const linkElement = $(element).find(".result__url");
      const snippetElement = $(element).find(".result__snippet");
      const title = titleElement.text().trim();
      let url = $(titleElement).find("a").attr("href");
      if (url && url.startsWith("//")) {
        url = "https:" + url;
      }
      if (url && url.includes("duckduckgo.com/l/?uddg=")) {
        try {
          const urlParams = new URLSearchParams(url.split("?")[1]);
          const encodedUrl = urlParams.get("uddg");
          if (encodedUrl) {
            url = decodeURIComponent(encodedUrl);
          }
        } catch (e) {
          // Error extracting URL from DuckDuckGo redirect
        }
      }
      const snippet = snippetElement.text().trim();
      results.push({
        title,
        url,
        snippet,
        source: "DuckDuckGo",
      });
    });
    return results;
  } catch (error) {
    if (error && error.response) {
      console.error(
        "[DuckDuckGoScraper] Error response status:",
        error.response.status
      );
      console.error(
        "[DuckDuckGoScraper] Error response data (first 500 chars):",
        String(error.response.data).substring(0, 500)
      );
    }
    if (response && response.data) {
      console.error(
        "[DuckDuckGoScraper] Last received HTML (first 500 chars):",
        String(response.data).substring(0, 500)
      );
    }
    console.error(
      "[DuckDuckGoScraper] ERROR:",
      error && error.toString ? error.toString() : error
    );
    return [];
  }
}

/**
 * Scrape search results from both Google and DuckDuckGo, combine and de-duplicate
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>} - Array of combined, de-duplicated results
 */
async function scrapeSearchResults(query, maxResults = 5) {
  const [google, duckduckgo] = await Promise.allSettled([
    scrapeGoogleSearchResults(query, maxResults),
    scrapeDuckDuckGoSearchResults(query, maxResults),
  ]);
  let results = [];
  if (google.status === "fulfilled" && Array.isArray(google.value)) {
    results = results.concat(google.value);
  }
  if (duckduckgo.status === "fulfilled" && Array.isArray(duckduckgo.value)) {
    results = results.concat(duckduckgo.value);
  }
  // De-duplicate by URL
  const seen = new Set();
  const deduped = results.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  return deduped.slice(0, maxResults);
}

/**
 * Scrape the content of a specific URL
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} - Extracted main content
 */
export async function scrapeWebPage(url) {
  if (!url) {
    return {
      title: "Invalid URL",
      content: "No content due to invalid URL.",
      lastUpdated: null,
    };
  }
  try {
    // Ensure URL has a valid protocol
    if (!url) {
      return "";
    }

    // Handle protocol-relative URLs
    if (url.startsWith("//")) {
      url = "https:" + url;
    }

    // Ensure URL has a protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Extract actual URL from DuckDuckGo redirect URLs
    if (url.includes("duckduckgo.com/l/?uddg=")) {
      try {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const encodedUrl = urlParams.get("uddg");
        if (encodedUrl) {
          url = decodeURIComponent(encodedUrl);
        }
      } catch (e) {
        return "";
      }
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      httpsAgent: agent, // Use the custom agent
      timeout: 15000, // 15 seconds timeout
    });

    const $ = load(response.data);

    // Remove script and style elements
    $("script, style, nav, footer, header, aside").remove();

    // Extract last updated date
    const lastUpdated = extractLastUpdated($);

    // Extract text from main content areas
    // This is a basic implementation - may need refinement for specific sites
    const mainContent = $("main, article, .content, #content, .main, #main")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (mainContent.length > 100) {
      return { content: mainContent, lastUpdated };
    }

    // Fallback to body text if no main content areas are found
    return {
      content: $("body").text().replace(/\s+/g, " ").trim(),
      lastUpdated,
    };
  } catch (error) {
    console.error(
      "[scrapeWebPage] ERROR:",
      error && error.toString ? error.toString() : error
    );
    return { content: "", lastUpdated: null };
  }
}

/**
 * Get scraped data relevant to a fact-checking query
 * @param {string} query - The fact to check
 * @returns {Promise<Object>} - Scraped data with search results and content
 */
export async function getScrapedFactCheckData(query) {
  try {
    // Step 1: Scrape search results
    const searchResults = await scrapeSearchResults(query, 5);
    if (searchResults.length === 0) {
      return {
        searchResults: [],
        contentDetails: [],
      };
    }
    // Step 2: Scrape the content of the first few search results
    const contentPromises = searchResults
      .slice(0, 3)
      .map(async (result, index) => {
        if (result.url) {
          try {
            const { content, lastUpdated } = await scrapeWebPage(result.url);
            return {
              ...result,
              content: content.substring(0, 2000),
              lastUpdated,
            };
          } catch (e) {
            return result;
          }
        }
        return result;
      });
    let resultsWithContent = await Promise.all(contentPromises);
    // Filter: Only keep articles with a valid lastUpdated date, and sort by most recent
    resultsWithContent = resultsWithContent
      .filter((r) => r.lastUpdated)
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    return {
      searchResults,
      contentDetails: resultsWithContent,
    };
  } catch (error) {
    console.error(
      "[FactCheck] Error gathering fact checking data:",
      error && error.toString ? error.toString() : error
    );
    return {
      searchResults: [],
      contentDetails: [],
    };
  }
}
