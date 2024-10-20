'use server';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Create a new instance of groq
const groqInstance = createGroq();

const searchRequestBodySchema = z.object({
  query: z.string(),
  
});

const searchResponseSchema = z.object({
  response: z.string(),
});

export async function POST(request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    let { query } = searchRequestBodySchema.parse(body);

    let context = await fetch("http://localhost:8000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    context = await context.json();
    context = context.documents[0]
    console.log(context)
    let response = await summarizeRAG(context, query);
    console.log(response)

    // Validate and respond with new summary and context
    const validatedData = searchResponseSchema.parse({ response: response });
    // console.log({validatedData})
    return NextResponse.json(validatedData, { status: 200 });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}

async function summarizeRAG(context, query) {
  const prompt = `You are an assistant for answering questions given a large set of possible context. Use the following retrieved context to help form an answer to the user's query, using ONLY information from the provided context to generate an answer. If you do not know the answer, just say that you don't know.
  
  Here is the provided context: "${context}".
  
  The user's query is: "${query}".
  
  Remember, only answer the user's query using information from the provided context and nothing else, do not mention the context. Only return a comprehensible response.`;
  const { text } = await generateText({
    model: groqInstance('llama-3.1-70b-versatile'),
    prompt,
  });
  console.log(text);
  return text;
}
