import { GoogleGenerativeAI } from "@google/generative-ai";

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
    }

    // Initialize the Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // Create a structured prompt for fact checking
    const prompt = `
      Act as a fact-checking expert. Analyze this statement and determine if it's TRUE, FALSE, or PARTIALLY TRUE:
      
      Statement: "${statement}"
      
      Please provide:
      1. A verdict (TRUE, FALSE, or PARTIALLY TRUE)
      2. A detailed explanation of your reasoning
      3. Sources that support your conclusion with URLs
      
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
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    // Parse the JSON response from Gemini
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
