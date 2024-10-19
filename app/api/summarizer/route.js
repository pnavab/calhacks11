'use server';

import { groq } from '@ai-sdk/groq';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

// Create a new instance of groq
const groqInstance = createGroq();

// Define a Zod schema for the request body
const summaryRequestBodySchema = z.object({
  previousSummary: z.string(),
  transcriptChunk: z.string(),
});

// Define a Zod schema for the response structure
const summaryResponseSchema = z.object({
  fullSummary: z.string(),
});

export async function POST(request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { previousSummary, transcriptChunk } = summaryRequestBodySchema.parse(body);

    // Generate the new summary using the provided model, previous summary, and transcript chunk
    const prompt = `Here is the previous summary: "${previousSummary}". Now summarize this new chunk: "${transcriptChunk}". Provide only a cohesive full summary.`;
    const { text: fullSummary } = await generateText({
      model: groqInstance('llama-3.1-8b-instant'),
      prompt,
    });

    // Validate the generated full summary against the schema
    const validatedData = summaryResponseSchema.parse({ fullSummary });

    // Respond with the validated data in JSON format
    return new Response(JSON.stringify(validatedData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating full summary:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate full summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}