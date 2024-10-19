import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      console.error('No audio file received');
      return NextResponse.json({ error: 'No audio file received' }, { status: 400 });
    }


    const convertedFile = new File([audioFile], 'audio.webm', {
      type: 'audio/webm',
    });

    const transcription = await groq.audio.transcriptions.create({
      file: convertedFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0.0,
    });

    return NextResponse.json({ transcription: transcription.text }, { status: 200 });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
