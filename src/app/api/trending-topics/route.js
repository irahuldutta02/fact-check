import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    // Check for required API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error("Missing API key: GOOGLE_GEMINI_API_KEY not configured");
      return Response.json(
        {
          error:
            "API key not configured. Please set GOOGLE_GEMINI_API_KEY in your environment variables.",
          topics: [], // Return an empty array so the frontend can handle gracefully
        },
        { status: 500 }
      );
    }

    // Initialize the Gemini AI with safety settings
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Use a reliable model version
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });

    // Create a structured prompt for trending topics or search results
    // Make it very clear we want a valid JSON array
    const prompt = query
      ? `Generate 5-8 fact-check worthy statements or questions related to "${query}" that might be trending or of interest to users.
         Focus on topics that people might want to verify the factual accuracy of.
         Return ONLY a valid JSON array of strings containing the questions, without ANY additional text, explanation or formatting.
         IMPORTANT: Your response must be a valid parseable JSON array like this: ["Question 1?", "Question 2?", "Is claim X true?"]`
      : `Generate 8-10 fact-check worthy statements or questions that are currently trending or would be of high interest.
         Include a mix of science, health, politics, technology, and general knowledge topics.
         Focus on topics that people might want to verify the factual accuracy of.
         Return ONLY a valid JSON array of strings containing questions, without ANY additional text, explanation or formatting.
         IMPORTANT: Your response must be a valid parseable JSON array like this: ["Question 1?", "Question 2?", "Is claim X true?"]`; // Get response from Gemini with a timeout
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timed out after 12 seconds")),
            12000
          )
        ),
      ]);

      const response = result.response;
      const text = response.text();

      // Better JSON parsing with multiple fallbacks
      try {
        // First attempt: Try direct JSON parsing
        try {
          const topics = JSON.parse(text);
          if (Array.isArray(topics)) {
            return Response.json({ topics });
          }
        } catch (initialError) {
          console.warn("Initial JSON parse failed, trying regex extraction");
        }

        // Second attempt: Extract JSON array with regex
        const jsonMatch = text.match(/(\[[\s\S]*\])/);
        if (jsonMatch && jsonMatch[0]) {
          try {
            const topics = JSON.parse(jsonMatch[0]);
            if (Array.isArray(topics)) {
              return Response.json({ topics });
            }
          } catch (regexError) {
            console.warn("Regex JSON extraction failed");
          }
        }

        // Third attempt: Manual extraction
        const lines = text
          .split("\n")
          .filter(
            (line) =>
              line.trim().startsWith('"') ||
              line.trim().startsWith("[") ||
              line.trim().startsWith("]")
          );

        if (lines.length > 0) {
          const manualJsonAttempt = lines.join("").replace(/,\s*\]/g, "]");
          try {
            const topics = JSON.parse(manualJsonAttempt);
            if (Array.isArray(topics)) {
              return Response.json({ topics });
            }
          } catch (manualError) {
            console.warn("Manual JSON construction failed");
          }
        }

        // If all parsing attempts fail, extract questions with regex
        const questionsRegex = /"([^"]+\?)"|\b([A-Z][^?]+\?)\b/g;
        const questions = [];
        let match;
        while ((match = questionsRegex.exec(text)) !== null) {
          const question = match[1] || match[2];
          if (question && !questions.includes(question)) {
            questions.push(question);
          }
        }

        if (questions.length > 0) {
          return Response.json({ topics: questions });
        }

        // If we get here, all parsing attempts failed
        throw new Error("Failed to extract valid questions from response");
      } catch (parseError) {
        console.error(
          "Failed to parse AI response:",
          parseError,
          "Raw text:",
          text
        );

        // Return a fallback with the raw text for debugging
        return Response.json(
          {
            error: "Failed to parse AI response",
            rawResponse: text,
            topics: [], // Return an empty array so the frontend can handle gracefully
          },
          { status: 500 }
        );
      }
    } catch (modelError) {
      // Handle timeout or model errors
      console.error("Gemini model error:", modelError);
      return Response.json(
        {
          error: modelError.message || "AI model error",
          topics: [], // Return an empty array so the frontend can handle gracefully
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching trending topics:", error);
    return Response.json(
      {
        error: "Failed to fetch trending topics",
        message: error.message || "An unexpected error occurred",
        topics: [], // Return an empty array so the frontend can handle gracefully
      },
      { status: 500 }
    );
  }
}
