// Web scraping utility functions
import axios from "axios";
import { load } from "cheerio";
import https from "https"; // Import https module

// Create an https agent to ignore SSL certificate errors
const agent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Scrape search results for a given query from Google
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of scraped results
 */
async function scrapeGoogleSearchResults(query, maxResults = 5) {
  console.log(`Scraping Google search results for: ${query}`);
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}&hl=en`; // Use Google search URL
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent: agent,
      timeout: 10000, // Added a 10-second timeout for the request itself
    });

    // Log a snippet of the response to check for CAPTCHAs or unexpected HTML on Vercel
    if (response.data && typeof response.data === "string") {
      console.log(
        "Google Response HTML Snippet (first 500 chars):",
        response.data.substring(0, 500)
      );
      if (response.data.toLowerCase().includes("captcha")) {
        console.warn("CAPTCHA detected in Google search response.");
      }
      if (response.data.toLowerCase().includes("before you continue")) {
        console.warn(
          "'Before you continue' page (likely consent/CAPTCHA) detected in Google search response."
        );
      }
    }

    const $ = load(response.data);
    const results = [];

    // Parse the search results
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
      });
    });

    return results;
  } catch (error) {
    console.error("Error scraping Google search results:", error);
    return []; // Return empty array on error
  }
}

/**
 * Scrape search results for a given query from DuckDuckGo
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of scraped results
 */
async function scrapeDuckDuckGoSearchResults(query, maxResults = 5) {
  console.log(`Scraping DuckDuckGo search results for: ${query}`);
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query
    )}`;
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent: agent,
      timeout: 10000, // Added a 10-second timeout
    });

    // Log a snippet of the response for DDG as well for consistency
    if (response.data && typeof response.data === "string") {
      console.log(
        "DuckDuckGo Response HTML Snippet (first 500 chars):",
        response.data.substring(0, 500)
      );
    }

    const $ = load(response.data);
    const results = [];

    // Parse the search results
    $(".result").each((index, element) => {
      if (index >= maxResults) return false;
      const titleElement = $(element).find(".result__title");
      const linkElement = $(element).find(".result__url");
      const snippetElement = $(element).find(".result__snippet");

      const title = titleElement.text().trim();
      let url = $(titleElement).find("a").attr("href");

      // Fix protocol-relative URLs (those starting with //)
      if (url && url.startsWith("//")) {
        url = "https:" + url;
      }

      // Extract the actual URL from DuckDuckGo redirect
      if (url && url.includes("duckduckgo.com/l/?uddg=")) {
        try {
          const urlParams = new URLSearchParams(url.split("?")[1]);
          const encodedUrl = urlParams.get("uddg");
          if (encodedUrl) {
            url = decodeURIComponent(encodedUrl);
          }
        } catch (e) {
          console.error("Error extracting URL from DuckDuckGo redirect:", e);
        }
      }

      const snippet = snippetElement.text().trim();

      results.push({
        title,
        url,
        snippet,
      });
    });

    return results;
  } catch (error) {
    console.error("Error scraping DuckDuckGo search results:", error);
    return [];
  }
}

/**
 * Scrape the content of a specific URL
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} - Extracted main content
 */
export async function scrapeWebPage(url) {
  if (!url) {
    console.warn("Attempted to scrape an undefined or null URL.");
    return { title: "Invalid URL", content: "No content due to invalid URL." };
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
        console.error("Error extracting URL from DuckDuckGo redirect:", e);
        return "";
      }
    }

    console.log("Scraping URL:", url);

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

    // Extract text from main content areas
    // This is a basic implementation - may need refinement for specific sites
    const mainContent = $("main, article, .content, #content, .main, #main")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (mainContent.length > 100) {
      return mainContent;
    }

    // Fallback to body text if no main content areas are found
    return $("body").text().replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("Error scraping web page:", error);
    return "";
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
    console.log("Scraping search results for query:", query);
    const searchResults = await scrapeDuckDuckGoSearchResults(query);

    if (searchResults.length === 0) {
      console.log("No search results found");
      return {
        searchResults: [],
        contentDetails: [],
      };
    }

    console.log(`Found ${searchResults.length} search results`);

    // Step 2: Scrape the content of the first few search results
    const contentPromises = searchResults
      .slice(0, 3)
      .map(async (result, index) => {
        if (result.url) {
          try {
            console.log(
              `Scraping content from result ${index + 1}: ${result.url}`
            );
            const content = await scrapeWebPage(result.url);
            return {
              ...result,
              content: content.substring(0, 2000), // Limit content length
            };
          } catch (e) {
            console.error(
              `Error scraping content from ${result.url}:`,
              e.message
            );
            return result; // Return the result without content if scraping fails
          }
        }
        return result;
      });

    const resultsWithContent = await Promise.all(contentPromises);

    const validResults = resultsWithContent.filter(
      (result) => result.content && result.content.length > 0
    );
    console.log(
      `Successfully scraped content from ${validResults.length} pages`
    );

    return {
      searchResults,
      contentDetails: resultsWithContent,
    };
  } catch (error) {
    console.error("Error gathering fact checking data:", error);
    return {
      searchResults: [],
      contentDetails: [],
    };
  }
}
