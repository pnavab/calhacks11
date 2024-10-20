import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const prevTranscription = formData.get('text');

    if (!audioFile) {
      console.error('No audio file received');
      return NextResponse.json({ error: 'No audio file received' }, { status: 400 });
    }


    const convertedFile = new File([audioFile], 'audio.webm', {
      type: 'audio/webm',
    });

    const prompt = `You are a transcription assistant. Please transcribe the following audio accurately and concisely. Use the following previous transcribed audio chunk thus far and create a coherent transcription with the new information to create a fully comprehensible transcription. Here is the transcription so far: ${prevTranscription}`;

    const transcription = await groq.audio.transcriptions.create({
      file: convertedFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0.0,
      prompt,
    });

    return NextResponse.json({ transcription: transcription.text }, { status: 200 });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
