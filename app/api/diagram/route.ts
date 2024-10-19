import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groqInstance = createGroq();

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { note } = body;

    const prompt = `
      Generate a Mermaid diagram based on the following note. The diagram should represent the main concepts and their relationships:

      Note: ${note}

      Provide only the Mermaid diagram code, without any additional text or explanations. 
      Ensure each element of the diagram is on a new line for proper formatting.
    `;

    const { text } = await generateText({
      model: groqInstance("gemma2-9b-it"),
      prompt,
    });

    // formatting
    const cleanedMermaidCode = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .join("\n");

    return NextResponse.json({ mermaidCode: cleanedMermaidCode });
  } catch (error) {
    console.error("Error generating Mermaid diagram:", error);
    return NextResponse.json(
      { error: "Failed to generate Mermaid diagram" },
      { status: 500 }
    );
  }
};
