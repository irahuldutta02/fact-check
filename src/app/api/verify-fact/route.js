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

    // Define the response schema for Gemini
    const schema = {
      type: "object",
      properties: {
        verdict: {
          type: "string",
          enum: ["TRUE", "FALSE", "PARTIALLY TRUE", "CONTEXT NOT CLEAR"],
        },
        explanation: { type: "string" },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer" },
              name: { type: "string" },
              url: { type: "string" },
            },
            required: ["index", "name", "url"],
          },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["verdict", "explanation", "sources", "confidence"],
    };
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // Check if we have scraped data
    const hasScrapedData =
      scrapedData.searchResults.length > 0 ||
      scrapedData.contentDetails.length > 0;

    // Create a structured prompt that includes scraped data for fact checking
    const prompt = `
      Act as a fact-checking expert. Analyze this statement and determine if it's TRUE, FALSE, PARTIALLY TRUE, or CONTEXT NOT CLEAR.
      If the statement is ambiguous, lacks sufficient context to be verified, or is too vague, use the verdict "CONTEXT NOT CLEAR".
      
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
      } carefully analyze the statement and provide:
      1. A verdict (TRUE, FALSE, PARTIALLY TRUE, or CONTEXT NOT CLEAR)
      2. A detailed explanation of your reasoning with source citations in the format [1], [2], etc.
      3. Sources that support your conclusion with URLs (from the provided sources)
      
      Make sure to reference specific sources in your explanation using numbered citations like [1], [2], etc. that correspond to the source index in your response.
    `; // Get response from Gemini
    console.log("Sending request to Gemini API with scraped data...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let parsedResponse;
    try {
      // Extract the JSON part from the response, handling any text before or after
      const jsonMatch = text.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        let rawParsedResponse = JSON.parse(jsonMatch[0]);

        const explanationFromGemini =
          rawParsedResponse.explanation || "No explanation provided.";
        const sourcesFromGemini = Array.isArray(rawParsedResponse.sources)
          ? rawParsedResponse.sources
          : [];

        parsedResponse = {
          verdict: rawParsedResponse.verdict || "UNKNOWN", // Ensure UNKNOWN is a fallback if Gemini fails schema
          explanation: explanationFromGemini, // Will be updated with new citation indices
          sources: [], // Will be populated with re-indexed sources
          confidence: rawParsedResponse.confidence || 0.5,
          usedWebScraping: hasScrapedData,
        };

        if (sourcesFromGemini.length > 0) {
          const geminiIndexToNewIndexMap = {};
          const finalProcessedSources = [];
          let newSequentialIndex = 1;

          sourcesFromGemini.forEach((source) => {
            const originalGeminiIndex = source.index; // As per schema, this is an integer

            // We expect originalGeminiIndex to be present and a number due to the schema.
            // Map this originalGeminiIndex to a newSequentialIndex if not already mapped.
            if (
              originalGeminiIndex !== undefined &&
              originalGeminiIndex !== null &&
              !geminiIndexToNewIndexMap.hasOwnProperty(originalGeminiIndex)
            ) {
              geminiIndexToNewIndexMap[originalGeminiIndex] =
                newSequentialIndex;
              finalProcessedSources.push({
                index: newSequentialIndex, // New sequential index
                name: source.name, // Name from Gemini (required by schema)
                url: source.url, // URL from Gemini (required by schema)
              });
              newSequentialIndex++;
            }
            // If originalGeminiIndex is undefined, null, or already mapped, we skip creating a new
            // entry in finalProcessedSources for it based on *that specific originalGeminiIndex*.
            // This ensures each unique, valid original index from Gemini maps to one new sequential index.
          });

          // Sort the final sources by their new sequential index for consistent output order.
          finalProcessedSources.sort((a, b) => a.index - b.index);
          parsedResponse.sources = finalProcessedSources;

          // Update explanation to use the new sequential indices
          if (Object.keys(geminiIndexToNewIndexMap).length > 0) {
            parsedResponse.explanation = explanationFromGemini.replace(
              /\[(\d+)\]/g,
              (match, originalGeminiIndexStr) => {
                const originalGeminiIndex = parseInt(
                  originalGeminiIndexStr,
                  10
                );
                if (
                  geminiIndexToNewIndexMap.hasOwnProperty(originalGeminiIndex)
                ) {
                  return `[${geminiIndexToNewIndexMap[originalGeminiIndex]}]`;
                }
                // If a citation [N] exists in explanation but N wasn't a mapped Gemini index, keep original.
                return match;
              }
            );
          }
        }
      } else {
        // Fallback: If AI doesn't return valid JSON, attempt to parse the content manually
        const verdictMatch = text.match(/verdict[\"'\s:]+([A-Z\s]+)/i);
        const explanationMatch = text.match(
          /explanation[\"'\s:]+([^"]+?)(?:,|\n|source)/i
        );
        const confidenceMatch = text.match(/confidence[\"'\s:]+([0-9.]+)/i);

        if (verdictMatch && verdictMatch[1]) {
          // Create a structured response manually
          let potentialVerdict = verdictMatch[1].trim().toUpperCase();
          if (
            !["TRUE", "FALSE", "PARTIALLY TRUE", "CONTEXT NOT CLEAR"].includes(
              potentialVerdict
            )
          ) {
            potentialVerdict = "UNKNOWN"; // Fallback for manual parsing
          }
          parsedResponse = {
            verdict: potentialVerdict,
            explanation:
              explanationMatch && explanationMatch[1]
                ? explanationMatch[1].trim()
                : "The AI analyzed the statement but didn't provide a detailed explanation.",
            sources: [],
            confidence:
              confidenceMatch && confidenceMatch[1]
                ? parseFloat(confidenceMatch[1])
                : 0.5,
          };

          // Try to extract sources if they exist
          const sourcesRegex =
            /source.*?(?:index[\"'\s:]+([0-9]+)[\"'\s,]+)?name[\"'\s:]+([^"]+)[\"'\s,]+url[\"'\s:]+([^"]+)/gi;
          let sourceMatch;
          let sourceIndex = 1;

          while ((sourceMatch = sourcesRegex.exec(text)) !== null) {
            const [_, indexStr, name, url] = sourceMatch;
            const index = indexStr ? parseInt(indexStr, 10) : sourceIndex++;

            if (name && url) {
              parsedResponse.sources.push({
                index,
                name: name.trim(),
                url: url.trim(),
              });
            }
          }
        } else {
          throw new Error(
            "Invalid response format and fallback parsing failed"
          );
        }
      }
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
