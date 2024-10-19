'use server';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

// Create a new instance of groq
const groqInstance = createGroq();

const summaryRequestBodySchema = z.object({
  previousSummary: z.string(),
  transcriptChunk: z.string(),
  currentContext: z.string(),
  existingContexts: z.array(z.string()),
});

const summaryResponseSchema = z.object({
  summary: z.string(),
  currentContext: z.string(),
  existingContexts: z.array(z.string()),
  createNewContext: z.boolean(),
});

export async function POST(request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { previousSummary, transcriptChunk, currentContext, existingContexts } = summaryRequestBodySchema.parse(body);

    let createNewContext = false; //boolean whether a new context is created, indicates a new subpage

    const transcriptChunkContext = await checkForContextSwitch(transcriptChunk, existingContexts);
    if (transcriptChunkContext !== currentContext && !existingContexts.includes(transcriptChunkContext)) {
      createNewContext = true;
      existingContexts.push(transcriptChunkContext);
    }

    // TODO: figure out a way to fetch the context from a different subpage if it already exists and set the summary to that


    const prompt = `Previous summary: "${previousSummary}". New chunk: "${transcriptChunk}". Current context: "${transcriptChunkContext}". Provide only a cohesive full summary.`;
    const { text: newSummary } = await generateText({
      model: groqInstance('llama-3.1-70b-versatile'),
      prompt,
    });
    
    // Validate and respond with new summary and context
    const validatedData = summaryResponseSchema.parse({ summary: newSummary, currentContext: transcriptChunkContext, existingContexts: existingContexts, createNewContext: createNewContext });
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

async function checkForContextSwitch(transcriptChunk, existingContexts) {
  const prompt = `For this prompt, respond only with a topic. Based on the provided transcript chunk, determine if it fits into any of the existing contexts listed in the existing contexts array. If it does, return exactly the context from the existing contexts that matches the current. Otherwise, return a new topic that should be added.
  
  For example, if the transcript chunk correlates with a topic regarding traveling, and the existing contexts contain "Travel", then the only output should be directly from the existing contexts, which in this case is "Travel". If the transcript chunk correlates with a topic regarding cooking, and the existing contexts contain only "Travel", then the only output should be invented, for example as "Cooking".
  
  Do not return the output with any formatting, just the pure word or phrase. Do not include any additional text or explanations.

  Transcript Chunk: "${transcriptChunk}". Existing Contexts: "${existingContexts}".`;
  const { text } = await generateText({
    model: groqInstance('llama-3.1-70b-versatile'),
    prompt,
  });
  console.log(text);
  return text;
}
