import { GoogleGenerativeAI } from "@google/generative-ai";
import { getScrapedFactCheckData } from "../../utils/scraper";

export async function POST(request) {
  try {
    const { statement } = await request.json();

    if (!statement || statement.trim().length < 3) {
      return Response.json(
        {
          error: "Please provide a valid statement (at least 3 characters)",
        },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "API key not configured. Please set GOOGLE_GEMINI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    } // Get scraped data related to the statement for fact-checking
    console.log("Scraping web data for fact checking...");
    let scrapedData;
    try {
      scrapedData = await getScrapedFactCheckData(statement);
    } catch (scrapingError) {
      console.error("Error during web scraping:", scrapingError);
      // Fallback to empty data but continue the process
      scrapedData = { searchResults: [], contentDetails: [] };
    } // Initialize the Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // Check if we have scraped data
    const hasScrapedData =
      scrapedData.searchResults.length > 0 ||
      scrapedData.contentDetails.length > 0;

    // Create a structured prompt that includes scraped data for fact checking
    const prompt = `
      Act as a fact-checking expert. Analyze this statement and determine if it's TRUE, FALSE, or PARTIALLY TRUE.
      
      Statement: "${statement}"
      
      ${
        hasScrapedData
          ? `Here is real-time scraped information from the web to help with fact checking:
      
      SEARCH RESULTS:
      ${scrapedData.searchResults
        .map(
          (result, index) =>
            `${index + 1}. ${result.title || "No title"}\n   URL: ${
              result.url || "No URL"
            }\n   Snippet: ${result.snippet || "No snippet"}`
        )
        .join("\n\n")}
      
      DETAILED CONTENT:
      ${scrapedData.contentDetails
        .map(
          (detail, index) =>
            `--- FROM SOURCE ${index + 1}: ${detail.title || "No title"} ---\n${
              detail.content || "No content available"
            }\n`
        )
        .join("\n\n")}
        
      Based ONLY on the real-time data provided above,`
          : `The web scraping attempt failed, so you'll need to use your training data to`
      } carefully analyze the statement and provide:carefully analyze the statement and provide:
      1. A verdict (TRUE, FALSE, or PARTIALLY TRUE)
      2. A detailed explanation of your reasoning based on the provided web data
      3. Sources that support your conclusion with URLs (from the provided sources)
      
      Format the response as a JSON object with the following structure:
      {
        "verdict": "TRUE/FALSE/PARTIALLY TRUE",
        "explanation": "detailed explanation...",
        "sources": [
          {"name": "Source Name", "url": "https://source.url"}
        ]
      }
    `;

    // Get response from Gemini
    console.log("Sending request to Gemini API with scraped data...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text(); // Parse the JSON response from Gemini
    let parsedResponse;
    try {
      // Extract the JSON part from the response, handling any text before or after
      const jsonMatch = text.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: If AI doesn't return valid JSON, attempt to parse the content manually
        const verdictMatch = text.match(/verdict[\"'\s:]+([A-Z\s]+)/i);
        const explanationMatch = text.match(
          /explanation[\"'\s:]+([^"]+?)(?:,|\n|source)/i
        );

        if (verdictMatch && verdictMatch[1]) {
          // Create a structured response manually
          parsedResponse = {
            verdict: verdictMatch[1].trim(),
            explanation:
              explanationMatch && explanationMatch[1]
                ? explanationMatch[1].trim()
                : "The AI analyzed the statement but didn't provide a detailed explanation.",
            sources: [],
          };

          // Try to extract sources if they exist
          const sourcesRegex =
            /source.*?name[\"'\s:]+([^"]+)[\"'\s,]+url[\"'\s:]+([^"]+)/gi;
          let sourceMatch;
          while ((sourceMatch = sourcesRegex.exec(text)) !== null) {
            if (sourceMatch[1] && sourceMatch[2]) {
              parsedResponse.sources.push({
                name: sourceMatch[1].trim(),
                url: sourceMatch[2].trim(),
              });
            }
          }
        } else {
          throw new Error(
            "Invalid response format and fallback parsing failed"
          );
        }
      }

      // Add information about web scraping status
      parsedResponse.usedWebScraping = hasScrapedData;
    } catch (error) {
      console.error("Failed to parse Gemini response:", error);
      return Response.json(
        {
          error: "Failed to parse AI response",
          rawResponse: text,
        },
        { status: 500 }
      );
    }
    return Response.json(parsedResponse);
  } catch (error) {
    console.error("Error in fact verification:", error);

    // Handle specific error types
    if (error.message?.includes("API key")) {
      return Response.json(
        {
          error:
            "Invalid API key. Please check your Google Gemini API key configuration.",
        },
        { status: 401 }
      );
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      return Response.json(
        {
          error: "API rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      return Response.json(
        {
          error:
            "Request timed out. The Gemini AI service might be experiencing high load.",
        },
        { status: 504 }
      );
    }

    return Response.json(
      {
        error: "Failed to verify fact",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
